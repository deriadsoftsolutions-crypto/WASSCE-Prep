import type { StorageAdapter } from './StorageAdapter';
import { LocalStorageAdapter } from './LocalStorageAdapter';
// import { FirebaseAdapter } from './FirebaseAdapter';

/**
 * The single storage instance used by the whole app.
 * To move to Firebase later, change this one line to `new FirebaseAdapter()`.
 */
export const storage: StorageAdapter = new LocalStorageAdapter();

export type { StorageAdapter };
export { topicItemIds } from './progress';
