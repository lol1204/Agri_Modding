import { router } from 'expo-router';

/**
 * Zurück zur Startseite, ohne einen zweiten Tab-Stapel aufzubauen:
 * Gibt es die Startseite schon im Verlauf, wird dorthin zurückgesprungen.
 */
export function goHome(): void {
  if (router.canDismiss()) router.dismissTo('/');
  else router.replace('/');
}
