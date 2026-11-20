/**
 * Bildschirm während des Trainings anlassen (Screen Wake Lock API).
 * Wird von neueren iOS-Versionen auch im Webclip unterstützt; wo nicht,
 * passiert einfach nichts.
 */
type Sentinel = { release: () => Promise<void> };
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<Sentinel> } };

let sentinel: Sentinel | null = null;
let wanted = false;

async function acquire(): Promise<void> {
  const nav = typeof navigator !== 'undefined' ? (navigator as WakeLockNavigator) : null;
  if (!nav?.wakeLock || sentinel || document.visibilityState !== 'visible') return;
  try {
    sentinel = await nav.wakeLock.request('screen');
  } catch {
    sentinel = null;
  }
}

function onVisibility(): void {
  // Beim Zurückkehren in die App gibt iOS die Sperre frei → neu anfordern.
  if (document.visibilityState === 'visible' && wanted) {
    sentinel = null;
    void acquire();
  }
}

export function keepScreenOn(): () => void {
  if (typeof document === 'undefined') return () => undefined;
  wanted = true;
  void acquire();
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    wanted = false;
    document.removeEventListener('visibilitychange', onVisibility);
    const s = sentinel;
    sentinel = null;
    void s?.release().catch(() => undefined);
  };
}
