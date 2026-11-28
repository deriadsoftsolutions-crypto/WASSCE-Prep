/**
 * Teacher-made assessments (tests).
 *
 * Firestore layout (see firestore.rules):
 *   assessments/{id}                         settings (no questions, no answers), readable by everyone signed in
 *   assessments/{id}/content/questions       the questions, readable once the test opens
 *   assessments/{id}/content/key             answers, readable by teachers, and by a learner only after they submit
 *                                            (and only if the teacher chose to show results)
 *   learners/{uid}/assessmentStarts/{id}     { startedAt: server time } created when a learner starts
 *   learners/{uid}/assessmentAttempts/{id}   the learner's answers, created once at submission
 *   learners/{uid}/assessmentResults/{id}    marks released by the teacher
 *
 * Start and submit times come from Firestore's server clock, so a changed tablet clock cannot buy extra time.
 */
import {
  collection, collectionGroup, doc, getDoc, getDocs, serverTimestamp, setDoc, Timestamp, writeBatch,
} from 'firebase/firestore';
import { auth, db } from './app';
import { splitForMe, type Me } from '../lib/audience';
import { evaluate } from '../lib/mathparse';

export type QType = 'mcq' | 'number' | 'short';

/** What learners see. */
export interface Question {
  id: string;
  type: QType;
  text: string;
  /** mcq only */
  options?: string[];
  /** number only: unit shown next to the answer box */
  unit?: string;
  marks: number;
}

/** What only the teacher (and, after submitting, the learner) sees. */
export interface KeyEntry {
  /** mcq: index of the correct option */
  correct?: number;
  /** number: correct value and accepted relative tolerance (0.01 = 1%) */
  value?: number;
  tolerance?: number;
  /** short: model answer for the teacher */
  model?: string;
  explanation?: string;
}

export type ShowResults = 'immediately' | 'after-close' | 'teacher';

export interface Assessment {
  id: string;
  title: string;
  instructions: string;
  classKey: string;
  className: string;
  /** Who it is for: class ids and 'year:N' tokens; empty = all classes (lib/audience). */
  classIds?: string[];
  opensAt: number | null;
  closesAt: number | null;
  /** 0 = no time limit */
  timeLimitMin: number;
  showResults: ShowResults;
  /** Where it goes in the learner's portfolio (Ministry sections). Missing = tests. */
  portfolioSection?: 'tests' | 'semester';
  published: boolean;
  totalMarks: number;
  questionCount: number;
  createdAt: number;
}

export type Response = number | string | null;

export interface Attempt {
  assessmentId: string;
  learnerId: string;
  learnerName: string;
  className: string;
  responses: Record<string, Response>;
  startedAt: number;
  submittedAt: number;
  /** Taken by a learner who is not in the class(es) the test was set for. */
  outsideClass?: boolean;
}

export interface Result {
  assessmentId: string;
  learnerId: string;
  /** marks per question id */
  scores: Record<string, number>;
  total: number;
  max: number;
  comment: string;
  releasedAt: number;
}

const ms = (t: unknown): number | null => (t instanceof Timestamp ? t.toMillis() : typeof t === 'number' ? t : null);
const ts = (n: number | null) => (n == null ? null : Timestamp.fromMillis(n));

function fromDoc(id: string, d: Record<string, unknown>): Assessment {
  return {
    id,
    title: String(d.title ?? ''), instructions: String(d.instructions ?? ''),
    classKey: String(d.classKey ?? ''), className: String(d.className ?? ''),
    ...(Array.isArray(d.classIds) ? { classIds: d.classIds as string[] } : {}),
    opensAt: ms(d.opensAt), closesAt: ms(d.closesAt),
    timeLimitMin: Number(d.timeLimitMin ?? 0), showResults: (d.showResults as ShowResults) ?? 'immediately',
    portfolioSection: d.portfolioSection === 'semester' ? 'semester' : 'tests', published: !!d.published, totalMarks: Number(d.totalMarks ?? 0), questionCount: Number(d.questionCount ?? 0),
    createdAt: ms(d.createdAt) ?? 0,
  };
}

/* ---------- Marking (pure, used by both learner and teacher views) ---------- */

export function autoScore(q: Question, k: KeyEntry | undefined, r: Response): number | null {
  if (q.type === 'short' || !k) return null;
  if (r === null || r === undefined || r === '') return 0;
  if (q.type === 'mcq') return Number(r) === k.correct ? q.marks : 0;
  const v = typeof r === 'number' ? r : evaluate(String(r));
  const target = k.value ?? NaN;
  if (!isFinite(v) || !isFinite(target)) return 0;
  const tol = k.tolerance ?? 0.01;
  const ok = target === 0 ? Math.abs(v) < 1e-9 : Math.abs(v - target) <= Math.abs(target) * tol
    || Math.abs(v - Math.round(target * 100) / 100) < 1e-9 || Math.abs(v - Number(target.toPrecision(2))) < 1e-9;
  return ok ? q.marks : 0;
}

/* ---------- Status helpers ---------- */

export type Status = 'draft' | 'upcoming' | 'open' | 'closed';
export function statusOf(a: Assessment, now = Date.now()): Status {
  if (!a.published) return 'draft';
  if (a.opensAt && now < a.opensAt) return 'upcoming';
  if (a.closesAt && now > a.closesAt) return 'closed';
  return 'open';
}

/* ---------- Teacher ---------- */

