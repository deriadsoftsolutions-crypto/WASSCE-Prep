import topicsData from '../data/topics.json';
import type { Attempt, Progress, Topic } from '../types';
import { esc } from '../lib/dom';
import { learner } from '../lib/session';
import { storage, usingFirebase } from '../storage';
import { dueLabel, dueWork, type DueItem } from '../lib/due';
import { icon } from '../lib/icons';
import { CONFIG } from '../config';
import { finishedLessons, myLessons } from './lessons';
import type { Lesson } from '../firebase/lessons';

const topics = topicsData as Topic[];
const LEVELS = ['Not started', 'Learning', 'Practising', 'Nearly there', 'Mastered'];

/** 0..4, shown as lit LED segments. */
export function masteryLevel(p: Progress | null, id: number): number {
  const tp = p?.topics[id];
  if (!tp || (!Object.keys(tp.items).length && !tp.mcqTotal)) return 0;
  return tp.percent >= 80 ? 4 : tp.percent >= 50 ? 3 : tp.percent >= 25 ? 2 : 1;
}

export function ledHTML(level: number, label = LEVELS[level]): string {
  return `<span class="led" role="img" aria-label="${esc(label)}">${[0, 1, 2, 3].map((k) => `<span class="${k < level ? 'on' : ''}"></span>`).join('')}</span>`;
}

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

interface Step { tag: string; title: string; detail: string; href: string; action: string; done: boolean }

function weakestTopic(prog: Progress | null, skip: Set<number>): { t: Topic; tried: boolean } {
  const tried = topics.filter((t) => !skip.has(t.id) && masteryLevel(prog, t.id) > 0);
  const strength = (id: number) => {
    const tp = prog!.topics[id];
    return tp.mcqTotal ? (tp.percent + (tp.mcqCorrect / tp.mcqTotal) * 100) / 2 : tp.percent;
  };
  const weak = tried.filter((t) => masteryLevel(prog, t.id) < 4).sort((a, b) => strength(a.id) - strength(b.id))[0];
  if (weak) return { t: weak, tried: true };
  const fresh = topics.find((t) => !skip.has(t.id) && masteryLevel(prog, t.id) === 0);
  return { t: fresh ?? topics.find((t) => !skip.has(t.id)) ?? topics[0], tried: !fresh };
}

function buildCircuit(prog: Progress | null, attempts: Attempt[], due: DueItem[], unread: Lesson[]): Step[] {
  const today = startOfToday();
  const todays = attempts.filter((a) => a.timestamp >= today);
  const steps: Step[] = [];
  const used = new Set<number>();

  if (due.length) {
    const d = due[0];
    steps.push({ tag: d.kind === 'test' ? 'Test' : 'Assignment', title: d.title, detail: dueLabel(d).text, href: d.href, action: 'Open', done: false });
  } else if (unread.length) {
    const ls = unread[0];
    if (ls.topicId) used.add(ls.topicId);
    steps.push({ tag: 'New lesson', title: ls.title, detail: ls.summary || 'From your teacher', href: `/lessons/${ls.id}`, action: 'Read', done: false });
  } else {
    const last = attempts.find((a) => a.topicId != null);
    if (last && last.topicId != null && masteryLevel(prog, last.topicId) < 4) {
      const t = topics.find((x) => x.id === last.topicId)!;
      used.add(t.id);
      const done = todays.some((a) => a.topicId === t.id);
      steps.push({ tag: done ? 'Done' : 'Carry on', title: `Keep going with ${t.short.toLowerCase()}`, detail: `Topic ${t.id}, where you left off`, href: `/topic/${t.id}`, action: 'Continue', done });
    }
  }

  const w = weakestTopic(prog, used);
  used.add(w.t.id);
  const wDone = todays.some((a) => a.topicId === w.t.id);
  steps.push({
    tag: wDone ? 'Done' : w.tried ? 'Weakest topic' : 'New topic', title: `Practise ${w.t.short.toLowerCase()}`,
    detail: w.tried ? `Topic ${w.t.id} needs the most work` : `Topic ${w.t.id}, not started yet`, href: `/topic/${w.t.id}`, action: 'Start', done: wDone,
  });

  const weekAgo = Date.now() - 7 * 86_400_000;
  const recentMock = attempts.some((a) => a.kind === 'mock' && a.timestamp >= weekAgo);
  if (!recentMock) {
    steps.push({ tag: todays.some((a) => a.kind === 'mock') ? 'Done' : 'This week', title: 'Take a Paper 1 mock', detail: '40 questions, with your score for each topic', href: '/mock', action: 'Start mock', done: todays.some((a) => a.kind === 'mock') });
  } else {
    const p2 = todays.some((a) => a.kind === 'paper2');
    steps.push({ tag: p2 ? 'Done' : 'Paper 2', title: 'Answer a Paper 2 question', detail: 'Write it, then mark it against the model answer', href: '/paper2', action: 'Open Paper 2', done: p2 });
  }

  if (steps.length < 3) {
    const w2 = weakestTopic(prog, used);
    const d2 = todays.some((a) => a.topicId === w2.t.id);
    steps.splice(1, 0, { tag: d2 ? 'Done' : 'Next topic', title: `Practise ${w2.t.short.toLowerCase()}`, detail: `Topic ${w2.t.id}`, href: `/topic/${w2.t.id}`, action: 'Start', done: d2 });
  }
  // Done steps first, so the lit part of the trace always ends at the last finished step.
  return steps.slice(0, 3).sort((a, b) => Number(b.done) - Number(a.done));
}

