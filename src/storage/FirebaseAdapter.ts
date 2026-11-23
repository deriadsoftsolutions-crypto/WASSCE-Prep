/**
 * FirebaseAdapter: STUB for later.
 *
 * This class has the same shape as LocalStorageAdapter so the rest of the app
 * never needs to change. To switch over:
 *
 *   1. npm install firebase
 *   2. Create a Firebase project, enable Authentication (e.g. Email link,
 *      Google, or Anonymous) and Cloud Firestore.
 *   3. Put your web config in .env as VITE_FIREBASE_API_KEY etc.
 *   4. Fill in each method below (example code is in the comments).
 *   5. In src/storage/index.ts, replace `new LocalStorageAdapter()` with
 *      `new FirebaseAdapter()`.
 *
 * Suggested Firestore layout:
 *   learners/{learnerId}                 -> { name, className, createdAt }
 *   learners/{learnerId}/attempts/{id}   -> Attempt
 *
 * Tip: Firestore has built-in offline persistence. Call
 * `initializeFirestore(app, { localCache: persistentLocalCache() })` so the
 * site still works when the school Wi-Fi drops.
 */
import type { Attempt, AttemptFilter, Learner, Progress } from '../types';
import type { StorageAdapter } from './StorageAdapter';
// import { computeProgress } from './progress';
// import topics from '../data/topics.json';
// import { initializeApp } from 'firebase/app';
// import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
// import {
//   initializeFirestore, persistentLocalCache, collection, collectionGroup,
//   addDoc, getDoc, getDocs, query, where, orderBy, doc, setDoc, writeBatch,
// } from 'firebase/firestore';

// const app = initializeApp({
//   apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
//   authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
//   projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
//   appId: import.meta.env.VITE_FIREBASE_APP_ID,
// });
// const db = initializeFirestore(app, { localCache: persistentLocalCache() });
// const auth = getAuth(app);

const NOT_READY = 'FirebaseAdapter is not implemented yet. See README "Adding Firebase later".';

export class FirebaseAdapter implements StorageAdapter {
  async saveAttempt(_attempt: Parameters<StorageAdapter['saveAttempt']>[0]): Promise<Attempt> {
    // const data = { ..._attempt, timestamp: _attempt.timestamp ?? Date.now() };
    // const ref = await addDoc(collection(db, 'learners', data.learnerId, 'attempts'), data);
    // window.dispatchEvent(new CustomEvent('progress-changed'));
    // return { ...data, id: ref.id } as Attempt;
    throw new Error(NOT_READY);
  }

  async getAttempts(_filter?: AttemptFilter): Promise<Attempt[]> {
    // With a learnerId: query that learner's sub-collection.
    // Without: a teacher account can use collectionGroup(db, 'attempts')
    // (protect this with Firestore security rules).
    // const q = _filter?.learnerId
    //   ? query(collection(db, 'learners', _filter.learnerId, 'attempts'), orderBy('timestamp', 'desc'))
    //   : query(collectionGroup(db, 'attempts'), orderBy('timestamp', 'desc'));
    // const snap = await getDocs(q);
    // return snap.docs.map((d) => ({ ...(d.data() as Attempt), id: d.id }))
    //   .filter((a) => (!_filter?.kind || a.kind === _filter.kind) && (!_filter?.itemId || a.itemId === _filter.itemId));
    throw new Error(NOT_READY);
  }

  async getProgress(_learnerId: string): Promise<Progress> {
    // const attempts = await this.getAttempts({ learnerId: _learnerId });
    // return computeProgress(_learnerId, attempts, topics);
    throw new Error(NOT_READY);
  }

  async clearProgress(_learnerId?: string): Promise<void> {
    // const attempts = await this.getAttempts(_learnerId ? { learnerId: _learnerId } : {});
    // const batch = writeBatch(db);
    // attempts.forEach((a) => batch.delete(doc(db, 'learners', a.learnerId, 'attempts', a.id)));
    // await batch.commit();
    throw new Error(NOT_READY);
  }

  async getLearner(): Promise<Learner | null> {
    // Use the signed-in Firebase user. Name and class can be stored in learners/{uid}.
    // const user = auth.currentUser; if (!user) return null;
    // const snap = await getDoc(doc(db, 'learners', user.uid));
    // return snap.exists() ? ({ id: user.uid, ...snap.data() } as Learner) : null;
    throw new Error(NOT_READY);
  }

  async setLearner(_learner: Learner | null): Promise<void> {
    // if (!_learner) return signOut(auth);
    // await setDoc(doc(db, 'learners', _learner.id), { name: _learner.name, className: _learner.className, createdAt: _learner.createdAt });
    throw new Error(NOT_READY);
  }
}
