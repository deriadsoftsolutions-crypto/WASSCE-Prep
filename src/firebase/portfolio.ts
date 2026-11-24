/**
 * Learner portfolio (Ministry portfolio assessment), one per STEM year.
 *
 * Firestore layout (see firestore.rules):
 *   learners/{uid}/portfolio/y{year}         meta: hidden ids, notes on automatic items, final reflection, status
 *   learners/{uid}/portfolioItems/{id}       items the learner adds (photos in R2 via /api/upload, assignment "portfolio")
 *   learners/{uid}/portfolioReviews/{id}     teacher check-in comments
 *   learners/{uid}/portfolioMark/y{year}     the teacher's mark out of 40
 *   settings/portfolio                       due date per year, period label for the cover page
 * Automatic items are worked out from results each time, never copied (src/lib/portfolioCore.ts).
 */
import { addDoc, collection, collectionGroup, deleteDoc, doc, getDoc, getDocs, setDoc, Timestamp } from 'firebase/firestore';
import { db } from './app';
import { deleteFile, listAssignments, type Assignment, type Feedback, type Submission } from './assignments';
import { listAssessments, type Attempt as TestAttempt, type Result } from './assessments';

const ms = (t: unknown): number => (t instanceof Timestamp ? t.toMillis() : typeof t === 'number' ? t : 0);
import { emptyMeta, markTotal, type BuildInput, type PItem, type PMeta, type SectionId, type Year } from '../lib/portfolioCore';

export type StoredItem = Omit<PItem, 'auto' | 'hidden'> & { year: number; createdAt: number };
export interface PMark { scores: Partial<Record<SectionId, number>>; total: number; max: 40; comment: string; markedAt: number }
export interface PReview { id: string; year: number; comment: string; at: number; teacherName: string }
export interface PSettings { dueAt: Record<'1' | '2' | '3', number | null>; period: string }
export interface YearInfo { year: Year; yearSetAt: number | null; prevYear: Year | null }

const metaRef = (uid: string, year: number) => doc(db, 'learners', uid, 'portfolio', `y${year}`);
const clean = <T>(x: T): T => JSON.parse(JSON.stringify(x));

export async function getMeta(uid: string, year: number): Promise<PMeta> {
  const s = await getDoc(metaRef(uid, year));
  return s.exists() ? { ...emptyMeta(), ...(s.data() as Partial<PMeta>) } : emptyMeta();
}

/** Saves the whole meta (the rules check the status the learner sends). */
export async function saveMeta(uid: string, year: number, meta: PMeta): Promise<void> {
  await setDoc(metaRef(uid, year), clean({ ...meta, updatedAt: Date.now() }));
}

/** Teacher only: change the status (returned, marked) without touching the learner's text. */
export async function setStatus(uid: string, year: number, status: PMeta['status']): Promise<void> {
  await setDoc(metaRef(uid, year), { status, updatedAt: Date.now() }, { merge: true });
}

export async function listItems(uid: string): Promise<StoredItem[]> {
  const snap = await getDocs(collection(db, 'learners', uid, 'portfolioItems'));
  return snap.docs.map((d) => ({ ...(d.data() as StoredItem), id: d.id }));
}

export async function saveItem(uid: string, item: Omit<StoredItem, 'id'> & { id?: string }): Promise<string> {
  const ref = item.id ? doc(db, 'learners', uid, 'portfolioItems', item.id) : doc(collection(db, 'learners', uid, 'portfolioItems'));
  const { id: _id, ...data } = item;
  await setDoc(ref, clean(data));
  return ref.id;
}

export async function deleteItem(uid: string, item: StoredItem): Promise<void> {
  await deleteDoc(doc(db, 'learners', uid, 'portfolioItems', item.id));
  await Promise.all(item.files.map((f) => deleteFile(f.key).catch(() => undefined)));
}

export async function listReviews(uid: string, year: number): Promise<PReview[]> {
  const snap = await getDocs(collection(db, 'learners', uid, 'portfolioReviews'));
  return snap.docs.map((d) => ({ ...(d.data() as PReview), id: d.id })).filter((r) => r.year === year).sort((a, b) => b.at - a.at);
}

export async function addReview(uid: string, year: number, comment: string, teacherName: string): Promise<void> {
  await addDoc(collection(db, 'learners', uid, 'portfolioReviews'), { year, comment, at: Date.now(), teacherName });
}

export async function getMark(uid: string, year: number): Promise<PMark | null> {
  const s = await getDoc(doc(db, 'learners', uid, 'portfolioMark', `y${year}`));
  return s.exists() ? (s.data() as PMark) : null;
}

/** Saves the mark (total recomputed, out of 40) and sets the portfolio's status to marked. */
export async function saveMark(uid: string, year: number, m: Omit<PMark, 'total' | 'max' | 'markedAt'>): Promise<PMark> {
  const mark: PMark = { scores: m.scores, comment: m.comment, total: markTotal(m.scores), max: 40, markedAt: Date.now() };
  await setDoc(doc(db, 'learners', uid, 'portfolioMark', `y${year}`), clean(mark));
  await setStatus(uid, year, 'marked');
  return mark;
}

