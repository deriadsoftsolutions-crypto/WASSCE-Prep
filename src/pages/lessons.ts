import topicsData from '../data/topics.json';
import type { Topic } from '../types';
import { esc, fmtDate } from '../lib/dom';
import { feedbackHTML, toast } from '../lib/ui';
import { icon, topicIcon } from '../lib/icons';
import { viewerHref } from '../lib/viewable';
import { markdown } from '../lib/markdown';
import { learner, saveResult } from '../lib/session';
import { storage, usingFirebase } from '../storage';
import { ACTIVITIES } from '../activities';
import { getLesson, lessonsFor, type Block, type Lesson } from '../firebase/lessons';

const topics = topicsData as Topic[];
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const topicName = (id: number) => (id ? `Topic ${id}, ${topics.find((t) => t.id === id)?.short ?? ''}` : 'General');

/** Lessons this learner has finished, by lesson id, with the date. */
export async function finishedLessons(): Promise<Map<string, number>> {
  const l = learner();
  const out = new Map<string, number>();
  if (!l) return out;
  for (const a of await storage.getAttempts({ learnerId: l.id, kind: 'lesson' })) {
    const id = a.itemId.replace(/^lesson:/, '');
    if (!out.has(id)) out.set(id, a.timestamp);
  }
  return out;
}

/** A learner's published lessons, optionally only for one topic. Empty in on-device mode. */
export async function myLessons(topicId?: number): Promise<Lesson[]> {
  const l = learner();
  if (!usingFirebase || !l) return [];
  const { isTeacher } = await import('../firebase/account');
  const all = await lessonsFor(l, await isTeacher().catch(() => false)).catch(() => [] as Lesson[]);
  return topicId == null ? all : all.filter((x) => x.topicId === topicId);
}

export function lessonCardsHTML(list: Lesson[], done: Map<string, number>, showTopic = true): string {
  return `<div class="act-cards">${list.map((x) => `
    <a class="act-card" href="/lessons/${x.id}">
      ${showTopic ? `<span class="muted small" style="display:flex;gap:6px;align-items:center">${x.topicId ? topicIcon(x.topicId, 18) : icon('paper1', 18)} ${esc(topicName(x.topicId))}</span>` : ''}
      <span class="ac-title">${esc(x.title)}</span>
      <span class="ac-blurb">${esc(x.summary)}</span>
      <span class="ac-foot">${done.has(x.id) ? `<span class="pill ok">${icon('check', 14)} Finished</span>` : '<span class="pill accent">New</span>'}<span class="ac-go">${done.has(x.id) ? 'Read again' : 'Read'}</span></span>
    </a>`).join('')}</div>`;
}

function blockHTML(b: Block, i: number): string {
  switch (b.type) {
    case 'text':
      return `<div class="lesson-text">${markdown(b.md)}</div>`;
    case 'image':
      return `<figure class="lesson-fig"><img src="${esc(b.url)}" alt="${esc(b.alt || b.caption || 'Lesson image')}" loading="lazy" />${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ''}</figure>`;
    case 'video':
      return `<figure class="lesson-video" data-yt="${esc(b.youtubeId)}">
        <button type="button" class="btn btn-big" data-play="${i}">${icon('play', 20)} Play video <span class="muted small">(uses mobile data)</span></button>
        ${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ''}</figure>`;
    case 'activity': {
      const a = ACTIVITIES[b.activityId];
      return `<a class="act-card lesson-act" href="/topic/${b.topicId}/${esc(b.activityId)}">
        <span class="muted small">Activity, ${esc(topicName(b.topicId))}</span>
        <span class="ac-title">${esc(a?.title ?? b.activityId)}</span>
        <span class="ac-blurb">${esc(a?.blurb ?? '')}</span>
        <span class="ac-foot"><span></span><span class="ac-go">Open activity</span></span></a>`;
    }
    case 'check':
      return `<div class="lesson-check card" data-check="${i}">
        <p class="muted small" style="margin:0 0 4px">Quick check</p>
        <p class="qtext" style="margin:0 0 12px">${esc(b.question)}</p>
        <div class="options">${b.options.map((o, k) => `<button type="button" class="option" data-ans="${k}"><span class="letter">${LETTERS[k]}</span><span>${esc(o)}</span></button>`).join('')}</div>
        <div data-checkfb></div></div>`;
    case 'link': {
      const inSite = viewerHref(b.url);
      return inSite
        ? `<p class="row"><a class="btn" href="${esc(inSite)}">${esc(b.label || b.url)}</a><a class="btn btn-sm" href="${esc(b.url)}" download>Download</a></p>`
        : `<p><a class="btn" href="${esc(b.url)}" ${b.url.startsWith('/') ? '' : 'target="_blank" rel="noopener"'}>${esc(b.label || b.url)}</a></p>`;
    }
  }
}

