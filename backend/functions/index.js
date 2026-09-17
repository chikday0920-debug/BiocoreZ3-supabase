const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const authV1 = require("firebase-functions/v1/auth");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

const { identifyPlant } = require("./providers/plantnet");
const { identifyAnimal } = require("./providers/inaturalist");
const { calcularRareza } = require("./rareza");

admin.initializeApp();
const db = admin.firestore();
const bucket = admin.storage().bucket();

const PLANTNET_API_KEY = defineSecret("PLANTNET_API_KEY");

const XP_POR_ESCANEO = 10;
const XP_POR_ESPECIE_NUEVA = 25;

function xpParaNivel(nivel) {
  return nivel * 100;
}

/**
 * Crea el documento de perfil usuarios/{uid} apenas se registra una cuenta nueva.
 */
exports.onUserCreate = authV1.user().onCreate(async (user) => {
  await db.collection("usuarios").doc(user.uid).set({
    nombre: user.displayName || (user.email ? user.email.split("@")[0] : "Explorador"),
    email: user.email || null,
    avatarUrl: user.photoURL || null,
    nivel: 1,
    xp: 0,
    monedas: 100,
    escaneosTotales: 0,
    especiesUnicas: 0,
    creadoEn: admin.firestore.FieldValue.serverTimestamp(),
  });
});

/**
 * POST /api/analyzePlant  (enrutado vía hosting rewrite en firebase.json)
 * Body JSON: { storagePath: "scans/{uid}/archivo.jpg", modo: "planta" | "animal" }
 * Header: Authorization: Bearer <idToken>
 */
exports.analyzePlant = onRequest(
  { secrets: [PLANTNET_API_KEY] },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Método no permitido" });
      return;
    }

    const authHeader = req.headers.authorization || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!idToken) {
      res.status(401).json({ error: "Falta token de autenticación" });
      return;
    }

    let uid;
    try {
      uid = (await admin.auth().verifyIdToken(idToken)).uid;
    } catch (err) {
      res.status(401).json({ error: "Token inválido" });
      return;
    }

    const { storagePath, modo } = req.body || {};
    if (!storagePath || !storagePath.startsWith(`scans/${uid}/`)) {
      res.status(400).json({ error: "storagePath inválido" });
      return;
    }
    if (modo !== "planta" && modo !== "animal") {
      res.status(400).json({ error: "modo debe ser 'planta' o 'animal'" });
      return;
    }

    try {
      const [imageBuffer] = await bucket.file(storagePath).download();

      const resultado =
        modo === "planta"
          ? await identifyPlant(imageBuffer, PLANTNET_API_KEY.value())
          : await identifyAnimal(imageBuffer);

      if (!resultado) {
        res.status(422).json({ error: "No se pudo identificar la especie en la imagen" });
        return;
      }

      resultado.rareza = calcularRareza(resultado.nombreCientifico);

      const especieId = resultado.nombreCientifico.toLowerCase().replace(/\s+/g, "-");
      const userRef = db.collection("usuarios").doc(uid);
      const analisisRef = db.collection("analisis").doc();
      // Un doc por especie ya vista, para que el Gaiadex no tenga que escanear
      // TODO el historial de `analisis` (que crece sin límite con cada re-escaneo)
      // solo para deducir qué especies distintas tiene el usuario.
      const especieVistaRef = userRef.collection("especiesVistas").doc(especieId);

      const { esNueva, xpGanada, nivelFinal } = await db.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);
        const perfil = userSnap.data() || { nivel: 1, xp: 0, escaneosTotales: 0, especiesUnicas: 0 };

        const yaExisteSnap = await tx.get(
          db.collection("analisis").where("uid", "==", uid).where("especieId", "==", especieId).limit(1)
        );
        const esNueva = yaExisteSnap.empty;
        const xpGanada = XP_POR_ESCANEO + (esNueva ? XP_POR_ESPECIE_NUEVA : 0);

        let nuevoXp = (perfil.xp || 0) + xpGanada;
        let nuevoNivel = perfil.nivel || 1;
        while (nuevoXp >= xpParaNivel(nuevoNivel)) {
          nuevoXp -= xpParaNivel(nuevoNivel);
          nuevoNivel += 1;
        }

        tx.set(analisisRef, {
          uid,
          especieId,
          nombreComun: resultado.nombreComun,
          nombreCientifico: resultado.nombreCientifico,
          tipo: resultado.tipo,
          rareza: resultado.rareza,
          confianza: resultado.confianza,
          imagenPath: storagePath,
          xpGanada,
          esNueva,
          fecha: admin.firestore.FieldValue.serverTimestamp(),
        });
        tx.update(userRef, {
          xp: nuevoXp,
          nivel: nuevoNivel,
          escaneosTotales: admin.firestore.FieldValue.increment(1),
          especiesUnicas: admin.firestore.FieldValue.increment(esNueva ? 1 : 0),
        });
        // merge:true para que quede la foto/confianza más reciente de esa especie.
        tx.set(especieVistaRef, {
          nombreComun: resultado.nombreComun,
          nombreCientifico: resultado.nombreCientifico,
          tipo: resultado.tipo,
          rareza: resultado.rareza,
          confianza: resultado.confianza,
          imagenPath: storagePath,
          ultimaVez: admin.firestore.FieldValue.serverTimestamp(),
          ...(esNueva ? { primeraVez: admin.firestore.FieldValue.serverTimestamp() } : {}),
        }, { merge: true });

        return { esNueva, xpGanada, nivelFinal: nuevoNivel };
      });

      res.status(200).json({
        ...resultado,
        especieId,
        analisisId: analisisRef.id,
        esNueva,
        xpGanada,
        nivelFinal,
      });
    } catch (err) {
      logger.error("analyzePlant falló", err);
      res.status(500).json({ error: "Error identificando la especie", detalle: err.message });
    }
  }
);

/**
 * Callable: comprarItem({ itemId })
 * Descuenta monedas del perfil y agrega el ítem al inventario del usuario, en una transacción.
 */
exports.comprarItem = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  const uid = request.auth.uid;
  const { itemId } = request.data || {};
  if (!itemId) {
    throw new HttpsError("invalid-argument", "Falta itemId.");
  }

  const itemRef = db.collection("tienda").doc(itemId);
  const userRef = db.collection("usuarios").doc(uid);
  const inventarioRef = userRef.collection("inventario").doc(itemId);

  await db.runTransaction(async (tx) => {
    const [itemSnap, userSnap] = await Promise.all([tx.get(itemRef), tx.get(userRef)]);
    if (!itemSnap.exists) {
      throw new HttpsError("not-found", "Ese ítem no existe.");
    }
    const item = itemSnap.data();
    const perfil = userSnap.data();
    if ((perfil.monedas || 0) < item.precio) {
      throw new HttpsError("failed-precondition", "No tienes monedas suficientes.");
    }

    tx.update(userRef, { monedas: admin.firestore.FieldValue.increment(-item.precio) });
    tx.set(inventarioRef, {
      nombre: item.nombre,
      imagenUrl: item.imagenUrl || null,
      precioPagado: item.precio,
      compradoEn: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return { ok: true };
});
