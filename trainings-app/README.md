# Trainings-App

Ein schneller Trainingslogger fürs iPhone mit virtuellem Personaltrainer:

- Er schlägt **pro Satz das Gewicht vor**.
- Er zeigt deinen **Fortschritt** und lässt **Pausen ohne schlechtes Gewissen** zu.
- Die App läuft als **Webclip** (PWA = Web-App mit eigenem Icon auf dem Home-Bildschirm).
- Sie funktioniert **komplett offline**.

**Die App läuft komplett über Google Firebase** (kostenloser Spark-Plan, ohne Zahlungsdaten):

| Firebase-Dienst | Wofür |
| --- | --- |
| **Authentication** | Login mit E-Mail und Passwort |
| **Cloud Firestore** | Alle Daten (Pläne, Trainings, Sätze), EU-Standort, mit Offline-Speicher im Browser |
| **Hosting** | Die Web-Adresse, unter der die App läuft (`https://<projekt-id>.web.app`) |

---

## Was ist schon fertig? (MVP, Schritte 1–6)

| Bereich | Inhalt |
| --- | --- |
| **Grundgerüst** | Expo SDK 58, 5 Tabs (Heute, Pläne, Fortschritt, Coach, Profil), Dark Mode mit Mint-Akzent, Service Worker für den Offline-Betrieb |
| **Login & Daten** | E-Mail/Passwort, Firestore mit Offline-Speicher, Repositories, Konto + Daten löschen, Sicherheitsregeln mit Tests |
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

## Schritt für Schritt: Firebase einrichten und aufs iPhone

Die Schritte A bis C machst du einmal am Computer, Schritt D auf dem iPhone. Insgesamt dauert das etwa 20 Minuten.

### A. Firebase-Projekt anlegen (im Browser)

1. **Projekt erstellen**
   - Öffne https://console.firebase.google.com und melde dich mit deinem Google-Konto an.
   - Klicke **„Projekt erstellen“** (bzw. „Projekt hinzufügen“).
   - Als Name z. B. `trainings-app` eingeben. Firebase hängt automatisch eine Nummer an, daraus wird deine **Projekt-ID**.
   - **Google Analytics: ausschalten.** Die App kommt ohne Tracking aus.
   - Klicke „Projekt erstellen“ und warte kurz.
   - Du bist automatisch im kostenlosen **Spark-Plan**. Du musst keine Zahlungsdaten eingeben und solltest auch nicht auf „Upgrade“ klicken.

2. **Login aktivieren**
   - Links im Menü: **Erstellen → Authentication → „Jetzt starten“**.
   - Im Reiter **„Anmeldemethode“** wählst du **„E-Mail-Adresse/Passwort“**.
   - Den ersten Schalter auf **Aktivieren** stellen und **Speichern**. Den Link per E-Mail ohne Passwort brauchst du nicht.

3. **Datenbank anlegen**
   - Links: **Erstellen → Firestore Database → „Datenbank erstellen“**.
   - Edition und ID unverändert lassen (Standard).
   - Als **Standort** einen **EU-Standort** wählen, z. B. `eur3 (Europe)` oder `europe-west3 (Frankfurt)`. Den Standort kannst du später nicht mehr ändern.
   - **„Im Produktionsmodus starten“** wählen. Die passenden Sicherheitsregeln liefert die App selbst mit.

4. **Web-App registrieren**
   - Klicke oben links auf das **Zahnrad → Projekteinstellungen**.
   - Unten bei „Deine Apps“ das Symbol **`</>` (Web)** anklicken.
   - Spitzname z. B. `Trainings-App` eingeben. **Firebase Hosting hier nicht anhaken**, das erledigt Schritt C.
   - Klicke **„App registrieren“**. Firebase zeigt jetzt einen Codeblock mit `firebaseConfig = { apiKey: "...", ... }`. Lass diese Seite offen.

### B. App auf deinem Computer vorbereiten

1. **Node.js** in der LTS-Version (20 oder neuer) von https://nodejs.org installieren, dazu **Git**.
2. Code holen und Pakete installieren:

   ```bash
   git clone https://github.com/lol1204/Agri_Modding.git
   cd Agri_Modding
   git checkout claude/fitness-app-plan-gwznll
   cd trainings-app
   npm install
   ```

3. Datei `.env` anlegen:

   ```bash
   cp .env.example .env
   ```

   Unter Windows (PowerShell) heißt der Befehl `copy .env.example .env`.

4. `.env` in einem Texteditor öffnen und die Werte aus dem `firebaseConfig`-Block eintragen, ohne Anführungszeichen:

   | In `firebaseConfig` | In `.env` |
   | --- | --- |
   | `apiKey` | `EXPO_PUBLIC_FIREBASE_API_KEY` |
   | `authDomain` | `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` |
   | `projectId` | `EXPO_PUBLIC_FIREBASE_PROJECT_ID` |
   | `storageBucket` | `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` |
   | `messagingSenderId` | `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
   | `appId` | `EXPO_PUBLIC_FIREBASE_APP_ID` |

   Diese Werte sind nicht geheim, weil sie ohnehin im Browser landen. Deine Daten schützen die Firestore-Regeln: Jeder Nutzer sieht nur seine eigenen Daten.

5. Optional kurz am Computer testen:

   ```bash
   npm run web
   ```

   Dann `http://localhost:8081` öffnen, ein Konto anlegen und ein Training starten.

