/**
 * The school's fixed classes, managed by the teacher (Teacher page, Classes).
 *   classes/{id}   { name, year, retired, aliases, createdAt }
 * The id is the class code used in learner logins (see lib/audience classIdFor) and never changes.
 * `aliases` are older login codes of learners who were moved into this class, so they can still sign in.
 * Anyone can read the list (sign-up needs it before signing in); only teachers can change it.
 */
import {
  arrayUnion, collection, doc, setDoc, updateDoc, writeBatch,
} from 'firebase/firestore';
import { getDocs } from './reads';
import { db } from './app';
import { classIdFor, sortClasses, type ClassInfo } from '../lib/audience';
import type { LearnerInfo } from './assignments';

export type SchoolClass = ClassInfo & { createdAt: number };

const CACHE = 'wassce.classes.v1';
let memo: { at: number; list: SchoolClass[] } | null = null;

export function cachedClasses(): SchoolClass[] {
  if (memo) return memo.list;
  try { return JSON.parse(localStorage.getItem(CACHE) ?? '[]') as SchoolClass[]; } catch { return []; }
}

/** All classes (retired ones too), sorted by year and name. Falls back to the last list seen on this device. */
export async function listClasses(fresh = false): Promise<SchoolClass[]> {
  if (!fresh && memo && Date.now() - memo.at < 60_000) return memo.list;
  try {
    const snap = await getDocs(collection(db, 'classes'));
    const list = sortClasses(snap.docs.map((d) => {
      const x = d.data() as Partial<SchoolClass>;
      return { id: d.id, name: x.name ?? d.id, year: (x.year ?? 1) as 1 | 2 | 3, retired: !!x.retired, aliases: x.aliases ?? [], createdAt: x.createdAt ?? 0 };
    }));
    memo = { at: Date.now(), list };
    try { localStorage.setItem(CACHE, JSON.stringify(list)); } catch { /* ignore */ }
    return list;
  } catch (e) {
    const c = cachedClasses();
    if (c.length) return c;
    throw e;
  }
}
export const forgetClasses = () => { memo = null; void import('./catalog').then((c) => c.catalogDirty()); };

/** Teacher: add a class. The id comes from the name and must not clash with another class. */
export async function addClass(name: string, year: 1 | 2 | 3): Promise<SchoolClass> {
  const clean = name.trim().replace(/\s+/g, ' ');
  const id = classIdFor(clean);
  if (!id) throw new Error('Type a class name with letters or numbers, for example 2 Sci A.');
  const all = await listClasses(true);
  const clash = all.find((c) => c.id === id || c.name.toLowerCase() === clean.toLowerCase());
  if (clash) throw new Error(`"${clean}" is too close to the class "${clash.name}". Use a different name.`);
  const c: SchoolClass = { id, name: clean, year, retired: false, aliases: [], createdAt: Date.now() };
  await setDoc(doc(db, 'classes', id), { name: c.name, year, retired: false, aliases: [], createdAt: c.createdAt });
  forgetClasses();
  return c;
}

/**
 * Teacher: rename a class or change its year (for example at the start of a new school year,
 * "2 Sci A" in STEM 2 becomes "3 Sci A" in STEM 3). Learners in the class follow automatically
 * and keep signing in as before.
 */
export async function updateClass(c: SchoolClass, name: string, year: 1 | 2 | 3, learners: LearnerInfo[]): Promise<void> {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (!clean) throw new Error('Type a class name.');
  const all = await listClasses(true);
  const clash = all.find((x) => x.id !== c.id && x.name.toLowerCase() === clean.toLowerCase());
  if (clash) throw new Error(`There is already a class called "${clash.name}".`);
  const batch = writeBatch(db);
  batch.update(doc(db, 'classes', c.id), { name: clean, year });
  for (const l of learners.filter((x) => x.classId === c.id)) {
    batch.update(doc(db, 'learners', l.id), { className: clean, year, ...(l.year && l.year !== year ? { prevYear: l.year, yearSetAt: Date.now() } : {}) });
  }
  await batch.commit();
  forgetClasses();
}

/** Teacher: hide a class from sign-up (its learners and work stay). */
export async function setRetired(c: SchoolClass, retired: boolean): Promise<void> {
  await updateDoc(doc(db, 'classes', c.id), { retired });
  forgetClasses();
}

/** The login code a learner signed up with (never changes, even if they move class). */
export const loginKeyOf = (l: Pick<LearnerInfo, 'loginKey' | 'classId' | 'className'>) => l.loginKey || l.classId || classIdFor(l.className);

/**
 * Teacher: put a learner in a class (matching an older account, or moving them).
 * Their login code is kept; if it differs from the class id it is added to the class's aliases,
 * so the learner signs in by choosing their new class.
 */
export async function moveLearner(l: LearnerInfo, c: SchoolClass): Promise<void> {
  const loginKey = loginKeyOf(l);
  const batch = writeBatch(db);
  batch.update(doc(db, 'learners', l.id), {
    classId: c.id, className: c.name, year: c.year, loginKey,
    ...(l.year && l.year !== c.year ? { prevYear: l.year, yearSetAt: Date.now() } : {}),
  });
  if (loginKey !== c.id) batch.update(doc(db, 'classes', c.id), { aliases: arrayUnion(loginKey) });
  await batch.commit();
  forgetClasses();
}

/** Learners whose typed class matches no fixed class (older accounts), and the class they most likely belong to. */
export function unmatched(learners: LearnerInfo[], classes: SchoolClass[]): { l: LearnerInfo; guess: SchoolClass | null }[] {
  return learners.filter((l) => !l.classId || !classes.some((c) => c.id === l.classId)).map((l) => {
    const k = classIdFor(l.className);
    return { l, guess: classes.find((c) => !c.retired && (c.id === k || (c.aliases ?? []).includes(k))) ?? null };
  });
}

/** Signed-in pages: class names from the catalog (no extra reads); falls back to the classes collection. */
export async function classNames(): Promise<ClassInfo[]> {
  const { getCatalog } = await import('./catalog');
  return (await getCatalog())?.classes ?? listClasses();
}
