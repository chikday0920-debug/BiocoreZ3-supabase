/**
 * Siembra el catálogo de la tienda (colección `tienda`) con los mismos 6
 * ítems que antes estaban hardcodeados en tienda.html.
 *
 * Uso (una sola vez, con credenciales de admin del proyecto):
 *   GOOGLE_APPLICATION_CREDENTIALS=ruta/a/service-account.json node seed/seedTienda.js
 */
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

const items = [
  { id: "sincronizador-neuronal", nombre: "Sincronizador neuronal", categoria: "skin", precio: 1200, emoji: "🌱", descripcion: "Accesorio digital avanzado que mejora la precisión del escáner." },
  { id: "piel-espectro-bosque", nombre: "Piel espectro del bosque", categoria: "skin", precio: 4500, emoji: "🧅", descripcion: "Un atuendo digital inspirado en las cebollas silvestres." },
  { id: "nucleo-biolectrico", nombre: "Núcleo biolectrico", categoria: "mejora", precio: 500, emoji: "🧑‍🌾", descripcion: "Recarga instantánea para las baterías y especies de tu escáner." },
  { id: "socio-co-rbit", nombre: "Socio CO-RBIT", categoria: "companion", precio: 8500, emoji: "🥔", descripcion: "Una mascota robótica que marca automáticamente las especies cercanas." },
  { id: "enlace-verde", nombre: "Enlace verde", categoria: "accesorio", precio: 2500, emoji: "🥬", descripcion: "Conéctate con otros escáneres en un radio de 5 km para compartir datos." },
  { id: "escudo-flora-cuantica", nombre: "Escudo de flora cuántica", categoria: "mejora", precio: 800, emoji: "🥕", descripcion: "Protege las muestras escaneadas de la corrupción digital." },
];

(async () => {
  const batch = db.batch();
  items.forEach(item => batch.set(db.collection("tienda").doc(item.id), item));
  await batch.commit();
  console.log(`Sembrados ${items.length} ítems en la colección "tienda".`);
})();
