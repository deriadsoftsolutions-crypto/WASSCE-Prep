import type { Attempt, AttemptFilter, Learner, Progress } from '../types';

/**
 * The ONLY way app code reads or writes learner data.
 *
 * Every method is async so that a network-backed implementation (Firebase)
 * can be swapped in without changing any calling code.
 */
export interface StorageAdapter {
  /** Store one finished attempt. `id` and `timestamp` are filled in if missing. */
  saveAttempt(attempt: Omit<Attempt, 'id' | 'timestamp'> & Partial<Pick<Attempt, 'id' | 'timestamp'>>): Promise<Attempt>;

  /** All attempts, newest first, optionally filtered. */
  getAttempts(filter?: AttemptFilter): Promise<Attempt[]>;

  /** Summary of a learner's progress, computed from their attempts. */
  getProgress(learnerId: string): Promise<Progress>;

  /**
   * Delete attempts. With a learnerId, only that learner's attempts are removed.
   * Without one, every attempt stored by this adapter is removed.
   */
  clearProgress(learnerId?: string): Promise<void>;

  /** The learner currently using this device, or null on first open. */
  getLearner(): Promise<Learner | null>;

  /** Set (or switch) the learner using this device. Pass null to sign out. */
  setLearner(learner: Learner | null): Promise<void>;
}
