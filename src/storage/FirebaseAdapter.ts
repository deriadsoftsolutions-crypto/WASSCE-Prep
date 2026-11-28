/**
 * FirebaseAdapter: stores attempts in Cloud Firestore so a learner's progress
 * follows them to any device, and the teacher can see the whole class.
 *
 * Firestore layout (protected by firestore.rules):
 *   learners/{uid}                 -> { name, className, createdAt, role }
 *   learners/{uid}/attempts/{id}   -> Attempt
 *   teachers/{uid}                 -> {}   (added by hand in the Firebase console)
 *   settings/global                -> { mockMinutes, shuffle }
 *
 * Offline: Firestore keeps a cache on the device. Writes made offline are
 * queued and sent when the connection returns, so we never wait on the server.
 */
import {
  collection, collectionGroup, doc, getDoc, getDocs, onSnapshot, setDoc, writeBatch,
  type DocumentReference, type Unsubscribe,
} from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '../firebase/app';
import { cacheProfile, cachedProfile, ensureProfile, isTeacher, signOut } from '../firebase/account';
import type { Attempt, AttemptFilter, Learner, Progress, Topic } from '../types';
import type { StorageAdapter } from './StorageAdapter';
import { computeProgress } from './progress';
import topics from '../data/topics.json';

const changed = () => window.dispatchEvent(new CustomEvent('progress-changed'));

/** Firestore rejects `undefined` values, so drop them. */
function clean<T>(o: T): T {
  return JSON.parse(JSON.stringify(o)) as T;
}

function matches(a: Attempt, f: AttemptFilter): boolean {
  return (!f.learnerId || a.learnerId === f.learnerId) && (!f.kind || a.kind === f.kind) && (!f.itemId || a.itemId === f.itemId);
}

export class FirebaseAdapter implements StorageAdapter {
  /** Live copy of the signed-in learner's own attempts (served from the device cache when offline). */
  private own: { uid: string; list: Attempt[]; ready: Promise<void>; unsub: Unsubscribe } | null = null;
  /** Short-lived copy of everyone's attempts for the teacher page. */
  private classCache: { at: number; list: Attempt[] } | null = null;

  constructor() {
    onAuthStateChanged(auth, (u) => this.onUser(u));
  }

  private onUser(u: User | null) {
    if (this.own && this.own.uid !== u?.uid) {
      this.own.unsub();
      this.own = null;
    }
    this.classCache = null;
    if (u) this.watch(u.uid);
  }

  private watch(uid: string) {
    if (this.own?.uid === uid) return this.own;
    let resolve!: () => void;
    const ready = new Promise<void>((r) => (resolve = r));
    const state = { uid, list: [] as Attempt[], ready, unsub: (() => {}) as Unsubscribe };
    state.unsub = onSnapshot(
      collection(db, 'learners', uid, 'attempts'),
      (snap) => {
        state.list = snap.docs.map((d) => ({ ...(d.data() as Attempt), id: d.id }));
        resolve();
        changed();
      },
      (err) => {
        console.warn('Attempts listener error', err);
        resolve();
      },
    );
    this.own = state;
    return state;
  }

  async saveAttempt(input: Parameters<StorageAdapter['saveAttempt']>[0]): Promise<Attempt> {
    const u = auth.currentUser;
    if (!u) throw new Error('Not signed in');
    const ref: DocumentReference = doc(collection(db, 'learners', u.uid, 'attempts'));
    const attempt: Attempt = clean({ ...input, learnerId: u.uid, id: ref.id, timestamp: input.timestamp ?? Date.now() });
    // Not awaited on purpose: offline, the promise only settles once the server confirms.
    setDoc(ref, attempt).catch((e) => console.error('Could not save attempt', e));
    // Show it straight away; the live listener then replaces the list with Firestore's copy.
    const own = this.watch(u.uid);
    if (!own.list.some((a) => a.id === attempt.id)) own.list = [...own.list, attempt];
    changed();
    return attempt;
  }