export async function lessonPage(el: HTMLElement, params: Record<string, string>) {
  const l = learner();
  if (!usingFirebase || !l) { el.innerHTML = '<h1>Lesson</h1><p class="muted">Sign in to read lessons.</p>'; return; }
  el.innerHTML = '<div class="skel"><span></span><span class="tall"></span><span></span><span class="tall"></span></div>';
  const [lesson, done, list] = await Promise.all([getLesson(params.id).catch(() => null), finishedLessons(), myLessons()]);
  if (!lesson || (!lesson.published && l.className !== 'Teacher')) {
    el.innerHTML = '<h1>Lesson not found</h1><p><a href="/assignments">Back to classwork</a></p>';
    return;
  }
  const idx = list.findIndex((x) => x.id === lesson.id);
  const next = idx >= 0 ? list.slice(idx + 1).find((x) => x.topicId === lesson.topicId) : undefined;
  const checks = lesson.blocks.map((b, i) => ({ b, i })).filter((x) => x.b.type === 'check');
  const answers = new Map<number, boolean>();
  const finishedAt = done.get(lesson.id);

  el.innerHTML = `
    <div class="act-header">
      <a class="back" href="${lesson.topicId ? `/topic/${lesson.topicId}` : '/assignments'}" aria-label="Back">${icon('back', 22)}</a>
      <div style="min-width:0">
        <div class="crumb-line">${esc(topicName(lesson.topicId))}${lesson.published ? '' : '. Draft: learners cannot see it yet'}</div>
        <h1>${esc(lesson.title)}</h1>
      </div>
    </div>
    <article class="lesson">
      ${lesson.summary ? `<p class="lesson-summary">${esc(lesson.summary)}</p>` : ''}
      ${lesson.blocks.map(blockHTML).join('')}
    </article>
    <div class="card lesson-end">
      <div data-finish>${finishedAt
        ? `<p style="margin:0" class="mark-ok">${icon('check', 18)} You finished this lesson on ${fmtDate(finishedAt)}.</p>`
        : `<p style="margin:0 0 10px">${checks.length ? `Try the ${checks.length === 1 ? 'quick check' : `${checks.length} quick checks`} above, then` : 'When you have read it all,'} tap the button.</p>
           <button class="btn btn-primary btn-big" data-finish-btn type="button">Mark as finished</button>`}</div>
      <div class="row" style="margin-top:12px">
        ${next ? `<a class="btn" href="/lessons/${next.id}">Next lesson: ${esc(next.title)}</a>` : ''}
        ${lesson.topicId ? `<a class="btn" href="/topic/${lesson.topicId}">Practise topic ${lesson.topicId}</a>` : ''}
      </div>
    </div>`;

  el.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    const play = t.closest<HTMLElement>('[data-play]');
    if (play) {
      const fig = play.closest<HTMLElement>('[data-yt]')!;
      if (!navigator.onLine) { toast('You are offline. Videos need the internet.'); return; }
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(fig.dataset.yt!)}?autoplay=1&rel=0`;
      frame.title = 'Lesson video';
      frame.allow = 'autoplay; encrypted-media; picture-in-picture';
      frame.allowFullscreen = true;
      frame.className = 'lesson-frame';
      play.replaceWith(frame);
      return;
    }
    const ans = t.closest<HTMLElement>('[data-ans]');
    const box = ans?.closest<HTMLElement>('[data-check]');
    if (ans && box && !answers.has(Number(box.dataset.check))) {
      const i = Number(box.dataset.check);
      const b = lesson.blocks[i] as Extract<Block, { type: 'check' }>;
      const pick = Number(ans.dataset.ans);
      const ok = pick === b.correct;
      answers.set(i, ok);
      box.querySelectorAll<HTMLButtonElement>('[data-ans]').forEach((o) => {
        const k = Number(o.dataset.ans);
        o.disabled = true;
        if (k === b.correct) o.classList.add('correct');
        else if (k === pick) o.classList.add('wrong');
      });
      (box.querySelector('[data-checkfb]') as HTMLElement).innerHTML = feedbackHTML(ok ? 'ok' : 'bad',
        ok ? 'Correct!' : `Not quite. The answer is ${LETTERS[b.correct]}.`, b.explanation ? `<p style="margin:4px 0 0">${esc(b.explanation)}</p>` : '');
      return;
    }
    const fin = t.closest<HTMLButtonElement>('[data-finish-btn]');
    if (fin) {
      fin.disabled = true;
      const correct = [...answers.values()].filter(Boolean).length;
      await saveResult({
        kind: 'lesson', itemId: `lesson:${lesson.id}`, topicId: lesson.topicId || undefined,
        score: checks.length ? correct : 1, max: checks.length || 1,
        details: { title: lesson.title, checks: checks.length, answered: answers.size, correct },
      });
      (el.querySelector('[data-finish]') as HTMLElement).innerHTML = `<p style="margin:0" class="mark-ok">${icon('check', 18)} Lesson finished.${checks.length ? ` Quick checks: ${correct} of ${checks.length} right.` : ''}</p>`;
      toast('Lesson finished. Well done!');
    }
  });
}
