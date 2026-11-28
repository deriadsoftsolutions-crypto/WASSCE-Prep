/**
 * The catalog: ONE document that lists everything learners can see, so a learner's page costs
 * one Firestore read instead of one read per lesson, test, assignment, unit and material.
 *
 *   catalog/public  { v, builtAt, lessons[], tests[], assignments[], units[], materials[] }
 *
 * Only published items are in it (lessons without their blocks; the lesson page reads the
 * lesson itself, and keeps it on the device until the teacher changes it).
 * The teacher's device updates the one item after each save or delete (catalogPut), and rebuilds
 * the whole catalog whenever the Teacher page opens, so it repairs itself. If it is missing, learner pages fall
 * back to reading the collections as before.
 * Free-plan budget: 50,000 reads a day for the whole school (see firebase/reads.ts).
 */
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './app';
import { getDoc, tally } from './reads';

export { CATALOG_VERSION, buildCatalog, type Catalog, type LessonSummary } from '../lib/catalogBuild';
import { CATALOG_VERSION, buildCatalog, withEntry, type Catalog, type CatalogKind } from '../lib/catalogBuild';

/* ---------- Learners: one live copy while the site is open ---------- */
// The first answer costs one read (none if the device already has an up-to-date copy and the server
// confirms within 30 minutes); after that, one read each time the teacher changes something.
// So new work shows up within seconds, for almost nothing.
let live: { cat: Catalog | null; ready: Promise<void>; unsub: () => void; uid: string } | null = null;

function startLive(uid: string) {
  if (live?.uid === uid) return live;
  live?.unsub();
  let resolve!: () => void;
  const ready = new Promise<void>((r) => (resolve = r));
  const state = { cat: null as Catalog | null, ready, unsub: () => {}, uid, first: true };
  state.unsub = onSnapshot(doc(db, 'catalog', 'public'), { includeMetadataChanges: true }, (snap) => {
    if (!snap.metadata.fromCache) { tally('catalog', 1); }
    const before = state.cat?.builtAt;
    state.cat = snap.exists() && (snap.data() as Catalog).v === CATALOG_VERSION ? (snap.data() as Catalog) : null;
    // The server's copy is the one to use. The device's own copy answers at once only when offline,
    // or if the server is slow to answer (2.5 s), so pages never wait long.
    if (!snap.metadata.fromCache) resolve();
    else if (!navigator.onLine) resolve();
    else setTimeout(resolve, 2500);
    if (!state.first && state.cat && state.cat.builtAt !== before) window.dispatchEvent(new CustomEvent('classwork-changed'));
    if (!snap.metadata.fromCache) state.first = false;
  }, () => { resolve(); if (live === state) live = null; }); // listener stopped (signed out, rules): start again next time
  setTimeout(resolve, 8000); // never wait for ever (offline): fall back
  live = state;
  return state;
}
// A different person signs in on this device (or nobody): drop the old listener and its copy.
onAuthStateChanged(auth, (u) => { if (live && live.uid !== u?.uid) stopCatalog(); });

/** The catalog, or null if the teacher's device has not written one yet (callers then read the collections). */
export async function getCatalog(): Promise<Catalog | null> {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  const l = startLive(uid);
  await l.ready;
  return l.cat;
}

/** Stop listening (sign out). */
export function stopCatalog() { live?.unsub(); live = null; }

/* ---------- Teacher: keep it current ---------- */

/**
 * After a teacher saves or deletes one item: update just that item in the catalog
 * (one read and one write), so learners see it within seconds.
 */
let queue: Promise<void> = Promise.resolve();
export function catalogPut(kind: CatalogKind, id: string, item: Record<string, unknown> | null): Promise<void> {
  // One at a time: saves made together (publish all units) must not overwrite each other.
  queue = queue.then(() => putNow(kind, id, item));
  return queue;
}
async function putNow(kind: CatalogKind, id: string, item: Record<string, unknown> | null): Promise<void> {
  try {
    const ref = doc(db, 'catalog', 'public');
    const s = await getDoc(ref);
    const cat = s.exists() && (s.data() as Catalog).v === CATALOG_VERSION ? (s.data() as Catalog) : null;
    if (!cat) { await rebuildCatalog(); return; }
    await setDoc(ref, withEntry(cat, kind, id, item));
  } catch (e) { console.warn('Catalog not updated; it is rebuilt next time the Teacher page opens', e); }
}

let timer: ReturnType<typeof setTimeout> | null = null;
/** Bigger changes (new classes, the curriculum seeded): rebuild the whole catalog a moment later. */
export function catalogDirty() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { timer = null; void rebuildCatalog().catch((e) => console.warn('Catalog not rebuilt', e)); }, 1500);
}
// Closing the tab straight after a change: rebuild now rather than wait for the next visit.
if (typeof window !== 'undefined') window.addEventListener('pagehide', () => { if (timer) { clearTimeout(timer); timer = null; void rebuildCatalog().catch(() => undefined); } });

/** Teacher: read every collection once and write the catalog. */
export async function rebuildCatalog(): Promise<void> {
  const [{ listLessons }, { listAssessments }, { listAssignments }, { listUnits, listMaterials }, { listClasses }] = await Promise.all([
    import('./lessons'), import('./assessments'), import('./assignments'), import('./units'), import('./classes'),
  ]);
  const [lessons, tests, assignments, units, materials, classes] = await Promise.all([listLessons(), listAssessments(), listAssignments(), listUnits(), listMaterials(true), listClasses(true)]);
  await setDoc(doc(db, 'catalog', 'public'), buildCatalog({ lessons, tests, assignments, units, materials, classes }));
}

/** Teacher page opened: make sure the catalog exists and is current (once per browser session). */
export async function ensureCatalog() {
  try { if (sessionStorage.getItem('wassce.catalog.checked')) return; sessionStorage.setItem('wassce.catalog.checked', '1'); } catch { /* ignore */ }
  await rebuildCatalog().catch((e) => console.warn('Catalog not rebuilt', e));
}
