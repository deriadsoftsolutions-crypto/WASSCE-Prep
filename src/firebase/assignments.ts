/**
 * Assignments: the teacher sets work, learners submit text and/or files, the teacher marks it.
 *
 * Firestore layout (see firestore.rules):
 *   assignments/{id}                          set by the teacher, readable by everyone signed in
 *   learners/{uid}/submissions/{assignmentId} written by the learner, readable by learner + teacher
 *   learners/{uid}/feedback/{assignmentId}    written by the teacher, readable by learner + teacher
 * Files live in Cloudflare R2 and are reached through /api/upload and /api/file.
 */
import {
  collection, collectionGroup, deleteDoc, doc, getDoc, getDocs, setDoc,
} from 'firebase/firestore';
import { auth, db } from './app';
import { isForMe, splitForMe, type Me } from '../lib/audience';

export interface Assignment {
  id: string;
  title: string;
  instructions: string;
  /** Normalised class key (e.g. "2scia"), or "" for every class. Older items only; see classIds. */
  classKey: string;
  /** Who it is for: class ids and 'year:N' tokens; empty = all classes (lib/audience). */
  classIds?: string[];
  /** Class name as the teacher typed it, for display. */
  className: string;
  /** Due date as milliseconds, or null for no due date. */
  dueAt: number | null;
  maxMarks: number;
  allowText: boolean;
  allowFiles: boolean;
  /** Where it goes in the learner's portfolio (Ministry sections). Missing = assignments. */
  portfolioSection?: 'assignments' | 'projects';
  published: boolean;
  createdAt: number;
}

export interface SubmittedFile { key: string; name: string; size: number; type: string }

export interface Submission {
  assignmentId: string;
  learnerId: string;
  learnerName: string;
  className: string;
  text: string;
  files: SubmittedFile[];
  submittedAt: number;
  late: boolean;
  /** Handed in by a learner who is not in the class(es) the assignment was set for. */
  outsideClass?: boolean;
}

export interface Feedback {
  assignmentId: string;
  learnerId: string;
  mark: number;
  maxMarks: number;
  comment: string;
  markedAt: number;
}

export const classKey = (c: string) => c.toLowerCase().replace(/[^a-z0-9]/g, '');

/* ---------- Assignments ---------- */

export async function listAssignments(): Promise<Assignment[]> {
  const snap = await getDocs(collection(db, 'assignments'));
  return snap.docs.map((d) => ({ ...(d.data() as Assignment), id: d.id })).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getAssignment(id: string): Promise<Assignment | null> {
  const s = await getDoc(doc(db, 'assignments', id));
  return s.exists() ? { ...(s.data() as Assignment), id: s.id } : null;
}

/** Published assignments, split into those set for this learner's class and those for other classes. */
export async function assignmentsFor(me: Me): Promise<{ mine: Assignment[]; others: Assignment[] }> {
  return splitForMe((await listAssignments()).filter((a) => a.published), me);
}

export async function saveAssignment(a: Omit<Assignment, 'id' | 'createdAt'> & { id?: string; createdAt?: number }): Promise<string> {
  const ref = a.id ? doc(db, 'assignments', a.id) : doc(collection(db, 'assignments'));
  const data: Omit<Assignment, 'id'> = {
    title: a.title, instructions: a.instructions, classKey: a.classKey, className: a.className, classIds: a.classIds ?? (a.classKey ? [a.classKey] : []), dueAt: a.dueAt,
    maxMarks: a.maxMarks, allowText: a.allowText, allowFiles: a.allowFiles, portfolioSection: a.portfolioSection ?? 'assignments', published: a.published,
    createdAt: a.createdAt ?? Date.now(),
  };
  await setDoc(ref, data);
  return ref.id;
}

export async function deleteAssignment(id: string) {
  await deleteDoc(doc(db, 'assignments', id));
}

/* ---------- Submissions and feedback ---------- */

export async function mySubmission(assignmentId: string): Promise<Submission | null> {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  const s = await getDoc(doc(db, 'learners', uid, 'submissions', assignmentId));
  return s.exists() ? (s.data() as Submission) : null;
}

export async function myFeedback(assignmentId: string): Promise<Feedback | null> {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  const s = await getDoc(doc(db, 'learners', uid, 'feedback', assignmentId));
  return s.exists() ? (s.data() as Feedback) : null;
}

export async function submit(s: Submission): Promise<void> {
  await setDoc(doc(db, 'learners', s.learnerId, 'submissions', s.assignmentId), JSON.parse(JSON.stringify(s)));
}

/** Teacher: every submission and every piece of feedback, grouped by assignment id. */
export async function allSubmissions(): Promise<{ subs: Submission[]; feedback: Feedback[] }> {
  const [s, f] = await Promise.all([getDocs(collectionGroup(db, 'submissions')), getDocs(collectionGroup(db, 'feedback'))]);
  return { subs: s.docs.map((d) => d.data() as Submission), feedback: f.docs.map((d) => d.data() as Feedback) };
}

export async function saveFeedback(fb: Feedback): Promise<void> {
  await setDoc(doc(db, 'learners', fb.learnerId, 'feedback', fb.assignmentId), fb);
}

export interface LearnerInfo { id: string; name: string; className: string; year?: number; classId?: string; loginKey?: string; prevYear?: number }

/** Teacher: every learner account (from learners/{uid} profiles). */
export async function listLearners(): Promise<LearnerInfo[]> {
  const snap = await getDocs(collection(db, 'learners'));
  return snap.docs
    .map((d) => {
      const x = d.data() as { name?: string; className?: string; year?: number; classId?: string; loginKey?: string; prevYear?: number };
      return { id: d.id, name: x.name ?? '', className: x.className ?? '', year: x.year, classId: x.classId, loginKey: x.loginKey, prevYear: x.prevYear };
    })
    .filter((x) => x.name)
    .sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }) || a.name.localeCompare(b.name));
}

