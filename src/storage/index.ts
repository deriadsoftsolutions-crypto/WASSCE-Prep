import type { StorageAdapter } from './StorageAdapter';
import { LocalStorageAdapter } from './LocalStorageAdapter';
import { FirebaseAdapter } from './FirebaseAdapter';
import { CONFIG } from '../config';

/**
 * The single storage instance used by the whole app.
 * Switch between Firebase and on-device storage with CONFIG.STORAGE in src/config.ts.
 */
export const storage: StorageAdapter = CONFIG.STORAGE === 'firebase' ? new FirebaseAdapter() : new LocalStorageAdapter();
export const usingFirebase = CONFIG.STORAGE === 'firebase';

export type { StorageAdapter };
export { topicItemIds } from './progress';
