import { useCallback, useEffect, useState } from 'react';

/**
 * Zustand der laufenden Trainings-Oberfläche (welche Übung ist offen,
 * Pausentimer, Dropsatz-Modus). Liegt im Browser, damit nach einem
 * Neustart der App alles genau so weitergeht.
 */
export interface LiveState {
  currentItemId: string | null;
  /** Ende der Pause (Zeitstempel) – läuft so auch im Hintergrund korrekt weiter. */
  restEndsAt: number | null;
  restTotalSec: number;
  /** Dropsatz-Kette: an welchen Satz wird angehängt? */
  dropOf: string | null;
  soundOn: boolean;
}

const initial: LiveState = { currentItemId: null, restEndsAt: null, restTotalSec: 0, dropOf: null, soundOn: false };

const key = (workoutId: string) => `trainings-app:live:${workoutId}`;

function read(workoutId: string): LiveState {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key(workoutId)) : null;
    return raw ? { ...initial, ...(JSON.parse(raw) as Partial<LiveState>) } : initial;
  } catch {
    return initial;
  }
}

function write(workoutId: string, state: LiveState): void {
  try {
    window.localStorage.setItem(key(workoutId), JSON.stringify(state));
  } catch {
    // Speichern nicht möglich (privater Modus) – App läuft trotzdem.
  }
}

export function clearLiveState(workoutId: string): void {
  try {
    window.localStorage.removeItem(key(workoutId));
  } catch {
    // egal
  }
}

export function useLiveState(workoutId: string | undefined): [LiveState, (patch: Partial<LiveState>) => void] {
  const [state, setState] = useState<LiveState>(() => (workoutId ? read(workoutId) : initial));

  useEffect(() => {
    if (workoutId) setState(read(workoutId));
  }, [workoutId]);

  const update = useCallback(
    (patch: Partial<LiveState>) => {
      setState((prev) => {
        const next = { ...prev, ...patch };
        if (workoutId) write(workoutId, next);
        return next;
      });
    },
    [workoutId],
  );

  return [state, update];
}

/** Aktuelle Uhrzeit, die sich regelmäßig aktualisiert (für Timer). */
export function useNow(intervalMs = 500, active = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, active]);
  return now;
}

/** Kurzer, leiser Ton am Ende der Pause (nur wenn eingeschaltet). */
let audioCtx: AudioContext | null = null;
export function unlockAudio(): void {
  try {
    const Ctx = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioCtx ??= new Ctx();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
  } catch {
    audioCtx = null;
  }
}

export function playBeep(): void {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  } catch {
    // Ton ist nur ein Extra
  }
}
