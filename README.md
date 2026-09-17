# BioCoreZ3

BioCoreZ3 (GaiaDex) es una app web que convierte la exploración de biodiversidad en un juego de
coleccionismo: escaneas una foto de una planta o animal, una Cloud Function la identifica usando
[Pl@ntNet](https://my.plantnet.org) (plantas) o [iNaturalist](https://www.inaturalist.org) (animales),
y ganas XP, subes de nivel y acumulas monedas para gastar en una tienda cosmética.

## Stack

- **Frontend:** HTML + JS vanilla (sin build step), Firebase JS SDK v10 (modo compat), Chart.js.
- **Backend:** Firebase Cloud Functions (Node 20) — identificación de especies, XP/niveles, compras.
- **Datos:** Firestore (perfiles, historial de análisis, tienda, especies de referencia) + Storage
  (fotos de escaneo).

## Estructura

```
backend/functions/     Cloud Functions (index.js), providers de identificación, seeds
frontend/               Sitio estático servido por Firebase Hosting
firestore.rules          Reglas de seguridad de Firestore
storage.rules            Reglas de seguridad de Storage
firebase.json             Configuración de Hosting/Functions/Firestore/Storage/emuladores
```

## Requisitos previos

- [Node.js 20](https://nodejs.org/)
- [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`
- Una cuenta de [Firebase](https://console.firebase.google.com/) con un proyecto creado
- Una API key de [Pl@ntNet](https://my.plantnet.org) (gratuita) para identificar plantas

## Configuración inicial

1. Clona el repo e instala las dependencias de las Functions:

   ```bash
   cd backend/functions
   npm install
   ```

2. Inicia sesión en Firebase y enlaza el proyecto (o ajusta `.firebaserc` con tu `projectId`):

   ```bash
   firebase login
   ```

3. El frontend usa la config pública de Firebase ya cargada en
   [`frontend/assets/js/firebase-config.js`](frontend/assets/js/firebase-config.js). Si vas a usar
   tu propio proyecto de Firebase, reemplaza esos valores por los de **Firebase Console > Configuración
   del proyecto > Tus apps > Web app** (son datos públicos; la seguridad real la dan
   `firestore.rules` / `storage.rules`).

4. Configura el secret de Pl@ntNet (usado solo en el backend, nunca se expone al cliente):

   ```bash
   firebase functions:secrets:set PLANTNET_API_KEY
   ```

## Correr en local (emuladores)

```bash
cd backend/functions
npm run serve
```

Esto levanta Hosting (`:5000`), Functions (`:5001`), Firestore (`:8080`), Auth (`:9099`), Storage
(`:9199`) y la UI de emuladores (`:4000`). `firebase-config.js` detecta `localhost` automáticamente
y conecta el frontend a los emuladores en vez del proyecto real.

Abre **http://localhost:5000** para usar la app.

> Nota: el secret `PLANTNET_API_KEY` no se inyecta automáticamente en el emulador de Functions.
> Para probar el escaneo de plantas en local, exporta la variable antes de levantar el emulador:
> `PLANTNET_API_KEY=tu_api_key npm run serve` (PowerShell: `$env:PLANTNET_API_KEY="tu_api_key"`).

## Sembrar datos de referencia (opcional)

Dos colecciones se pueden poblar con datos curados de ejemplo — la app funciona sin ellas
(cae a los datos crudos que devuelve la IA), pero mejoran la experiencia:

```bash
cd backend/functions
GOOGLE_APPLICATION_CREDENTIALS=ruta/a/service-account.json node seed/seedEspecies.js
GOOGLE_APPLICATION_CREDENTIALS=ruta/a/service-account.json node seed/seedTienda.js
```

(Genera el `service-account.json` desde **Firebase Console > Configuración del proyecto > Cuentas
de servicio > Generar nueva clave privada**. No lo subas al repo — ya está cubierto por
`.gitignore`.)

## Desplegar a producción

```bash
firebase deploy
```

O por partes: `firebase deploy --only hosting`, `firebase deploy --only functions`,
`firebase deploy --only firestore:rules,storage`.

## PWA (Progressive Web App)

BioCoreZ3 es instalable y cachea su "app shell" para cargar rápido / offline:

- [`frontend/manifest.json`](frontend/manifest.json) — nombre, colores, `start_url` e íconos
  (192, 512 y una versión maskable) en `frontend/assets/img/icons/`.
- [`frontend/sw.js`](frontend/sw.js) — service worker con estrategia *stale-while-revalidate*
  para el HTML/CSS/JS/íconos propios. Todo lo demás (Firestore, Storage, Auth, `/api/analyzePlant`,
  CDNs externos) pasa directo a la red sin interceptar, para no cachear datos dinámicos ni romper
  los listeners en tiempo real del SDK de Firebase.
- Registrado desde [`assets/js/main.js`](frontend/assets/js/main.js), que también muestra un botón
  flotante "Instalar app" cuando el navegador dispara `beforeinstallprompt`.
- `firebase.json` fuerza `Cache-Control: no-cache` en `/sw.js` y `/manifest.json` para que las
  actualizaciones del service worker lleguen a los usuarios sin quedar atascadas en caché.

**Cómo probarlo:** sirve `frontend/` sobre HTTPS o `localhost` (los emuladores de Firebase sirven
por `http://localhost:5000`, que cuenta como *secure context*) y abre Chrome DevTools >
**Application > Manifest** / **Service Workers** para verificar instalabilidad, o usa el ícono de
instalar en la barra de direcciones.

> Nota: algunos entornos de vista previa embebidos (sandboxes de navegador automatizado) bloquean
> por completo el registro de Service Workers — incluso uno vacío de una línea falla ahí con
> "An unknown error occurred when fetching the script." No es un bug del código: `sw.js` se sirve
> con el `Content-Type` correcto y responde 200. Pruébalo en un navegador real (Chrome/Edge) para
> confirmar el registro.

## Modelo de datos (Firestore)

| Colección                         | Descripción                                                        |
|------------------------------------|---------------------------------------------------------------------|
| `usuarios/{uid}`                   | Perfil: nombre, nivel, xp, monedas. Solo el backend escribe xp/nivel/monedas. |
| `usuarios/{uid}/inventario/{item}` | Ítems comprados en la tienda (escrito por la Function `comprarItem`). |
| `analisis/{id}`                    | Historial de escaneos (especie, rareza, confianza, imagen). Solo lectura para el dueño. |
| `tienda/{itemId}`                  | Catálogo de la tienda. Público de lectura.                          |
| `especies/{especieId}`             | Fichas de referencia curadas (opcional, alimenta `especie.html`).   |

## Limitaciones conocidas

- La identificación de animales usa un endpoint no documentado/no oficial de iNaturalist
  (ver comentario en [`backend/functions/providers/inaturalist.js`](backend/functions/providers/inaturalist.js)).
  Puede cambiar o dejar de responder sin aviso; si eso ocurre, se reemplaza solo ese archivo
  (p. ej. por Google Cloud Vision) sin tocar el resto del sistema.
- La "rareza" de cada especie es un hash determinístico del nombre científico, no un dato
  biológico real — es puramente una mecánica de juego (ver `backend/functions/rareza.js`).
