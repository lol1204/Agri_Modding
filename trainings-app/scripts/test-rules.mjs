/**
 * Prüft die Firestore-Sicherheitsregeln (firestore.rules) gegen die lokalen
 * Firebase-Emulatoren: Jeder Nutzer darf nur seine eigenen Daten lesen/schreiben.
 *
 * Start: npm run test:rules   (startet die Emulatoren automatisch)
 */
import { deleteApp, initializeApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import {
  collection,
  collectionGroup,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  terminate,
  where,
} from 'firebase/firestore';

const PROJECT = 'demo-trainings';
let failed = 0;

function client(name) {
  const app = initializeApp({ apiKey: 'demo-key', projectId: PROJECT, appId: 'demo-app' }, name);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  return { app, auth, db };
}

async function expectAllowed(label, fn) {
  try {
    await fn();
    console.log(`  ✓ erlaubt:  ${label}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ FEHLER – sollte erlaubt sein: ${label} (${e.code ?? e.message})`);
  }
}

async function expectDenied(label, fn) {
  try {
    await fn();
    failed++;
    console.log(`  ✗ FEHLER – sollte gesperrt sein: ${label}`);
  } catch (e) {
    if (e.code === 'permission-denied') console.log(`  ✓ gesperrt: ${label}`);
    else {
      failed++;
      console.log(`  ✗ FEHLER – unerwarteter Fehler: ${label} (${e.code ?? e.message})`);
    }
  }
}

const stamp = Date.now();
const a = client('nutzer-a');
const b = client('nutzer-b');
const anon = client('anonym');

const userA = (await createUserWithEmailAndPassword(a.auth, `a${stamp}@test.de`, 'geheim123')).user;
const userB = (await createUserWithEmailAndPassword(b.auth, `b${stamp}@test.de`, 'geheim123')).user;
const set = { id: 's1', uid: userA.uid, workoutId: 'w1', itemId: 'i1', exerciseId: 'bankdruecken-lh', type: 'work', weightKg: 60, reps: 10, rir: 2, painFlag: false, performedAt: stamp };

console.log('Eigene Daten (Nutzer A):');
await expectAllowed('Profil schreiben', () => setDoc(doc(a.db, 'users', userA.uid), { goal: 'muskelaufbau' }));
await expectAllowed('Plan schreiben', () => setDoc(doc(a.db, 'users', userA.uid, 'plans', 'p1'), { id: 'p1', name: 'Plan' }));
await expectAllowed('Training schreiben', () => setDoc(doc(a.db, 'users', userA.uid, 'workouts', 'w1'), { id: 'w1', name: 'Training' }));
await expectAllowed('Satz schreiben', () => setDoc(doc(a.db, 'users', userA.uid, 'workouts', 'w1', 'sets', 's1'), set));
await expectAllowed('Profil lesen', () => getDoc(doc(a.db, 'users', userA.uid)));
await expectAllowed('Alle eigenen Sätze per Sammelabfrage lesen', async () => {
  const snap = await getDocs(query(collectionGroup(a.db, 'sets'), where('uid', '==', userA.uid), where('performedAt', '>=', 0)));
  if (snap.size !== 1) throw new Error(`erwartet 1 Satz, gefunden ${snap.size}`);
});

console.log('Fremde Daten (Nutzer B auf Daten von A):');
await expectDenied('Profil lesen', () => getDoc(doc(b.db, 'users', userA.uid)));
await expectDenied('Pläne lesen', () => getDocs(collection(b.db, 'users', userA.uid, 'plans')));
await expectDenied('Sätze lesen', () => getDocs(collection(b.db, 'users', userA.uid, 'workouts', 'w1', 'sets')));
await expectDenied('Plan überschreiben', () => setDoc(doc(b.db, 'users', userA.uid, 'plans', 'p1'), { id: 'p1', name: 'gehackt' }));
await expectDenied('Sätze von A per Sammelabfrage', () => getDocs(query(collectionGroup(b.db, 'sets'), where('uid', '==', userA.uid))));
await expectDenied('Sammelabfrage ohne uid-Filter', () => getDocs(collectionGroup(b.db, 'sets')));

console.log('Sonstiges:');
await expectDenied('Satz mit fremder uid im eigenen Bereich', () =>
  setDoc(doc(b.db, 'users', userB.uid, 'workouts', 'w9', 'sets', 's9'), { ...set, uid: userA.uid }),
);
await expectDenied('Daten außerhalb von users/', () => setDoc(doc(a.db, 'oeffentlich', 'x'), { a: 1 }));
await expectDenied('Ohne Login lesen', () => getDoc(doc(anon.db, 'users', userA.uid)));

for (const c of [a, b, anon]) {
  await signOut(c.auth).catch(() => undefined);
  await terminate(c.db);
  await deleteApp(c.app);
}

if (failed) {
  console.error(`\n${failed} Regel-Test(s) fehlgeschlagen.`);
  process.exit(1);
}
console.log('\nAlle Regel-Tests bestanden: Jeder sieht nur seine eigenen Daten.');
process.exit(0);