export async function homePage(el: HTMLElement) {
  el.innerHTML = '<div class="skel" aria-label="Loading"><span class="tall"></span><span></span><span class="tall"></span><span></span><span></span></div>';
  const l = learner();
  const [prog, attempts, due, lessons, doneLessons] = await Promise.all([
    l ? storage.getProgress(l.id) : Promise.resolve(null),
    l ? storage.getAttempts({ learnerId: l.id }) : Promise.resolve([] as Attempt[]),
    dueWork().catch(() => [] as DueItem[]),
    myLessons().catch(() => [] as Lesson[]),
    finishedLessons().catch(() => new Map<string, number>()),
  ]);
  const unread = lessons.filter((x) => !doneLessons.has(x.id)).sort((a, b) => b.updatedAt - a.updatedAt);

  const weeks = Math.max(0, Math.ceil((new Date(CONFIG.WASSCE_DATE).getTime() - Date.now()) / (7 * 86_400_000)));
  const days = new Set(attempts.filter((a) => a.timestamp >= Date.now() - 7 * 86_400_000).map((a) => new Date(a.timestamp).toDateString())).size;
  const steps = buildCircuit(prog, attempts, due, unread);
  const doneCount = steps.filter((s) => s.done).length;
  const nowIndex = steps.findIndex((s) => !s.done);
  const line = !attempts.length ? 'Start with the first step of today\'s circuit below.'
    : doneCount === steps.length ? `Today's circuit is complete. You practised on ${days} day${days === 1 ? '' : 's'} this week.`
    : `You practised on ${days} day${days === 1 ? '' : 's'} this week.`;

  el.innerHTML = `
    <section class="titleblock" aria-label="Countdown and greeting">
      <div class="tb-count">
        <span class="num">${weeks}</span>
        <span><b>week${weeks === 1 ? '' : 's'} to WASSCE</b><br><span class="muted small">${esc(CONFIG.WASSCE_LABEL)}</span></span>
      </div>
      <div class="tb-greet">
        <h1>${greeting()}${l ? `, ${esc(l.name.split(' ')[0])}` : ''}.</h1>
        <p>${esc(line)}</p>
      </div>
    </section>

    <section aria-labelledby="today">
      <div class="section-head"><h2 id="today">Today's circuit</h2><span class="muted small">${doneCount} of ${steps.length} done</span></div>
      <div class="circuit">
        <div class="circuit-trace" aria-hidden="true" style="--lit:${Math.round((doneCount / steps.length) * 100)}%"><span></span></div>
        ${steps.map((s, i) => `
          <div class="circuit-step ${s.done ? 'done' : i === nowIndex ? 'now' : 'later'}">
            <span class="circuit-pad" aria-hidden="true"></span>
            <div class="circuit-card">
              <span class="tag">${s.done ? `${icon('check', 16)} Done` : esc(s.tag)}</span>
              <span class="ttl">${esc(s.title)}</span>
              <span class="det">${esc(s.detail)}</span>
              ${s.done ? '' : `<a class="btn ${i === nowIndex ? 'btn-primary' : ''}" href="${s.href}">${esc(s.action)}</a>`}
            </div>
          </div>`).join('')}
      </div>
    </section>

    ${usingFirebase && due.length ? `
    <section aria-labelledby="due">
      <div class="section-head"><h2 id="due">Due soon</h2><a href="/assignments">All classwork</a></div>
      <div class="due-list">
        ${due.slice(0, 4).map((d) => {
          const lab = dueLabel(d);
          return `<a class="due-row" href="${d.href}">
            ${icon(d.kind === 'test' ? 'test' : 'clip', 26)}
            <span class="due-main"><b>${esc(d.title)}</b><br><span class="due-sub">${esc(d.detail)}</span></span>
            <span class="pill ${lab.urgent ? 'urgent' : ''}">${esc(lab.text)}</span>
          </a>`;
        }).join('')}
      </div>
    </section>` : ''}

    <section aria-labelledby="topics">
      <div class="section-head"><h2 id="topics">Topics</h2><span class="muted small">The bar lights up as you master each topic</span></div>
      <div class="tiles">
        ${topics.map((t) => {
          const lv = masteryLevel(prog, t.id);
          return `<a class="tile" href="/topic/${t.id}">
            <span class="num">${t.id}</span>
            <span class="tile-body"><span class="tile-title">${esc(t.short)}</span><span class="tile-level">${LEVELS[lv]}${lv ? `, ${prog!.topics[t.id].percent}%` : ''}</span></span>
            ${ledHTML(lv)}
          </a>`;
        }).join('')}
      </div>
    </section>`;
}
