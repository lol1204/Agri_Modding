# Trainings-App

Ein schneller Trainingslogger fürs iPhone mit virtuellem Personaltrainer:

- Er schlägt **pro Satz das Gewicht vor**.
- Er zeigt deinen **Fortschritt** und lässt **Pausen ohne schlechtes Gewissen** zu.
- Die App läuft als **Webclip** (PWA = Web-App mit eigenem Icon auf dem Home-Bildschirm).
- Sie funktioniert **komplett offline** und nutzt Firebase im **kostenlosen Spark-Plan**.

---

## Was ist schon fertig? (MVP, Schritte 1–6)

| Bereich | Inhalt |
| --- | --- |
| **Grundgerüst** | Expo SDK 58, 5 Tabs (Heute, Pläne, Fortschritt, Coach, Profil), Dark Mode mit Mint-Akzent, Service Worker für den Offline-Betrieb |
| **Login & Daten** | E-Mail/Passwort, Firestore mit Offline-Speicher, Repositories, Konto + Daten löschen. Ohne Firebase-Werte läuft die App im **lokalen Modus**. |
| **Übungsbibliothek** | 72 Übungen (Gym + Calisthenics) mit Technik-Tipps, Filtern, Favoriten, eigenen Übungen, Alternativen und Progressionen |
| **Pläne** | Vorlagen (Ganzkörper, Upper/Lower, Push/Pull/Legs, Gym A/B/C, Calisthenics), Plan-Editor mit Drag & Drop und Supersätzen |
| **Live-Training** | Ein Satz in 2 Taps, Pausentimer als Ring, Dropsätze mit Scheibenrechner, Rückgängig, Übung tauschen, Zeitbudget, Fortsetzen nach Neustart |
| **Gewichtsassistent** | Vorschlag nach jedem Satz mit „Warum?“, Aufwärmsätze, doppelte Progression, Tastsatz bei neuen Übungen, lernt aus deinen Korrekturen |
| **Fortschritt** | Wochenvolumen-Trend, Rekorde, harte Sätze pro Muskelgruppe (Richtwert 10–20), Verlauf pro Übung mit geschätztem 1RM, Wochen-Streak |

**Als Nächstes** (laut Plan):

7. Krank-/Pausenmodus
8. Tagesform-Check-in
9. Plan-Assistent und Coach
10. Feinschliff (Wrapped-Rückblick, Körper-Heatmap, Onboarding, Export)
11. Release

---

## Schritt für Schritt aufs iPhone

### 1. Voraussetzungen (einmalig, auf deinem Computer)

- **Node.js** in der LTS-Version (Version 20 oder neuer) von https://nodejs.org installieren.
- **Git** installieren, falls noch nicht vorhanden.

### 2. Code holen und Pakete installieren

```bash
git clone https://github.com/lol1204/Agri_Modding.git
cd Agri_Modding
git checkout claude/fitness-app-plan-gwznll
cd trainings-app
npm install
```

### 3. Kurz im Browser ausprobieren (optional)

```bash
npm run web
```

Dann im Browser `http://localhost:8081` öffnen. Ohne `.env` läuft die App im **lokalen Modus**: Die Daten liegen nur in diesem Browser, und du musst dich nicht anmelden.

### 4. Firebase-Projekt anlegen (kostenlos, ohne Zahlungsdaten)

1. Öffne https://console.firebase.google.com und wähle **Projekt hinzufügen**.
   - Name, z. B. `trainings-app`.
   - **Google Analytics ausschalten**, denn die App kommt ohne Tracking aus.
2. Login einrichten: **Build → Authentication → Jetzt starten**.
   - Unter Anmeldeanbieter **E-Mail/Passwort** aktivieren.
3. Datenbank einrichten: **Build → Firestore Database → Datenbank erstellen**.
   - Als Standort einen **EU-Standort** wählen, z. B. `eur3 (Europe)` oder `europe-west3 (Frankfurt)`.
   - **Produktionsmodus** wählen. Die passenden Regeln liefert die App selbst mit.
4. Web-App anlegen: **Projektübersicht → Symbol `</>` (Web-App hinzufügen)**.
   - Einen Namen vergeben.
   - Den angezeigten `firebaseConfig`-Block offen lassen, du brauchst ihn im nächsten Schritt.