export async function listAssessments(): Promise<Assessment[]> {
  const snap = await getDocs(collection(db, 'assessments'));
  return snap.docs.map((d) => fromDoc(d.id, d.data())).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getAssessment(id: string): Promise<Assessment | null> {
  const s = await getDoc(doc(db, 'assessments', id));
  return s.exists() ? fromDoc(s.id, s.data()) : null;
}

export async function getQuestions(id: string): Promise<Question[]> {
  const s = await getDoc(doc(db, 'assessments', id, 'content', 'questions'));
  return s.exists() ? ((s.data().questions ?? []) as Question[]) : [];
}

/** Null when the key is not (yet) visible to this user. */
export async function getKey(id: string): Promise<Record<string, KeyEntry> | null> {
  try {
    const s = await getDoc(doc(db, 'assessments', id, 'content', 'key'));
    return s.exists() ? ((s.data().answers ?? {}) as Record<string, KeyEntry>) : null;
  } catch {
    return null;
  }
}

export async function saveAssessment(
  a: Omit<Assessment, 'id' | 'createdAt' | 'totalMarks' | 'questionCount'> & { id?: string; createdAt?: number },
  questions: Question[],
  key: Record<string, KeyEntry>,
): Promise<string> {
  const ref = a.id ? doc(db, 'assessments', a.id) : doc(collection(db, 'assessments'));
  const batch = writeBatch(db);
  batch.set(ref, {
    title: a.title, instructions: a.instructions, classKey: a.classKey, className: a.className, classIds: a.classIds ?? (a.classKey ? [a.classKey] : []),
    opensAt: ts(a.opensAt), closesAt: ts(a.closesAt), timeLimitMin: Math.max(0, Math.round(a.timeLimitMin)),
    showResults: a.showResults, portfolioSection: a.portfolioSection ?? 'tests', published: a.published,
    totalMarks: questions.reduce((s, q) => s + q.marks, 0), questionCount: questions.length,
    createdAt: ts(a.createdAt ?? Date.now()),
  });
  batch.set(doc(db, 'assessments', ref.id, 'content', 'questions'), { questions: JSON.parse(JSON.stringify(questions)) });
  batch.set(doc(db, 'assessments', ref.id, 'content', 'key'), { answers: JSON.parse(JSON.stringify(key)) });
  await batch.commit();
  return ref.id;
}

export async function deleteAssessment(id: string) {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'assessments', id, 'content', 'questions'));
  batch.delete(doc(db, 'assessments', id, 'content', 'key'));
  batch.delete(doc(db, 'assessments', id));
  await batch.commit();
}

export async function allAttempts(): Promise<{ starts: { learnerId: string; assessmentId: string; startedAt: number }[]; attempts: Attempt[]; results: Result[] }> {
  const [s, a, r] = await Promise.all([
    getDocs(collectionGroup(db, 'assessmentStarts')), getDocs(collectionGroup(db, 'assessmentAttempts')), getDocs(collectionGroup(db, 'assessmentResults')),
  ]);
  return {
    starts: s.docs.map((d) => ({ learnerId: d.ref.parent.parent!.id, assessmentId: d.id, startedAt: ms(d.data().startedAt) ?? 0 })),
    attempts: a.docs.map((d) => { const x = d.data(); return { ...(x as Attempt), startedAt: ms(x.startedAt) ?? 0, submittedAt: ms(x.submittedAt) ?? 0 }; }),
    results: r.docs.map((d) => d.data() as Result),
  };
}

export async function releaseResult(r: Result) {
  await setDoc(doc(db, 'learners', r.learnerId, 'assessmentResults', r.assessmentId), r);
}

/** Let a learner take the test again (removes their start, answers and result). */
export async function allowRetake(learnerId: string, assessmentId: string) {
  const batch = writeBatch(db);
  for (const c of ['assessmentStarts', 'assessmentAttempts', 'assessmentResults']) batch.delete(doc(db, 'learners', learnerId, c, assessmentId));
  await batch.commit();
}

/* ---------- Learner ---------- */

/** Published tests, split into those set for this learner's class and those for other classes. */
export async function assessmentsFor(me: Me): Promise<{ mine: Assessment[]; others: Assessment[] }> {
  return splitForMe((await listAssessments()).filter((a) => a.published), me);
}

const uid = () => {
  const u = auth.currentUser?.uid;
  if (!u) throw new Error('Please sign in again.');
  return u;
};

export async function myStart(id: string): Promise<number | null> {
  const s = await getDoc(doc(db, 'learners', uid(), 'assessmentStarts', id));
  return s.exists() ? ms(s.data().startedAt) : null;
}

export async function myAttempt(id: string): Promise<Attempt | null> {
  const s = await getDoc(doc(db, 'learners', uid(), 'assessmentAttempts', id));
  if (!s.exists()) return null;
  const x = s.data();
  return { ...(x as Attempt), startedAt: ms(x.startedAt) ?? 0, submittedAt: ms(x.submittedAt) ?? 0 };
}

export async function myResult(id: string): Promise<Result | null> {
  const s = await getDoc(doc(db, 'learners', uid(), 'assessmentResults', id));
  return s.exists() ? (s.data() as Result) : null;
}

/** Record the start on the server (needs internet). Returns the server start time. */
export async function startAssessment(id: string): Promise<number> {
  const ref = doc(db, 'learners', uid(), 'assessmentStarts', id);
  await setDoc(ref, { startedAt: serverTimestamp() });
  const s = await getDoc(ref);
  return ms(s.data()?.startedAt) ?? Date.now();
}

export async function submitAttempt(a: { assessmentId: string; learnerName: string; className: string; responses: Record<string, Response>; startedAt: number; outsideClass?: boolean }) {
  const u = uid();
  await setDoc(doc(db, 'learners', u, 'assessmentAttempts', a.assessmentId), {
    assessmentId: a.assessmentId, learnerId: u, learnerName: a.learnerName, className: a.className, outsideClass: !!a.outsideClass,
    responses: JSON.parse(JSON.stringify(a.responses)), startedAt: Timestamp.fromMillis(a.startedAt), submittedAt: serverTimestamp(),
  });
}

