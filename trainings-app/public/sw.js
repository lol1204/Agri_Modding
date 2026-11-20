/* Service Worker der Trainings-App.
 *
 * Aufgabe: Die App komplett im Browser zwischenspeichern, damit sie auch
 * ohne Netz (Flugmodus, schlechter Empfang im Gym) startet.
 *
 * Strategie „Cache zuerst“: Alles kommt sofort aus dem Speicher. Das Netz wird
 * nur für Neues genutzt. Die Liste der Dateien und die Build-ID trägt
 * `scripts/inject-sw-manifest.mjs` nach dem Build ein.
 *
 * Daten (Firestore) laufen NICHT über diesen Cache – Firestore hat einen
 * eigenen Offline-Speicher.
 */

const BUILD_ID = /*__BUILD_ID__*/ 'dev';
const PRECACHE_URLS = /*__PRECACHE_MANIFEST__*/ [];
const CACHE_NAME = 'trainings-app-' + BUILD_ID;
const FALLBACK_PAGE = '/';

// Antwort ohne Weiterleitungs-Markierung speichern (Safari lehnt sonst ab).
async function cleanResponse(response) {
  if (!response.redirected) return response;
  const body = await response.blob();
  return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'reload' });
            if (response.ok) await cache.put(url, await cleanResponse(response));
          } catch (e) {
            // Einzelne Datei fehlgeschlagen – wird später bei Bedarf geladen.
          }
        }),
      );
      // Allererste Installation: sofort aktiv werden.
      if (!self.registration.active) await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key.startsWith('trainings-app-') && key !== CACHE_NAME).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// "/plaene/" → "/plaene", ".html" entfernen, "/index" → "/".
function normalizePath(pathname) {
  let path = pathname.replace(/\.html$/, '').replace(/\/index$/, '/');
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path || '/';
}

async function handleNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  const url = new URL(request.url);
  const cached = (await cache.match(normalizePath(url.pathname))) || null;
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(normalizePath(url.pathname), await cleanResponse(response.clone()));
    return response;
  } catch (e) {
    const fallback = await cache.match(FALLBACK_PAGE);
    if (fallback) return fallback;
    return new Response('Offline – bitte die App einmal mit Internet öffnen.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

async function handleAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === 'basic') cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Nur eigene Dateien; Firebase & Co. gehen direkt ins Netz.
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/sw.js') return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
  } else {
    event.respondWith(handleAsset(request));
  }
});
