import { storage } from '../storage';
import type { Attempt, AttemptKind, Learner } from '../types';
import { esc } from './dom';
import { modal, toast } from './ui';

let current: Learner | null = null;

export function learner(): Learner | null {
  return current;
}

export async function loadLearner(): Promise<Learner | null> {
  current = await storage.getLearner();
  return current;
}

function makeId(name: string, className: string): string {
  return `${name}|${className}`.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Show the "Who are you?" dialog. Resolves once a learner is set. */
export function askLearner(dismissible = false): Promise<Learner> {
  return new Promise((resolve) => {
    const m = modal(
      `<form id="who" class="stack">
        <h2>Welcome! Who is practising?</h2>
        <p class="muted">Your name and class are saved on this tablet only, so your progress is kept for you.</p>
        <label class="field"><span>Your name</span><input name="name" required maxlength="40" autocomplete="name" value="${esc(current?.name ?? '')}" /></label>
        <label class="field"><span>Class (for example 2 Sci A)</span><input name="cls" required maxlength="20" value="${esc(current?.className ?? '')}" /></label>
        <button class="btn btn-primary btn-big btn-block" type="submit">Start practising</button>
      </form>`,
      { dismissible },
    );
    const form = m.root.querySelector('form') as HTMLFormElement;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const name = String(fd.get('name') ?? '').trim();
      const className = String(fd.get('cls') ?? '').trim();
      if (!name || !className) return;
      const l: Learner = { id: makeId(name, className), name, className, createdAt: Date.now() };
      await storage.setLearner(l);
      current = l;
      m.close();
      window.dispatchEvent(new CustomEvent('learner-changed'));
      resolve(l);
    });
  });
}

export interface ResultInput {
  kind: AttemptKind;
  itemId: string;
  topicId?: number;
  score: number;
  max: number;
  durationSec?: number;
  details?: Record<string, unknown>;
}

/** Save a finished attempt for the current learner through the storage adapter. */
export async function saveResult(r: ResultInput): Promise<Attempt | null> {
  const l = current ?? (await askLearner());
  try {
    return await storage.saveAttempt({ ...r, learnerId: l.id, learnerName: l.name, className: l.className });
  } catch (e) {
    console.error(e);
    toast('Could not save your result on this tablet.');
    return null;
  }
}
