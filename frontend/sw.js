/* =========================================================
   BioCoreZ3 — Service Worker
   Cachea el "app shell" (HTML/CSS/JS/íconos propios) para que la app cargue
   offline o con mala conexión. Todo lo demás (Firestore, Storage, Auth,
   Pl@ntNet/iNaturalist vía /api/analyzePlant, CDNs externos) pasa directo a
   la red sin interceptar: son datos dinámicos o dominios cruzados que un
   cache desactualizado rompería.
   ========================================================= */
const CACHE_NAME = 'biocorez3-shell-v1';

const PRECACHE_URLS = [
  '/index.html',
  '/registro.html',
  '/dashboard.html',
  '/escaner.html',
  '/gaiadex.html',
  '/especie.html',
  '/perfil.html',
  '/tienda.html',
  '/configuracion.html',
  '/manifest.json',
  '/assets/css/style.css',
  '/assets/js/main.js',
  '/assets/js/session.js',
  '/assets/js/firebase-config.js',
  '/assets/js/auth.js',
  '/assets/js/dashboard.js',
  '/assets/js/scanner.js',
  '/assets/js/gaiadex.js',
  '/assets/js/especie.js',
  '/assets/js/perfil.js',
  '/assets/js/tienda.js',
  '/assets/js/configuracion.js',
  '/assets/img/logo.svg',
  '/assets/img/icons/icon-192.png',
  '/assets/img/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return; // deja pasar POSTs, Firestore/Storage/Auth y CDNs sin tocar
  }

  // Stale-while-revalidate: responde del cache al instante si existe (rápido
  // y funciona offline) y en paralelo pide la red para refrescar el cache.
  event.respondWith(
    caches.match(request).then((cached) => {
      const enRed = fetch(request)
        .then((respuesta) => {
          if (respuesta.ok) {
            const copia = respuesta.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copia));
          }
          return respuesta;
        })
        .catch(() => cached);
      return cached || enRed;
    })
  );
});
