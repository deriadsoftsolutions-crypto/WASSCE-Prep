import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as fbSignOut, updateProfile,
} from 'firebase/auth';
import { doc, getDoc, getDocFromCache, setDoc } from 'firebase/firestore';
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

export async function learnerSignUp(name: string, className: string, pin: string): Promise<Learner> {
  const cred = await createUserWithEmailAndPassword(auth, learnerEmail(name, className), pin);
  await updateProfile(cred.user, { displayName: name });
  const l: Learner = { id: cred.user.uid, name, className, createdAt: Date.now() };
  cacheProfile(l);
  // Wait (briefly) for the profile to be saved, so it is not lost if the page changes straight away.
  // Offline, the write stays queued and is sent later; ensureProfile() also repairs it on the next start.
  await Promise.race([
    setDoc(doc(db, 'learners', l.id), { name, className, createdAt: l.createdAt, role: 'learner' }).catch(console.error),
    new Promise((r) => setTimeout(r, 4000)),
  ]);
  return l;
}

export async function learnerSignIn(name: string, className: string, pin: string): Promise<void> {
  await signInWithEmailAndPassword(auth, learnerEmail(name, className), pin);
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

/** True if the signed-in user has a document in /teachers (added by hand in the Firebase console). */
export async function isTeacher(): Promise<boolean> {
  const u = auth.currentUser;
  if (!u) return false;
  const ref = doc(db, 'teachers', u.uid);
  try {
    return (await getDoc(ref)).exists();
  } catch {
    try { return (await getDocFromCache(ref)).exists(); } catch { return false; }
  }
}

/** Plain-English messages for the Firebase errors learners are likely to see. */
export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string }).code ?? '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Someone with this name and class already has an account. Choose "I have an account" to sign in, or add your surname or an initial.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return 'Name, class or PIN not recognised. Type your name and class exactly as when you signed up.';
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
/** Make sure learners/{uid} exists on the server (the teacher's class lists come from it). Once per session. */
export async function ensureProfile(l: Learner) {
  if (profileChecked === l.id || !l.className || l.className === 'Teacher') return;
  profileChecked = l.id;
  try {
    const ref = doc(db, 'learners', l.id);
    if (!(await getDoc(ref)).exists()) await setDoc(ref, { name: l.name, className: l.className, createdAt: l.createdAt, role: 'learner' });
  } catch { profileChecked = ''; }
}
