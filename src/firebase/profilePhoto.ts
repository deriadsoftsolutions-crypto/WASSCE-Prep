/**
 * Learner profile photos: learners/{uid}/profile/photo.
 * A learner can only set a pending photo (a small JPEG data URL); a teacher approves or rejects it.
 * Only the learner and teachers can read it (see firestore.rules).
 */
import {
  collectionGroup, doc, setDoc,
} from 'firebase/firestore';
import { getDoc, getDocs } from './reads';
import { db } from './app';
import { cropBox } from '../lib/avatar';

export interface PhotoDoc { pending: string | null; pendingAt: number | null; approved: string | null; approvedAt: number | null; rejectedReason: string | null }
const EMPTY: PhotoDoc = { pending: null, pendingAt: null, approved: null, approvedAt: null, rejectedReason: null };
const ref = (uid: string) => doc(db, 'learners', uid, 'profile', 'photo');
const approvedCache = new Map<string, string | null>();

export const approvedPhotoOf = (uid: string): string | null => approvedCache.get(uid) ?? null;

export async function getPhoto(uid: string): Promise<PhotoDoc> {
  const s = await getDoc(ref(uid));
  const d = s.exists() ? { ...EMPTY, ...(s.data() as Partial<PhotoDoc>) } : { ...EMPTY };
  approvedCache.set(uid, d.approved);
  return d;
}

/** Learner: send a new photo for approval. The approved photo (if any) stays until the new one is approved. */
export async function submitPhoto(uid: string, dataUrl: string): Promise<void> {
  const cur = await getPhoto(uid);
  await setDoc(ref(uid), { ...cur, pending: dataUrl, pendingAt: Date.now(), rejectedReason: null });
}

export async function approvePhoto(uid: string): Promise<void> {
  const cur = await getPhoto(uid);
  if (!cur.pending) return;
  await setDoc(ref(uid), { ...cur, approved: cur.pending, approvedAt: Date.now(), pending: null, pendingAt: null, rejectedReason: null });
  approvedCache.set(uid, cur.pending);
}

export async function rejectPhoto(uid: string, reason: string): Promise<void> {
  const cur = await getPhoto(uid);
  await setDoc(ref(uid), { ...cur, pending: null, pendingAt: null, rejectedReason: reason || 'Not approved.' });
}

/** Teacher: take down an approved photo. */
export async function removePhoto(uid: string): Promise<void> {
  const cur = await getPhoto(uid);
  await setDoc(ref(uid), { ...cur, approved: null, approvedAt: null });
  approvedCache.set(uid, null);
}

/** Teacher: every learner's photo record (for the approval list and the avatars in lists). */
export async function allPhotos(): Promise<(PhotoDoc & { uid: string })[]> {
  const snap = await getDocs(collectionGroup(db, 'profile'));
  return snap.docs.filter((d) => d.id === 'photo').map((d) => {
    const uid = d.ref.path.split('/')[1];
    const p = { ...EMPTY, ...(d.data() as Partial<PhotoDoc>), uid };
    approvedCache.set(uid, p.approved);
    return p;
  });
}

/** Crop to a centred square, resize to 256 px and compress to a JPEG data URL under 60,000 characters. */
export async function photoFromFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose a photo (JPG or PNG).');
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(file); } catch { throw new Error('That photo could not be opened. Try another one.'); }
  const { sx, sy, size } = cropBox(bmp.width, bmp.height);
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 256, 256);
  g.drawImage(bmp, sx, sy, size, size, 0, 0, 256, 256);
  for (const q of [0.85, 0.75, 0.65, 0.55, 0.45]) {
    const url = c.toDataURL('image/jpeg', q);
    if (url.length < 60_000) return url;
  }
  throw new Error('That photo is too detailed. Try another one.');
}
