/**
 * Counting Firestore reads. The free plan allows 50,000 document reads a day for the whole school,
 * so every learner page should cost as few as possible. These wrappers behave exactly like
 * getDoc / getDocs and count what the server would bill: one read per document returned,
 * and one for a query that returns nothing. Answers served from the on-device cache are free.
 * In emulator builds the running total is on window.__fsReads (used by the read-budget test).
 */
import {
  getDoc as fsGetDoc, getDocs as fsGetDocs, type DocumentData, type DocumentReference, type DocumentSnapshot,
  type Query, type QuerySnapshot,
} from 'firebase/firestore';

const counter = { total: 0, byPath: {} as Record<string, number> };
export const readsSoFar = () => counter.total;

export function tally(path: string, n: number) {
  counter.total += n;
  const k = path.split('/').filter((_, i) => i % 2 === 0).join('/') || path; // learners/x/submissions -> learners/submissions
  counter.byPath[k] = (counter.byPath[k] ?? 0) + n;
}
if (import.meta.env.VITE_FIREBASE_EMULATOR === '1') (globalThis as unknown as { __fsReads: typeof counter }).__fsReads = counter;

const pathOf = (q: Query<DocumentData> | DocumentReference<DocumentData>): string => {
  const x = q as unknown as { path?: string; _query?: { path?: { segments?: string[] }; collectionGroup?: string } };
  if (typeof x.path === 'string') return x.path;
  return x._query?.collectionGroup ?? x._query?.path?.segments?.join('/') ?? 'query';
};

export async function getDoc<T extends DocumentData>(ref: DocumentReference<T>): Promise<DocumentSnapshot<T>> {
  const s = await fsGetDoc(ref);
  if (!s.metadata.fromCache) tally(ref.path, 1);
  return s;
}

export async function getDocs<T extends DocumentData>(q: Query<T>): Promise<QuerySnapshot<T>> {
  const s = await fsGetDocs(q);
  if (!s.metadata.fromCache) tally(pathOf(q as unknown as Query<DocumentData>), Math.max(1, s.size));
  return s;
}
