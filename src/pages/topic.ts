import topicsData from '../data/topics.json';
import paper1 from '../data/paper1.json';
import type { Paper1Question, Topic } from '../types';
import { esc } from '../lib/dom';
import { learner } from '../lib/session';
import { storage } from '../storage';
import { ACTIVITIES } from '../activities';
import { finishedLessons, lessonCardsHTML, myLessons } from './lessons';
import { mountPracticeQuiz } from '../quiz/quiz';
import { topicIcon } from '../lib/icons';
import { ledHTML, masteryLevel } from './home';
import type { Progress } from '../types';

const LV = ['Not started', 'Learning', 'Practising', 'Nearly there', 'Mastered'];
function topicMeter(p: Progress | null, id: number): string {
  const lv = masteryLevel(p, id);
  return `<div style="display:flex;align-items:center;gap:12px"><span><span class="num" style="font-size:2.4rem">${p?.topics[id]?.percent ?? 0}%</span><br><span class="muted small">${LV[lv]}</span></span>${ledHTML(lv)}</div>`;
}

const topics = topicsData as Topic[];

export async function topicPage(el: HTMLElement, params: Record<string, string>) {
  const id = Number(params.id);
  const t = topics.find((x) => x.id === id);
  if (!t) {
    el.innerHTML = '<h1>Topic not found</h1><p><a href="/">Back to all topics</a></p>';
    return;
  }
  const l = learner();
  const prog = l ? await storage.getProgress(l.id) : null;
  const prev = topics.find((x) => x.id === id - 1);
  const next = topics.find((x) => x.id === id + 1);
  const qs = (paper1 as Paper1Question[]).filter((q) => q.topic === id);
  const [topicLessons, doneLessons] = await Promise.all([myLessons(id), finishedLessons()]);

  el.innerHTML = `
    <a class="crumb" href="/">← All topics</a>
    <div class="page-head">
      <div>
        <div class="muted" style="font-weight:700;display:flex;gap:8px;align-items:center">${topicIcon(t.id, 22)} Topic ${t.id}</div>
        <h1>${esc(t.title)}</h1>
      </div>
      <div class="topic-ring">${topicMeter(prog, id)}</div>
    </div>
    <div class="grid-2">
      <div class="card">
        <h2>What this topic is about</h2>
        <p>${esc(t.summary)}</p>
        <p class="muted small" style="margin:0">
          Paper 1: Q${t.paper1.join(', Q')}${t.paper2.length ? `<br>Paper 2: ${t.paper2.map(esc).join(', ')}` : ''}
        </p>
      </div>
      <div class="card">
        <h2>Key ideas</h2>
        <ul class="key-ideas">${t.keyIdeas.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>
      </div>
    </div>
    ${topicLessons.length ? `<section><h2>Lessons</h2>${lessonCardsHTML(topicLessons, doneLessons, false)}</section>` : ''}
    <section>
      <h2>Activities</h2>
      <div class="act-cards">
        ${t.activities.map((a, i) => {
          const it = prog?.topics[id]?.items[`activity:${a}`];
          const info = ACTIVITIES[a];
          return `<a class="act-card" href="/topic/${id}/${esc(a)}">
            <span class="muted small">Activity ${i + 1} of ${t.activities.length}</span>
            <span class="ac-title">${esc(info?.title ?? a)}</span>
            <span class="ac-blurb">${esc(info?.blurb ?? '')}</span>
            <span class="ac-foot">${it ? `<span class="pill ${it.best >= 0.8 ? 'ok' : 'accent'}">Best ${Math.round(it.best * 100)}%</span>` : '<span class="pill">Not tried yet</span>'}<span class="ac-go">${it ? 'Try again' : 'Start'}</span></span>
          </a>`;
        }).join('')}
      </div>
    </section>
    <section id="questions">
      <div class="card">
        <h2>Paper 1 questions for this topic</h2>
        <p class="muted">Answer each question to see if you are right and why.</p>
        <div id="topic-quiz"></div>
      </div>
    </section>
    <div class="row" style="justify-content:space-between;margin-top:16px">
      ${prev ? `<a class="btn" href="/topic/${prev.id}">← Topic ${prev.id}</a>` : '<span></span>'}
      ${next ? `<a class="btn btn-primary" href="/topic/${next.id}">Topic ${next.id} →</a>` : '<a class="btn btn-primary" href="/mock">Full Paper 1 Mock →</a>'}
    </div>`;

  const cleanups: (() => void)[] = [];
  cleanups.push(mountPracticeQuiz(el.querySelector('#topic-quiz') as HTMLElement, qs, id));

  const refreshRing = async () => {
    const l2 = learner();
    if (!l2) return;
    const p = await storage.getProgress(l2.id);
    const host = el.querySelector('.topic-ring');
    if (host) host.innerHTML = topicMeter(p, id);
  };
  window.addEventListener('progress-changed', refreshRing);
  cleanups.push(() => window.removeEventListener('progress-changed', refreshRing));

  return () => cleanups.forEach((c) => c());
}
