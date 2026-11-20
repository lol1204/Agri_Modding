/**
 * Service-Worker-Anbindung (Offline-Betrieb).
 * Der Service Worker (public/sw.js) speichert die App im Browser zwischen.
 * Wird eine neue Version gefunden, melden wir das über `onUpdateReady`.
 */

type UpdateCallback = (applyUpdate: () => void) => void;

function isLocalDev(): boolean {
  if (typeof window === 'undefined') return true;
  // Im Entwicklungsserver (expo start) keinen Service Worker nutzen.
  return process.env.NODE_ENV !== 'production';
}

export function registerServiceWorker(onUpdateReady: UpdateCallback): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || isLocalDev()) return;

  const applyUpdate = (worker: ServiceWorker) => () => {
    worker.postMessage({ type: 'SKIP_WAITING' });
  };

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((registration) => {
      const notifyIfWaiting = () => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          onUpdateReady(applyUpdate(registration.waiting));
        }
      };
      notifyIfWaiting();
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed') notifyIfWaiting();
        });
      });
      // Beim Zurückkehren in die App nach Updates schauen.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update().catch(() => undefined);
      });
    })
    .catch(() => {
      // Ohne Service Worker läuft die App trotzdem – nur nicht offline.
    });
}
