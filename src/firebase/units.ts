/**
 * Curriculum units (one per NaCCA sub-strand per year) and their materials.
 *   units/{id}       { code, year, strand, subStrand, title, summary, outcomes, indicators, wassceTopics, section, order, published }
 *   materials/{id}   { unitId, year, title, description, kind, url, fileName, mime, size, audience, published, order, createdAt }
 * Materials marked audience 'teachers' (e.g. teacher versions of the manuals) are hidden from learners by the rules.
 */
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where, writeBatch } from 'firebase/firestore';
import { auth, db } from './app';
import curriculum from '../data/curriculum.json';

export const STRANDS = curriculum.strands as Record<string, string>;
export type Year = 1 | 2 | 3;

export interface Unit {
  id: string;
  code: string;
  year: Year;
  strand: number;
  subStrand: string;
  title: string;
  summary: string;
  outcomes: string[];
  indicators: string[];
  wassceTopics: number[];
  /** Ministry teacher-manual section number, where known */
  section: number | null;
  order: number;
  published: boolean;
}

export type MaterialKind = 'file' | 'video' | 'youtube' | 'link';
export interface Material {
  id: string;
  /** '' = a resource for the whole year (e.g. a full learner book) */
  unitId: string;
  year: Year;
  title: string;
  description: string;
  kind: MaterialKind;
  url: string;
  fileName?: string;
  mime?: string;
  size?: number;
  /** For a section of a book: open the PDF at this page. */
  page?: number;
  audience: 'learners' | 'teachers';
  published: boolean;
  order: number;
  createdAt: number;
}

export const unitIdFor = (code: string) => `u${code.replace(/\./g, '-')}`;

export async function listUnits(): Promise<Unit[]> {
  const snap = await getDocs(collection(db, 'units'));
  return snap.docs.map((d) => ({ ...(d.data() as Unit), id: d.id })).sort((a, b) => a.year - b.year || a.order - b.order);
}

export async function getUnit(id: string): Promise<Unit | null> {
  const s = await getDoc(doc(db, 'units', id));
  return s.exists() ? { ...(s.data() as Unit), id: s.id } : null;
}

export async function saveUnit(u: Unit): Promise<void> {
  const { id, ...data } = u;
  await setDoc(doc(db, 'units', id), JSON.parse(JSON.stringify(data)));
}

/** Teacher: create the NaCCA units as unpublished drafts. Existing units are left alone. */
export async function seedUnits(): Promise<number> {
  const existing = new Set((await listUnits()).map((u) => u.id));
  const batch = writeBatch(db);
  let n = 0;
  (curriculum.units as Omit<Unit, 'id' | 'order' | 'published'>[]).forEach((u, i) => {
    const id = unitIdFor(u.code);
    if (existing.has(id)) return;
    batch.set(doc(db, 'units', id), { ...u, order: i, published: false });
    n++;
  });
  if (n) await batch.commit();
  return n;
}

/* ---------- Materials ---------- */

export async function listMaterials(teacher: boolean): Promise<Material[]> {
  // Learners may only list learner materials: the query must say so for the security rules to allow it.
  const q = teacher ? collection(db, 'materials') : query(collection(db, 'materials'), where('audience', '==', 'learners'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as Material), id: d.id }))
    .filter((m) => teacher || m.published)
    .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
}

export async function saveMaterial(m: Omit<Material, 'id'> & { id?: string }): Promise<string> {
  const ref = m.id ? doc(db, 'materials', m.id) : doc(collection(db, 'materials'));
  const { id: _omit, ...data } = m;
  void _omit;
  await setDoc(ref, JSON.parse(JSON.stringify(data)));
  return ref.id;
}

export async function deleteMaterial(id: string) {
  await deleteDoc(doc(db, 'materials', id));
}

/** Teacher: upload a notes file, slides or a short video. Returns its address. */
export async function uploadMaterialFile(file: File, onProgress?: (f: number) => void): Promise<{ url: string; size: number; mime: string }> {
  const t = await auth.currentUser?.getIdToken();
  if (!t) throw new Error('Please sign in again.');
  const type = file.type || guessType(file.name);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/lesson-upload?name=${encodeURIComponent(file.name)}`);
    xhr.setRequestHeader('Authorization', `Bearer ${t}`);
    xhr.setRequestHeader('Content-Type', type);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(e.loaded / e.total); };
    xhr.onload = () => {
      let body: { url?: string; error?: string } = {};
      try { body = JSON.parse(xhr.responseText); } catch { /* not JSON */ }
      if (xhr.status >= 200 && xhr.status < 300 && body.url) resolve({ url: body.url, size: file.size, mime: type });
      else reject(new Error(body.error || `Upload failed (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error('Upload failed. Check your internet connection.'));
    xhr.send(file);
  });
}

function guessType(name: string): string {
  const ext = name.toLowerCase().split('.').pop() ?? '';
  return ({
    pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain', mp4: 'video/mp4', webm: 'video/webm', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  } as Record<string, string>)[ext] ?? 'application/octet-stream';
}

export function materialKindLabel(m: Material): string {
  if (m.kind === 'youtube') return 'Video (YouTube)';
  if (m.kind === 'video') return 'Video';
  if (m.kind === 'link') return 'Website';
  const ext = (m.fileName ?? '').toLowerCase().split('.').pop();
  return ext === 'pdf' ? 'PDF' : ext === 'ppt' || ext === 'pptx' ? 'Slides' : ext === 'doc' || ext === 'docx' ? 'Word' : ext?.toUpperCase() || 'File';
}

/** Address to open a material at, including the page for a book section. */
export const materialHref = (m: Material) => (m.page ? `${m.url}#page=${m.page}` : m.url);
