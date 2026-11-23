import type { Attempt, AttemptFilter, Learner, Progress } from '../types';
import type { StorageAdapter } from './StorageAdapter';
import { computeProgress } from './progress';
import topics from '../data/topics.json';
import type { Topic } from '../types';

const KEY_ATTEMPTS = 'wassce.attempts.v1';
const KEY_LEARNER = 'wassce.learner.v1';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Stores everything in this browser's localStorage. Works fully offline. */
export class LocalStorageAdapter implements StorageAdapter {
  private read(): Attempt[] {
    try {
      const raw = localStorage.getItem(KEY_ATTEMPTS);
      return raw ? (JSON.parse(raw) as Attempt[]) : [];
    } catch {
      return [];
    }
  }

  private write(list: Attempt[]) {
    try {
      localStorage.setItem(KEY_ATTEMPTS, JSON.stringify(list));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }
  }

  async saveAttempt(input: Parameters<StorageAdapter['saveAttempt']>[0]): Promise<Attempt> {
    const attempt: Attempt = { ...input, id: input.id ?? uid(), timestamp: input.timestamp ?? Date.now() };
    const list = this.read();
    list.push(attempt);
    this.write(list);
    window.dispatchEvent(new CustomEvent('progress-changed'));
    return attempt;
  }

  async getAttempts(filter: AttemptFilter = {}): Promise<Attempt[]> {
    return this.read()
      .filter(
        (a) =>
          (!filter.learnerId || a.learnerId === filter.learnerId) &&
          (!filter.kind || a.kind === filter.kind) &&
          (!filter.itemId || a.itemId === filter.itemId),
      )
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  async getProgress(learnerId: string): Promise<Progress> {
    return computeProgress(learnerId, this.read(), topics as Topic[]);
  }

  async clearProgress(learnerId?: string): Promise<void> {
    this.write(learnerId ? this.read().filter((a) => a.learnerId !== learnerId) : []);
    window.dispatchEvent(new CustomEvent('progress-changed'));
  }

  async getLearner(): Promise<Learner | null> {
    try {
      const raw = localStorage.getItem(KEY_LEARNER);
      return raw ? (JSON.parse(raw) as Learner) : null;
    } catch {
      return null;
    }
  }

  async setLearner(learner: Learner | null): Promise<void> {
    try {
      if (learner) localStorage.setItem(KEY_LEARNER, JSON.stringify(learner));
      else localStorage.removeItem(KEY_LEARNER);
    } catch (e) {
      console.warn('Could not save learner', e);
    }
  }
}
