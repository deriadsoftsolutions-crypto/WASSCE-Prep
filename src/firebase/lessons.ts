/**
 * Lessons written by the teacher.
 *   lessons/{id}   { title, topicId, classKey, className, summary, blocks, published, createdAt, updatedAt }
 * Learners mark a lesson finished through the storage adapter (attempt kind 'lesson', item "lesson:<id>"),
 * so it appears in the teacher's results and CSV like everything else.
 */
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { auth, db } from './app';
import { isForMe, type Me } from '../lib/audience';

export type Block =
  | { type: 'text'; md: string }
  | { type: 'image'; url: string; caption?: string; alt?: string }
  | { type: 'video'; youtubeId: string; caption?: string }
  | { type: 'activity'; activityId: string; topicId: number }
  | { type: 'check'; question: string; options: string[]; correct: number; explanation?: string }
  | { type: 'link'; url: string; label: string };

export interface Lesson {
  id: string;
  title: string;
  /** WASSCE practice topic 1 to 10, or 0 for none */
  topicId: number;
  /** STEM year 1 to 3, or 0 for every year */
  year?: number;
  /** Curriculum unit id (units/{id}), or '' */
  unitId?: string;
  classKey: string;
  className: string;
  /** Who it is for: class ids and 'year:N' tokens; empty = all classes (lib/audience). */
  classIds?: string[];
  summary: string;
  blocks: Block[];
  published: boolean;
  createdAt: number;
  updatedAt: number;
}

export async function listLessons(): Promise<Lesson[]> {
  const snap = await getDocs(collection(db, 'lessons'));
  return snap.docs.map((d) => ({ ...(d.data() as Lesson), id: d.id }))
    .sort((a, b) => a.topicId - b.topicId || a.createdAt - b.createdAt);
}

export async function getLesson(id: string): Promise<Lesson | null> {
  const s = await getDoc(doc(db, 'lessons', id));
  return s.exists() ? { ...(s.data() as Lesson), id: s.id } : null;
}

/** Published lessons for this learner: set for their class (or all classes) and for their STEM year. `all` = every published lesson (teacher preview). */
export async function lessonsFor(me: Me, all = false): Promise<Lesson[]> {
  return (await listLessons()).filter((l) => l.published && (all || (isForMe(l, me) && (!l.year || !me.year || l.year === me.year))));
}

export async function saveLesson(l: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: number }): Promise<string> {
  const ref = l.id ? doc(db, 'lessons', l.id) : doc(collection(db, 'lessons'));
  const data: Omit<Lesson, 'id'> = {
    title: l.title, topicId: l.topicId, year: l.year ?? 0, unitId: l.unitId ?? '', classKey: l.classKey, className: l.className, classIds: l.classIds ?? (l.classKey ? [l.classKey] : []), summary: l.summary,
    blocks: JSON.parse(JSON.stringify(l.blocks)), published: l.published,
    createdAt: l.createdAt ?? Date.now(), updatedAt: Date.now(),
  };
  await setDoc(ref, data);
  return ref.id;
}

export async function deleteLesson(id: string) {
  await deleteDoc(doc(db, 'lessons', id));
}

/** "https://youtu.be/abc", "https://www.youtube.com/watch?v=abc", or just the id -> "abc" */
export function youtubeId(input: string): string | null {
  const s = input.trim();
  const m = /(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/.exec(s) ?? /^([A-Za-z0-9_-]{11})$/.exec(s);
  return m ? m[1] : null;
}

/** Teacher: upload a lesson image (shrunk on the device first) and return its address. */
export async function uploadLessonImage(file: File): Promise<string> {
  const { shrinkImage } = await import('./assignments');
  const small = await shrinkImage(file, 1600, 0.82);
  const t = await auth.currentUser?.getIdToken();
  if (!t) throw new Error('Please sign in again.');
  const res = await fetch(`/api/lesson-upload?name=${encodeURIComponent(small.name)}`, {
    method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': small.type }, body: small,
  });
  const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !body.url) throw new Error(body.error || `Upload failed (${res.status}).`);
  return body.url;
}