5. Im Ordner `trainings-app` die Vorlage kopieren:

   ```bash
   cp .env.example .env
   ```

   Dann in `.env` die Werte aus `firebaseConfig` eintragen:

   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=…
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=…
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=…
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=…
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=…
   EXPO_PUBLIC_FIREBASE_APP_ID=…
   ```

   Diese Werte sind nicht geheim, weil sie ohnehin im Browser landen. Deine Daten schützen die Firestore-Regeln: Jeder Nutzer sieht nur seine eigenen Daten.

### 5. Veröffentlichen (Firebase Hosting)

```bash
npx firebase-tools login
npx firebase-tools use --add
npm run deploy
```

- Bei `use --add` wählst du dein Projekt aus und gibst als Alias `default` an.
- `npm run deploy` baut die App und lädt **Hosting, Firestore-Regeln und Indizes** hoch.
- Danach ist die App unter `https://<deine-projekt-id>.web.app` erreichbar.

### 6. Aufs iPhone holen

1. Öffne die Adresse in **Safari** (nicht in Chrome).
2. Tippe auf **Teilen**, dann **Zum Home-Bildschirm**, dann **Hinzufügen**.
3. Öffne die App **über das neue Icon** und lege dein Konto an.
4. Schließe die App einmal komplett und öffne sie wieder. Jetzt ist alles für den Offline-Betrieb gespeichert.
5. Test: Flugmodus an, App öffnen, Training starten und einen Satz loggen. Sobald du wieder Netz hast, gleicht sich alles automatisch ab.

**Updates:** Nach Änderungen einfach erneut `npm run deploy` ausführen. In der App erscheint dann „Update bereit – Neu laden“.

---

## Für Entwickler

```bash
npm run web          # Entwicklungsserver
npm run check        # TypeScript (strict) + Theme-Check + Unit-Tests
npm test             # nur die Unit-Tests (Jest)
npm run build:web    # statischer Export nach dist/ inkl. Service Worker
```

### Ordner

```
app/                 Screens (expo-router, nur statische Routen; IDs als ?id=)
src/theme/           Farben, Abstände, Textstile – die einzige Stelle mit Farbwerten
src/components/      Basis-Komponenten (Screen, Card, Button, Stepper, Sheet, Charts …)
src/domain/          Datentypen, deutsche Bezeichnungen, Standardwerte
src/engine/          Reine Logik mit Unit-Tests (Gewichtsassistent, Session, Fortschritt …)
src/db/              Repositories (Firestore + lokal), zentraler Datenspeicher, Aktionen
src/integrations/    Firebase (lazy), Service Worker, Wake Lock
src/features/        Screens je Bereich
data/exercises.json  Startdaten der Übungsbibliothek
public/              manifest.json, sw.js (Vorlage), Icons
tests/               Jest-Tests
```

### Regeln im Code

- Farben nur aus `src/theme`. `npm run check:theme` prüft das.
- Logik ohne Oberfläche gehört in `src/engine`, mit Tests.
- Die Oberfläche spricht nie direkt mit Firestore, sondern nur über `src/db`.
- Firebase wird nur im Browser und erst bei Bedarf geladen, nie während des Builds.
- Neue Pakete nur mit Begründung und per `npx expo install`.

### Datenmodell (Firestore)

| Pfad | Inhalt |
| --- | --- |
| `users/{uid}` | Profil: Ziel, Level, Equipment-Stufen, Einheiten, Wochenziel |
| `users/{uid}/exercises/{id}` | eigene Übungen |
| `users/{uid}/plans/{id}` | Pläne mit Tagen, Übungen, Supersatz-Gruppen |
| `users/{uid}/workouts/{id}` | Trainings inkl. Zusammenfassung (für schnelle Statistiken) |
| `users/{uid}/workouts/{id}/sets/{id}` | Sätze (mit `uid` für die Sammelabfrage) |
| `users/{uid}/checkins/{datum}` | Tagesform (vorbereitet) |
| `users/{uid}/pauses/{id}` | Krank/Pause (vorbereitet) |

---

## Grenzen und ehrliche Hinweise

**Nicht im Webclip verfügbar:** Apple Health und Haptik. Der Pausen-Ton ist optional und funktioniert nur, solange die App offen ist.

**Getrennter Speicher:** Safari und das Home-Bildschirm-Icon haben jeweils einen eigenen Speicher. Starte die App deshalb immer über das Icon. Mit Login liegen die Daten ohnehin in der Cloud.

**Was getestet ist:** Die App wurde automatisiert in Chromium mit iPhone-Bildschirmgröße geprüft:

- Plan anlegen, Training, Rückgängig, Dropsatz, Rekorde, Fortschritt
- Offline-Start und Loggen im Flugmodus

**Was noch nicht getestet ist:**

- **Echtes Safari/iPhone:** Konnte ich nicht prüfen. Bitte einmal selbst auf dem iPhone testen.
- **Login und Firestore mit deinem Firebase-Projekt:** Ebenfalls noch nicht gegen den echten Server getestet.