### C. Veröffentlichen (Firebase Hosting)

```bash
npx firebase-tools login
npm run deploy
```

1. `login` öffnet den Browser: Melde dich mit demselben Google-Konto an.
2. Das Projekt (`improvefitness-49089`) ist in `.firebaserc` schon eingetragen. Bei einem anderen Projekt: `npx firebase-tools use --add`.
3. `npm run deploy` baut die App und lädt drei Dinge zu Firebase hoch:
   - die App (Hosting),
   - die **Sicherheitsregeln**,
   - den **Datenbank-Index**.
4. Am Ende steht die Adresse da, z. B. `Hosting URL: https://trainings-app-1234.web.app`.

Der Index wird nach dem ersten Deploy ein paar Minuten lang aufgebaut. Erscheint in dieser Zeit „Synchronisierung hakt“, einfach kurz warten.

### D. Aufs iPhone holen

1. Öffne die Hosting-URL in **Safari** (nicht in Chrome).
2. Tippe auf **Teilen**, dann **„Zum Home-Bildschirm“**, dann **Hinzufügen**.
3. Öffne die App **über das neue Icon** und lege dort dein Konto an. Dafür brauchst du einmal Internet.
4. Schließe die App einmal komplett und öffne sie wieder. Jetzt ist alles für den Offline-Betrieb gespeichert.
5. Test: Flugmodus an, App öffnen, Training starten und einen Satz loggen. Mit Netz gleicht sich alles automatisch mit Firebase ab.

**Updates:** Nach Änderungen einfach erneut `npm run deploy` ausführen. In der App erscheint dann „Update bereit – Neu laden“.

**Kosten:** Der Spark-Plan ist kostenlos und hat feste Grenzen. Für eine Person reicht das locker, zum Beispiel mit 50.000 Lesevorgängen und 20.000 Schreibvorgängen pro Tag. Wird eine Grenze erreicht, stoppt Firebase den Dienst nur bis zum nächsten Tag. Es entstehen keine Kosten.

---

## Für Entwickler

```bash
npm run web          # Entwicklungsserver
npm run check        # TypeScript (strict) + Theme-Check + Unit-Tests
npm test             # nur die Unit-Tests (Jest)
npm run test:rules   # Firestore-Sicherheitsregeln gegen die Firebase-Emulatoren testen (braucht Java)
npm run emulators    # Auth- und Firestore-Emulator lokal starten
npm run build:web    # statischer Export nach dist/ inkl. Service Worker
npm run deploy       # bauen + auf Firebase veröffentlichen
```

**Ohne echtes Projekt entwickeln:**

1. In `.env` als Projekt-ID `demo-trainings` eintragen.
2. Für `apiKey` und `appId` beliebige Werte eintragen, z. B. `demo-key` und `demo-app`.
3. `npm run emulators` starten.

Die App spricht dann nur mit den lokalen Firebase-Emulatoren.

### Ordner

```
app/                 Screens (expo-router, nur statische Routen; IDs als ?id=)
src/theme/           Farben, Abstände, Textstile – die einzige Stelle mit Farbwerten
src/components/      Basis-Komponenten (Screen, Card, Button, Stepper, Sheet, Charts …)
src/domain/          Datentypen, deutsche Bezeichnungen, Standardwerte
src/engine/          Reine Logik mit Unit-Tests (Gewichtsassistent, Session, Fortschritt …)
src/db/              Firestore-Repositories, Login, zentraler Datenspeicher, Aktionen
src/integrations/    Firebase-Start (lazy), Service Worker, Wake Lock
src/features/        Screens je Bereich
data/exercises.json  Startdaten der Übungsbibliothek
public/              manifest.json, sw.js (Vorlage), Icons
scripts/             Build-Hilfen und Regel-Test
tests/               Jest-Tests (inkl. Test-Speicher für die Repositories)
firebase.json        Hosting, Regeln, Indizes, Emulatoren
firestore.rules      Sicherheitsregeln (nur eigene Daten)
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

**Getrennter Speicher:** Safari und das Home-Bildschirm-Icon haben jeweils einen eigenen Speicher. Starte die App deshalb immer über das Icon. Die Daten liegen ohnehin in Firebase.

**Was getestet ist:** Automatisiert in Chromium mit iPhone-Bildschirmgröße, gegen die offiziellen Firebase-Emulatoren:

- Registrieren und Anmelden
- Training und Offline-Loggen
- Offline neu starten
- Abgleich auf einem zweiten Gerät
- Konto löschen
- Sicherheitsregeln (15 Prüfungen)

**Was noch nicht getestet ist:**

- **Echtes Safari/iPhone:** Konnte ich nicht prüfen. Bitte einmal selbst auf dem iPhone testen.
- **Dein echtes Firebase-Projekt:** Ebenfalls noch nicht ausprobiert.
