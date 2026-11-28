import {
  createUserWithEmailAndPassword, EmailAuthProvider, reauthenticateWithCredential, signInWithEmailAndPassword,
  signOut as fbSignOut, updatePassword, updateProfile,
} from 'firebase/auth';
import {
  doc, getDocFromCache, setDoc,
} from 'firebase/firestore';
import { getDoc } from './reads';
import { auth, db } from './app';
import { LEARNER_EMAIL_DOMAIN } from './config';
import type { Learner } from '../types';

const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
/** "Ama  Mensah" + "2 Sci A" -> ama-mensah.2scia@learners... (spaces in the class are ignored). */
export function learnerEmail(name: string, className: string): string {
  return `${slug(name).slice(0, 40)}.${slug(className).replace(/-/g, '').slice(0, 16)}@${LEARNER_EMAIL_DOMAIN}`;
}

const PROFILE_KEY = (uid: string) => `wassce.fbprofile.${uid}`;
export function cacheProfile(l: Learner) {
  try { localStorage.setItem(PROFILE_KEY(l.id), JSON.stringify(l)); } catch { /* ignore */ }
}
export function cachedProfile(uid: string): Learner | null {
  try { const r = localStorage.getItem(PROFILE_KEY(uid)); return r ? (JSON.parse(r) as Learner) : null; } catch { return null; }
}

/** The part of a learner's login that comes from their class (letters and digits, at most 16). */
const classCode = (className: string) => slug(className).replace(/-/g, '').slice(0, 16);

/**
 * Sign up. With fixed classes, `cls` is the chosen class (its id is the login code);
 * if the teacher has not set up classes yet, `cls` is just the typed class name.
 */
export async function learnerSignUp(name: string, cls: string | { id: string; name: string; year: 1 | 2 | 3 }, pin: string, year: 1 | 2 | 3): Promise<Learner> {
  const fixed = typeof cls === 'object' ? cls : null;
  const className = fixed ? fixed.name : (cls as string);
  const code = fixed ? fixed.id : classCode(className);
  const cred = await createUserWithEmailAndPassword(auth, `${slug(name).slice(0, 40)}.${code}@${LEARNER_EMAIL_DOMAIN}`, pin);
  await updateProfile(cred.user, { displayName: name });
  const y = fixed ? fixed.year : year;
  const l: Learner = { id: cred.user.uid, name, className, createdAt: Date.now(), year: y, ...(fixed ? { classId: fixed.id } : {}) };
  cacheProfile(l);
  // Wait (briefly) for the profile to be saved, so it is not lost if the page changes straight away.
  // Offline, the write stays queued and is sent later; ensureProfile() also repairs it on the next start.
  await Promise.race([
    setDoc(doc(db, 'learners', l.id), { name, className, year: y, createdAt: l.createdAt, role: 'learner', ...(fixed ? { classId: fixed.id, loginKey: fixed.id } : {}) }).catch(console.error),
    new Promise((r) => setTimeout(r, 4000)),
  ]);
  return l;
}

/**
 * Sign in. `codes` are the login codes to try, in order: the class id, then its aliases
 * (learners the teacher moved into the class keep the code they signed up with).
 */
export async function learnerSignIn(name: string, cls: string | { id: string; aliases?: string[] }, pin: string): Promise<void> {
  const codes = typeof cls === 'object' ? [cls.id, ...(cls.aliases ?? [])] : [classCode(cls)];
  let last: unknown = null;
  for (const code of [...new Set(codes)]) {
    try {
      const cred = await signInWithEmailAndPassword(auth, `${slug(name).slice(0, 40)}.${code}@${LEARNER_EMAIL_DOMAIN}`, pin);
      // Signing in: take the profile from the server (the teacher may have moved the learner to another class).
      try {
        const s = await getDoc(doc(db, 'learners', cred.user.uid));
        if (s.exists()) {
          const d = s.data() as { name: string; className: string; createdAt: number; year?: 1 | 2 | 3; classId?: string };
          cacheProfile({ id: cred.user.uid, name: d.name, className: d.className, createdAt: d.createdAt, year: d.year, ...(d.classId ? { classId: d.classId } : {}) });
        }
      } catch { /* offline: the profile on the device is used */ }
      return;
    } catch (e) {
      last = e;
      // Only a "not recognised" error means: try the next code. Network trouble, too many tries: stop.
      if (!/invalid-credential|user-not-found|wrong-password|invalid-login-credentials/.test((e as { code?: string }).code ?? '')) throw e;
    }
  }
  throw last;
}

