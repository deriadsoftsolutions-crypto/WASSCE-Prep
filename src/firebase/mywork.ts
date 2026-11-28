/**
 * A learner's own work (hand-ins, marks, test starts, answers and results) for list pages
 * (Classwork, Home, the unit lesson player), at the lowest read cost:
 *
 * - kept on the device, so lists show straight away;
 * - brought up to date by asking only for what changed since the newest record already kept
 *   (five small queries: about five reads, however much work the learner has done);
 * - fully re-read every few hours, which also picks up anything the teacher deleted (a retake).
 *
 * The assignment and test pages still read their own records directly, so what a learner acts on is exact.
 */
import { collection, query, Timestamp, where, type DocumentData } from 'firebase/firestore';
import { auth, db } from './app';
import { getDocs } from './reads';
import type { Feedback, Submission } from './assignments';
import type { Attempt, Result } from './assessments';

export interface MyWork {
  submissions: Record<string, Submission>;
  feedback: Record<string, Feedback>;
  starts: Record<string, number>;
  attempts: Record<string, Attempt>;
  results: Record<string, Result>;
}

/** Each kind of record, and the field that changes whenever the record is written. */
const PARTS = [
  { part: 'submissions', path: 'submissions', field: 'submittedAt', serverTime: false },
  { part: 'feedback', path: 'feedback', field: 'markedAt', serverTime: false },
  { part: 'starts', path: 'assessmentStarts', field: 'startedAt', serverTime: true },
  { part: 'attempts', path: 'assessmentAttempts', field: 'submittedAt', serverTime: true },
  { part: 'results', path: 'assessmentResults', field: 'releasedAt', serverTime: false },
] as const;

const FULL_EVERY_MS = 6 * 3600_000; // full re-read (catches deletions such as a retake)
const FRESH_MS = 2 * 60_000; // within this, use what we have without asking the server
const ms = (v: unknown): number => (v instanceof Timestamp ? v.toMillis() : typeof v === 'number' ? v : 0);

interface Kept { uid: string; fullAt: number; at: number; marks: Record<string, number>; work: MyWork }
const key = (uid: string) => `wassce.mywork.v1.${uid}`;
const empty = (): MyWork => ({ submissions: {}, feedback: {}, starts: {}, attempts: {}, results: {} });
let memo: Kept | null = null;
let inflight: Promise<MyWork> | null = null;

function load(uid: string): Kept | null {
  if (memo?.uid === uid) return memo;
  try { const k = JSON.parse(localStorage.getItem(key(uid)) ?? 'null') as Kept | null; return k?.uid === uid ? k : null; } catch { return null; }
}
function save(k: Kept) {
  memo = k;
  try { localStorage.setItem(key(k.uid), JSON.stringify(k)); } catch { /* storage full: memory only */ }
}

/** Convert a stored record to plain numbers for the times (what the pages expect). */
function plain(part: string, d: DocumentData): unknown {
  if (part === 'starts') return ms(d.startedAt);
  if (part === 'attempts') return { ...d, startedAt: ms(d.startedAt), submittedAt: ms(d.submittedAt) };
  return d;
}

export async function myWork(opts: { fresh?: boolean } = {}): Promise<MyWork> {
  const uid = auth.currentUser?.uid;
  if (!uid) return empty();
  const kept = load(uid);
  if (kept && !opts.fresh && Date.now() - kept.at < FRESH_MS) { memo = kept; return kept.work; }
  if (inflight) return inflight;
  inflight = (async () => {
    const full = !kept || Date.now() - kept.fullAt > FULL_EVERY_MS;
    const base: Kept = full ? { uid, fullAt: Date.now(), at: Date.now(), marks: {}, work: empty() } : { ...kept!, at: Date.now(), work: structuredClone(kept!.work) };
    try {
      await Promise.all(PARTS.map(async (p) => {
        const col = collection(db, 'learners', uid, p.path);
        const mark = base.marks[p.part];
        // ">=" the newest time already kept: the newest record comes back once more (one read), nothing is missed.
        const q = full || !mark ? col : query(col, where(p.field, '>=', p.serverTime ? Timestamp.fromMillis(mark) : mark));
        const snap = await getDocs(q);
        const bag = base.work[p.part] as Record<string, unknown>;
        let newest = mark ?? 0;
        snap.forEach((d) => { bag[d.id] = plain(p.part, d.data()); newest = Math.max(newest, ms(d.data()[p.field])); });
        if (newest) base.marks[p.part] = newest;
      }));
      save(base);
      return base.work;
    } catch {
      return kept?.work ?? empty(); // offline: what this device has
    } finally { inflight = null; }
  })();
  return inflight;
}

/** The learner just handed in, started or submitted something: ask the server next time (only the change is read). */
export function myWorkChanged() {
  if (memo) memo = { ...memo, at: 0 };
  const uid = auth.currentUser?.uid;
  if (uid) { const k = load(uid); if (k) save({ ...k, at: 0 }); }
}