/** Teacher: the classes learners have signed up with, for the class picker. */
export function classesOf(learners: LearnerInfo[]): string[] {
  const byKey = new Map<string, string>();
  for (const l of learners) {
    const c = l.className.trim();
    if (c && !byKey.has(classKey(c))) byKey.set(classKey(c), c);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/* ---------- Files (Cloudflare R2 through /api) ---------- */

async function token(): Promise<string> {
  const u = auth.currentUser;
  if (!u) throw new Error('Please sign in again.');
  return u.getIdToken();
}

/** Shrink large photos on the device before uploading (saves mobile data). */
export async function shrinkImage(file: File, maxSide = 1800, quality = 0.8): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 600 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.(png|webp|jpe?g)$/i, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

/** Upload with progress (XMLHttpRequest, because fetch cannot report upload progress). */
export async function uploadFile(assignmentId: string, file: File, onProgress?: (frac: number) => void): Promise<SubmittedFile> {
  const t = await token();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/upload?assignment=${encodeURIComponent(assignmentId)}&name=${encodeURIComponent(file.name)}`);
    xhr.setRequestHeader('Authorization', `Bearer ${t}`);
    // Python files arrive with many different types (or none); store code and text as plain text so it can be read in the browser.
    xhr.setRequestHeader('Content-Type', /\.(py|txt)$/i.test(file.name) ? 'text/plain' : file.type || 'application/octet-stream');
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(e.loaded / e.total); };
    xhr.onload = () => {
      let body: { error?: string } & Partial<SubmittedFile> = {};
      try { body = JSON.parse(xhr.responseText); } catch { /* not JSON */ }
      if (xhr.status >= 200 && xhr.status < 300 && body.key) resolve(body as SubmittedFile);
      else reject(new Error(body.error || `Upload failed (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error('Upload failed. Check your internet connection.'));
    xhr.send(file);
  });
}

export async function deleteFile(key: string): Promise<void> {
  const res = await fetch(`/api/file?key=${encodeURIComponent(key)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${await token()}` } });
  if (!res.ok && res.status !== 404) throw new Error('Could not remove the file.');
}

/** Open a stored file in a new tab (the request must carry the sign-in token, so we fetch it first). */
export async function openFile(f: SubmittedFile, download = false): Promise<void> {
  const win = download ? null : window.open('', '_blank');
  try {
    const res = await fetch(`/api/file?key=${encodeURIComponent(f.key)}`, { headers: { Authorization: `Bearer ${await token()}` } });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not open the file.');
    const url = URL.createObjectURL(await res.blob());
    if (win) win.location.href = url;
    else {
      const a = document.createElement('a');
      a.href = url; a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) {
    win?.close();
    throw e;
  }
}

/** A short text file that can be shown inline (Python code, program output, notes). */
export const isTextFile = (f: SubmittedFile) => /\.(py|txt)$/i.test(f.name) && f.size <= 200 * 1024;
export const isPythonFile = (f: SubmittedFile) => /\.py$/i.test(f.name);

/** Read a stored text file (the request carries the sign-in token). */
export async function fetchFileText(f: SubmittedFile): Promise<string> {
  const res = await fetch(`/api/file?key=${encodeURIComponent(f.key)}`, { headers: { Authorization: `Bearer ${await token()}` } });
  if (!res.ok) throw new Error('Could not open the file.');
  return res.text();
}

/**
 * Hand in code written on the Python practice page: saves it as a .py file (and the last output as a .txt file)
 * in the learner's submission for that assignment, replacing earlier copies with the same names and keeping
 * every other file and the typed answer.
 */
export async function handInCode(a: Assignment, learner: Me & { id: string; name: string }, fileName: string, code: string, output: string | null): Promise<Submission> {
  const existing = await mySubmission(a.id);
  const base = fileName.replace(/\.py$/i, '');
  const outName = `${base}_output.txt`;
  const kept = (existing?.files ?? []).filter((f) => f.name !== fileName && f.name !== outName);
  const replaced = (existing?.files ?? []).filter((f) => !kept.includes(f));
  if (kept.length + (output ? 2 : 1) > 5) throw new Error('This assignment already has 5 files. Remove one on the assignment page first.');
  const files = [...kept, await uploadFile(a.id, new File([code], fileName, { type: 'text/plain' }))];
  if (output) files.push(await uploadFile(a.id, new File([output], outName, { type: 'text/plain' })));
  const s: Submission = {
    assignmentId: a.id, learnerId: learner.id, learnerName: learner.name, className: learner.className,
    text: existing?.text ?? '', files, submittedAt: Date.now(), late: !!a.dueAt && Date.now() > a.dueAt, outsideClass: !isForMe(a, learner),
  };
  await submit(s);
  replaced.forEach((f) => void deleteFile(f.key).catch(() => undefined));
  return s;
}

export const fmtSize = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