  async getAttempts(filter: AttemptFilter = {}): Promise<Attempt[]> {
    const u = auth.currentUser;
    if (!u) return [];
    let list: Attempt[];
    if (filter.learnerId === u.uid || (!filter.learnerId && !(await isTeacher()))) {
      const own = this.watch(u.uid);
      await own.ready;
      list = own.list;
    } else if (!filter.learnerId) {
      list = await this.classAttempts();
    } else {
      list = this.classCache
        ? this.classCache.list.filter((a) => a.learnerId === filter.learnerId)
        : (await getDocs(collection(db, 'learners', filter.learnerId, 'attempts'))).docs.map((d) => ({ ...(d.data() as Attempt), id: d.id }));
    }
    return list.filter((a) => matches(a, filter)).sort((a, b) => b.timestamp - a.timestamp);
  }

  /** Every learner's attempts (teacher only; the security rules refuse anyone else). */
  private async classAttempts(): Promise<Attempt[]> {
    if (this.classCache && Date.now() - this.classCache.at < 60_000) return this.classCache.list;
    const snap = await getDocs(collectionGroup(db, 'attempts'));
    const list = snap.docs.map((d) => ({ ...(d.data() as Attempt), id: d.id }));
    this.classCache = { at: Date.now(), list };
    return list;
  }

  async getProgress(learnerId: string): Promise<Progress> {
    return computeProgress(learnerId, await this.getAttempts({ learnerId }), topics as Topic[]);
  }

  async clearProgress(learnerId?: string): Promise<void> {
    const list = learnerId ? await this.getAttempts({ learnerId }) : await this.classAttempts();
    for (let i = 0; i < list.length; i += 450) {
      const batch = writeBatch(db);
      list.slice(i, i + 450).forEach((a) => batch.delete(doc(db, 'learners', a.learnerId, 'attempts', a.id)));
      const done = batch.commit();
      // Only wait for the server when online; offline deletes are queued.
      if (navigator.onLine) await done.catch((e) => console.error(e));
      else done.catch((e) => console.error(e));
    }
    this.classCache = null;
    changed();
  }

  async getLearner(): Promise<Learner | null> {
    await auth.authStateReady();
    const u = auth.currentUser;
    if (!u) return null;
    const cached = cachedProfile(u.uid);
    if (cached) {
      // The teacher may have moved the learner to another class: update the screen when that is found.
      void ensureProfile(cached).then((next) => { if (next) window.dispatchEvent(new CustomEvent('profile-updated', { detail: next })); });
      return cached;
    }
    try {
      const snap = await getDoc(doc(db, 'learners', u.uid));
      if (snap.exists()) {
        const d = snap.data() as { name: string; className: string; createdAt: number; year?: 1 | 2 | 3; classId?: string };
        const l: Learner = { id: u.uid, name: d.name, className: d.className, createdAt: d.createdAt, year: d.year, ...(d.classId ? { classId: d.classId } : {}) };
        cacheProfile(l);
        return l;
      }
    } catch { /* offline with nothing cached: fall through */ }
    const teacher = await isTeacher();
    // No profile found (e.g. sign-up interrupted): show a name worked out from the sign-in, never a wrong label.
    const fromEmail = (u.email ?? '').split('@')[0].split('.')[0].split('-').filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
    return { id: u.uid, name: u.displayName || (teacher ? 'Teacher' : fromEmail || 'Learner'), className: teacher ? 'Teacher' : '', createdAt: Date.now() };
  }

  async setLearner(learner: Learner | null): Promise<void> {
    if (!learner) {
      await signOut();
      return;
    }
    // Sign-up and sign-in happen in src/firebase/account.ts. Here we only update the profile.
    cacheProfile(learner);
    // A learner in a fixed class cannot change their class or year (the teacher does that); only older accounts can.
    const fields = learner.classId ? { name: learner.name } : { name: learner.name, className: learner.className, year: learner.year, createdAt: learner.createdAt, role: 'learner' };
    await setDoc(doc(db, 'learners', learner.id), JSON.parse(JSON.stringify(fields)), { merge: true });
  }
}