export async function teacherSignIn(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function teacherSignUp(name: string, email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(cred.user, { displayName: name });
  cacheProfile({ id: cred.user.uid, name, className: 'Teacher', createdAt: Date.now() });
}

export async function signOut() {
  await fbSignOut(auth);
}

/**
 * True if the signed-in user has a document in /teachers (added by hand in the Firebase console).
 * Remembered for the browser session (many pages ask; each server check is a billed read).
 * The Teacher page's sign-in passes fresh = true, so a newly added teacher is recognised at once.
 */
export async function isTeacher(fresh = false): Promise<boolean> {
  const u = auth.currentUser;
  if (!u) return false;
  const key = `wassce.isTeacher.${u.uid}`;
  if (!fresh) {
    if (teacherMemo?.uid === u.uid) return teacherMemo.value;
    try { const v = sessionStorage.getItem(key); if (v !== null) { teacherMemo = { uid: u.uid, value: v === '1' }; return teacherMemo.value; } } catch { /* ignore */ }
  }
  const ref = doc(db, 'teachers', u.uid);
  let value: boolean;
  try {
    value = (await getDoc(ref)).exists();
  } catch {
    try { return (await getDocFromCache(ref)).exists(); } catch { return false; }
  }
  teacherMemo = { uid: u.uid, value };
  try { sessionStorage.setItem(key, value ? '1' : '0'); } catch { /* ignore */ }
  return value;
}
let teacherMemo: { uid: string; value: boolean } | null = null;

/** Plain-English messages for the Firebase errors learners are likely to see. */
/** Learner: change the 6-digit PIN (their Firebase password). Checks the current PIN first. */
export async function changePin(current: string, next: string): Promise<void> {
  const u = auth.currentUser;
  if (!u?.email) throw new Error('Please sign in again.');
  try {
    await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, current));
  } catch (e) {
    const code = (e as { code?: string }).code ?? '';
    if (/wrong-password|invalid-credential|invalid-login-credentials/.test(code)) throw new Error('Your current PIN is not right.');
    if (/too-many-requests/.test(code)) throw new Error('Too many tries. Wait a few minutes and try again.');
    if (/network-request-failed/.test(code)) throw new Error('No internet connection. Try again when you are online.');
    throw new Error('Could not check your PIN. Try again.');
  }
  try {
    await updatePassword(u, next);
  } catch (e) {
    if (/network-request-failed/.test((e as { code?: string }).code ?? '')) throw new Error('No internet connection. Try again when you are online.');
    throw new Error('Could not change your PIN. Try again.');
  }
}

export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string }).code ?? '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Someone with this name and class already has an account. Choose "I have an account" to sign in, or add your surname or an initial.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return 'Name, class or PIN not recognised. Type your name exactly as when you signed up, and choose your class.';
    case 'auth/weak-password':
      return 'Your PIN must be 6 digits.';
    case 'auth/invalid-email':
      return 'Check the name and class (or the email address).';
    case 'auth/network-request-failed':
      return 'No internet connection. You need internet the first time you sign in on a device.';
    case 'auth/too-many-requests':
      return 'Too many tries. Wait a few minutes and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

let profileChecked = '';
/**
 * Make sure learners/{uid} exists on the server (the teacher's class lists come from it), and pick up
 * changes the teacher made (a new class or year). Once per session. Returns the updated profile, if it changed.
 */
export async function ensureProfile(l: Learner): Promise<Learner | null> {
  if (profileChecked === l.id || !l.className || l.className === 'Teacher') return null;
  profileChecked = l.id;
  try {
    const ref = doc(db, 'learners', l.id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, JSON.parse(JSON.stringify({ name: l.name, className: l.className, year: l.year, createdAt: l.createdAt, role: 'learner', classId: l.classId })));
      return null;
    }
    const d = snap.data() as { className?: string; year?: 1 | 2 | 3; classId?: string };
    if ((d.className ?? l.className) === l.className && (d.year ?? l.year) === l.year && (d.classId ?? l.classId) === l.classId) return null;
    const next: Learner = { ...l, className: d.className ?? l.className, year: d.year ?? l.year, ...(d.classId ? { classId: d.classId } : {}) };
    cacheProfile(next);
    return next;
  } catch { profileChecked = ''; return null; }
}
