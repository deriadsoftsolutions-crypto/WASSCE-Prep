/**
 * Work a learner still has to do: open tests not yet taken and assignments not yet handed in.
 * Used for the Classwork badge and the home screen. Cached for a minute; call `refreshDue()`
 * after the learner submits something.
 */
import { usingFirebase } from '../storage';
import { learner } from './session';

export interface DueItem {
  kind: 'test' | 'assignment';
  id: string;
  title: string;
  href: string;
  /** Deadline in ms, or null for none */
  dueAt: number | null;
  detail: string;
}

let cache: { at: number; learnerId: string; items: DueItem[] } | null = null;

export function refreshDue() {
  cache = null;
  window.dispatchEvent(new CustomEvent('classwork-changed'));
}

export async function dueWork(): Promise<DueItem[]> {
  const l = learner();
  if (!usingFirebase || !l) return [];
  if (cache && cache.learnerId === l.id && Date.now() - cache.at < 60_000) return cache.items;
  const [asg, tst] = await Promise.all([import('../firebase/assignments'), import('../firebase/assessments')]);
  // Only work set for the learner's own class counts as "to do" (work for other classes is optional).
  const [assignments, tests] = await Promise.all([
    asg.assignmentsFor(l).then((x) => x.mine).catch(() => []),
    tst.assessmentsFor(l).then((x) => x.mine).catch(() => []),
  ]);
  const items: DueItem[] = [];
  await Promise.all([
    ...tests.filter((t) => tst.statusOf(t) === 'open').map(async (t) => {
      if (await tst.myAttempt(t.id).catch(() => null)) return;
      items.push({
        kind: 'test', id: t.id, title: t.title, href: `/tests/${t.id}`, dueAt: t.closesAt,
        detail: `Test, ${t.questionCount} question${t.questionCount === 1 ? '' : 's'}${t.timeLimitMin ? `, ${t.timeLimitMin} minutes` : ''}`,
      });
    }),
    ...assignments.map(async (a) => {
      if (await asg.mySubmission(a.id).catch(() => null)) return;
      items.push({ kind: 'assignment', id: a.id, title: a.title, href: `/assignments/${a.id}`, dueAt: a.dueAt, detail: 'Assignment' });
    }),
  ]);
  items.sort((x, y) => (x.dueAt ?? Infinity) - (y.dueAt ?? Infinity));
  cache = { at: Date.now(), learnerId: l.id, items };
  return items;
}

/** "Closes today, 5:00 pm", "Due Friday 28 Nov", "Overdue" ... */
export function dueLabel(d: DueItem): { text: string; urgent: boolean } {
  if (!d.dueAt) return { text: 'No deadline', urgent: false };
  const now = new Date();
  const due = new Date(d.dueAt);
  const verb = d.kind === 'test' ? 'Closes' : 'Due';
  const time = due.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (d.dueAt < now.getTime()) return { text: 'Overdue', urgent: true };
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(due) - startOf(now)) / 86_400_000);
  if (days === 0) return { text: `${verb} today, ${time}`, urgent: true };
  if (days === 1) return { text: `${verb} tomorrow, ${time}`, urgent: true };
  return { text: `${verb} ${due.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}`, urgent: false };
}