export async function getPortfolioSettings(): Promise<PSettings> {
  const s = await getDoc(doc(db, 'settings', 'portfolio')).catch(() => null);
  const d = (s?.exists() ? s.data() : {}) as Partial<PSettings>;
  return { dueAt: { '1': null, '2': null, '3': null, ...(d.dueAt ?? {}) }, period: d.period ?? '' };
}

export async function savePortfolioSettings(p: PSettings): Promise<void> {
  await setDoc(doc(db, 'settings', 'portfolio'), clean(p));
}

/** Remember when a learner changed year, so earlier results stay in the earlier year's portfolio. */
export async function recordYearChange(uid: string, from: Year): Promise<void> {
  await setDoc(doc(db, 'learners', uid), { prevYear: from, yearSetAt: Date.now() }, { merge: true });
}

export async function yearInfo(uid: string): Promise<YearInfo> {
  const s = await getDoc(doc(db, 'learners', uid));
  const d = (s.exists() ? s.data() : {}) as { year?: Year; yearSetAt?: number; prevYear?: Year };
  return { year: d.year ?? 1, yearSetAt: d.yearSetAt ?? null, prevYear: d.prevYear && d.prevYear !== d.year ? d.prevYear : null };
}

/** Results before the year change belong to the previous year. */
export const yearOfFn = (y: YearInfo) => (ts: number): Year => (y.prevYear && y.yearSetAt && ts < y.yearSetAt ? y.prevYear : y.year);

/** Everything buildPortfolio() needs for one learner and year. Works for the learner and for teachers. */
export async function loadBuildInput(uid: string, year: Year, info: YearInfo): Promise<BuildInput> {
  const sub = (name: string) => getDocs(collection(db, 'learners', uid, name)).then((s) => s.docs.map((d) => ({ ...d.data(), id: d.id })));
  const [attempts, subs, feedback, results, testAttempts, assignments, tests, items, meta] = await Promise.all([
    sub('attempts'), sub('submissions'), sub('feedback'), sub('assessmentResults'), sub('assessmentAttempts'),
    listAssignments().catch(() => [] as Assignment[]), listAssessments().catch(() => []), listItems(uid), getMeta(uid, year),
  ]);
  const fb = new Map((feedback as unknown as Feedback[]).map((f) => [f.assignmentId, f]));
  const asg = new Map(assignments.map((a) => [a.id, a]));
  const tst = new Map(tests.map((t) => [t.id, t]));
  const res = new Map((results as unknown as (Result & { id: string })[]).map((x) => [x.id, x]));
  return {
    year, yearOf: yearOfFn(info), meta, items,
    attempts: (attempts as unknown as BuildInput['attempts']),
    submissions: (subs as unknown as Submission[]).map((s) => {
      const a = asg.get(s.assignmentId);
      const f = fb.get(s.assignmentId);
      return {
        assignmentId: s.assignmentId, title: a?.title ?? 'Assignment', portfolioSection: a?.portfolioSection,
        submittedAt: s.submittedAt, files: s.files ?? [], text: s.text ?? '',
        mark: f ? { mark: f.mark, maxMarks: f.maxMarks, comment: f.comment } : undefined,
      };
    }),
    testResults: (testAttempts as unknown as (TestAttempt & { id: string })[]).map((a) => {
      const t = tst.get(a.id);
      const r = res.get(a.id);
      return {
        assessmentId: a.id, title: t?.title ?? 'Test', portfolioSection: t?.portfolioSection, submittedAt: ms(a.submittedAt),
        result: r ? { total: r.total, max: r.max, comment: r.comment, releasedAt: r.releasedAt } : undefined,
      };
    }),
  };
}

/** Teacher list: every learner's portfolio status, mark and item count. */
export async function allPortfolioSummaries(): Promise<{ metas: (PMeta & { uid: string; year: number })[]; marks: (PMark & { uid: string; year: number })[]; items: (StoredItem & { uid: string })[] }> {
  const [m, k, i] = await Promise.all([getDocs(collectionGroup(db, 'portfolio')), getDocs(collectionGroup(db, 'portfolioMark')), getDocs(collectionGroup(db, 'portfolioItems'))]);
  const owner = (path: string) => path.split('/')[1];
  return {
    metas: m.docs.map((d) => ({ ...emptyMeta(), ...(d.data() as PMeta), uid: owner(d.ref.path), year: Number(d.id.slice(1)) })),
    marks: k.docs.map((d) => ({ ...(d.data() as PMark), uid: owner(d.ref.path), year: Number(d.id.slice(1)) })),
    items: i.docs.map((d) => ({ ...(d.data() as StoredItem), id: d.id, uid: owner(d.ref.path) })),
  };
}
