/**
 * Classwork (/assignments): one tidy list per kind of work.
 *   To do      tests and assignments set for the learner's class that still need doing (soonest first)
 *   Lessons    lessons for their class and year
 *   Done       handed in, marked, results
 *   Set for other classes (folded away): learners may still try these; the teacher is told.
 */
import { esc, fmtDate } from '../lib/dom';
import { feedbackHTML } from '../lib/ui';
import { icon } from '../lib/icons';
import { learner } from '../lib/session';
import { dueLabel } from '../lib/due';
import { audienceLabel, audienceOf, type ClassInfo } from '../lib/audience';
import { isTeacher } from '../firebase/account';
import { assignmentsFor, myFeedback, mySubmission, type Assignment } from '../firebase/assignments';
import { assessmentsFor, myAttempt, myResult, myStart, statusOf, type Assessment } from '../firebase/assessments';
import { listClasses } from '../firebase/classes';
import { finishedLessons, myLessons } from './lessons';
import topicsData from '../data/topics.json';

interface Row { href: string; icon: string; title: string; meta: string; pill: string; done: boolean; sort: number }

const pill = (text: string, kind: '' | 'ok' | 'accent' | 'urgent' | 'bad' = '') =>
  `<span class="pill ${kind === 'bad' ? '' : kind}" ${kind === 'bad' ? 'style="background:var(--bad-soft);color:var(--bad)"' : ''}>${esc(text)}</span>`;

async function testRow(a: Assessment, extra = ''): Promise<Row> {
  const [att, res, start] = await Promise.all([myAttempt(a.id).catch(() => null), myResult(a.id).catch(() => null), myStart(a.id).catch(() => null)]);
  const st = statusOf(a);
  const meta = `Test · ${a.questionCount} questions · ${a.totalMarks} marks${a.timeLimitMin ? ` · ${a.timeLimitMin} min` : ''}${extra}`;
  const base = { href: `/tests/${a.id}`, icon: 'test', title: a.title, meta };
  if (res) return { ...base, pill: pill(`Result ${res.total} / ${res.max}`, 'ok'), done: true, sort: 0 };
  if (att) return { ...base, pill: pill('Submitted', 'ok'), done: true, sort: 0 };
  if (st === 'closed') return { ...base, pill: pill('Missed', 'bad'), done: true, sort: 0 };
  if (st === 'upcoming') return { ...base, pill: pill(`Opens ${fmtDate(a.opensAt!)}`), done: false, sort: 9e15 + (a.opensAt ?? 0) };
  if (start) return { ...base, pill: pill('In progress', 'urgent'), done: false, sort: 0 };
  const lab = dueLabel({ kind: 'test', id: a.id, title: a.title, href: '', dueAt: a.closesAt, detail: '' });
  return { ...base, pill: pill(a.closesAt ? lab.text : 'Open now', lab.urgent ? 'urgent' : 'accent'), done: false, sort: a.closesAt ?? 8e15 };
}

async function assignmentRow(a: Assignment, extra = ''): Promise<Row> {
  const [s, f] = await Promise.all([mySubmission(a.id).catch(() => null), myFeedback(a.id).catch(() => null)]);
  const base = { href: `/assignments/${a.id}`, icon: 'clip', title: a.title, meta: `Assignment · ${a.maxMarks} marks${extra}` };
  if (f) return { ...base, pill: pill(`Marked ${f.mark} / ${f.maxMarks}`, 'ok'), done: true, sort: 0 };
  if (s) return { ...base, pill: pill('Handed in', 'ok'), done: true, sort: 0 };
  const lab = dueLabel({ kind: 'assignment', id: a.id, title: a.title, href: '', dueAt: a.dueAt, detail: '' });
  return { ...base, pill: pill(lab.text, lab.urgent ? 'urgent' : a.dueAt ? 'accent' : ''), done: false, sort: a.dueAt ?? 8e15 };
}

const rowsHTML = (rows: Row[]) => `<div class="due-list">${rows.map((r) => `<a class="due-row" href="${r.href}">
    ${icon(r.icon, 24)}<span class="due-main"><b>${esc(r.title)}</b><br><span class="due-sub">${esc(r.meta)}</span></span>${r.pill}</a>`).join('')}</div>`;

const empty = (text: string) => `<div class="card"><p style="margin:0" class="muted">${text}</p></div>`;

