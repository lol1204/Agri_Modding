const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Zufällige ID (20 Zeichen, wie Firestore-IDs). Wird auf dem Gerät erzeugt,
 * damit Einträge auch offline sofort eine feste ID haben.
 */
export function createId(length = 20): string {
  const bytes = new Uint8Array(length);
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.getRandomValues) {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let id = '';
  for (let i = 0; i < length; i++) id += ALPHABET[(bytes[i] ?? 0) % ALPHABET.length];
  return id;
}