export async function classworkPage(el: HTMLElement) {
  el.innerHTML = '<h1>Classwork</h1><p class="muted">Loading...</p>';
  const l = learner()!;
  const teacher = await isTeacher().catch(() => false);
  let asg: { mine: Assignment[]; others: Assignment[] };
  let tst: { mine: Assessment[]; others: Assessment[] };
  let lessons: Awaited<ReturnType<typeof myLessons>>;
  let done: Map<string, number>;
  let classes: ClassInfo[] = [];
  try {
    [asg, tst, lessons, done, classes] = await Promise.all([assignmentsFor(l), assessmentsFor(l), myLessons(), finishedLessons(), listClasses().catch(() => [])]);
  } catch {
    el.innerHTML = '<h1>Classwork</h1><p class="mark-bad">Could not load your classwork. Check your internet connection.</p>';
    return;
  }
  // The teacher previews everything that is published, as if it were their own class.
  if (teacher) { asg = { mine: [...asg.mine, ...asg.others], others: [] }; tst = { mine: [...tst.mine, ...tst.others], others: [] }; }
  const forWhom = (x: Assignment | Assessment) => ` · For ${audienceLabel(audienceOf(x), classes)}`;

  const mine = [...await Promise.all(tst.mine.map((a) => testRow(a, teacher ? forWhom(a) : ''))), ...await Promise.all(asg.mine.map((a) => assignmentRow(a, teacher ? forWhom(a) : '')))];
  const todo = mine.filter((r) => !r.done).sort((a, b) => a.sort - b.sort);
  const finished = mine.filter((r) => r.done);
  const others = [...await Promise.all(tst.others.map((a) => testRow(a, forWhom(a)))), ...await Promise.all(asg.others.map((a) => assignmentRow(a, forWhom(a))))];
  const topics = topicsData as { id: number; short?: string; title: string }[];
  const lessonRows: Row[] = lessons.map((x) => ({
    href: `/lessons/${x.id}`, icon: 'book', title: x.title, done: done.has(x.id), sort: 0,
    meta: `Lesson${x.topicId ? ` · Topic ${x.topicId}, ${topics.find((t) => t.id === x.topicId)?.short ?? topics.find((t) => t.id === x.topicId)?.title ?? ''}` : ''}`,
    pill: done.has(x.id) ? pill('Finished', 'ok') : pill('New', 'accent'),
  }));
  const newLessons = lessonRows.filter((r) => !r.done).length;

  el.innerHTML = `
    <div class="page-head"><h1>Classwork</h1><span class="muted">${teacher ? 'Teacher preview' : `${esc(l.className)}${l.year ? ` · STEM ${l.year}` : ''}`}</span></div>
    ${teacher ? feedbackHTML('info', 'You are signed in as the teacher.', '<p style="margin:6px 0">Below is everything that is published, so you can preview it. Learners see the work set for their own class first. To create, edit or mark work, use the Teacher page.</p><a class="btn btn-primary" href="/teacher">Go to the Teacher page</a>') : ''}
    <div class="cw-summary" role="status">
      <span><b>${todo.length}</b> to do</span><span><b>${newLessons}</b> new lesson${newLessons === 1 ? '' : 's'}</span><span><b>${finished.length}</b> done</span>
    </div>

    <section aria-labelledby="cw-todo"><h2 id="cw-todo">To do</h2>
      ${todo.length ? rowsHTML(todo) : empty('Nothing to do right now. Well done!')}</section>

    <section aria-labelledby="cw-lessons"><h2 id="cw-lessons">Lessons</h2>
      ${lessonRows.length ? rowsHTML([...lessonRows.filter((r) => !r.done), ...lessonRows.filter((r) => r.done)]) : empty(teacher ? 'No published lessons yet.' : 'No lessons for your class yet.')}</section>

    <section aria-labelledby="cw-done"><h2 id="cw-done">Done</h2>
      ${finished.length ? rowsHTML(finished) : empty('Work you hand in and tests you take appear here, with your marks.')}</section>

    ${others.length ? `<details class="card cw-others"><summary><b>Set for other classes (${others.length})</b></summary>
      <p class="muted small" style="margin:8px 0 10px">This work was set for other classes. You may try it for practice. If you hand it in, your teacher sees that you are not in that class.</p>
      ${rowsHTML(others)}</details>` : ''}`;
}
