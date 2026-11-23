import type { Letter, Paper1Question, Topic } from '../types';
import { esc, fmtTime, shuffle } from '../lib/dom';
import { feedbackHTML, confirmDialog } from '../lib/ui';
import { saveResult, learner } from '../lib/session';
import topicsData from '../data/topics.json';

const topics = topicsData as Topic[];
const LETTERS: Letter[] = ['A', 'B', 'C', 'D'];
const topicName = (id: number) => topics.find((t) => t.id === id)?.short ?? `Topic ${id}`;

function optionsHTML(q: Paper1Question, chosen: Letter | undefined, reveal: boolean): string {
  return LETTERS.map((L) => {
    let cls = 'option';
    if (reveal) {
      if (L === q.answer) cls += ' correct';
      else if (L === chosen) cls += ' wrong';
    } else if (L === chosen) cls += ' selected';
    return `<button type="button" class="${cls}" data-opt="${L}" ${reveal ? 'disabled' : ''} aria-pressed="${L === chosen}">
      <span class="letter">${L}</span><span>${esc(q.options[L])}</span></button>`;
  }).join('');
}

/* ------------------------------------------------------------------ */
/* Practice mode: immediate feedback after each question (topic pages) */
/* ------------------------------------------------------------------ */

export function mountPracticeQuiz(el: HTMLElement, questions: Paper1Question[], topicId: number): () => void {
  let order = questions.slice();
  let i = 0;
  let answers: (Letter | undefined)[] = [];
  const startedAt = Date.now();

  const render = () => {
    if (i >= order.length) return renderSummary();
    const q = order[i];
    const chosen = answers[i];
    const done = chosen !== undefined;
    el.innerHTML = `
      <div class="qmeta"><span>Question ${i + 1} of ${order.length}</span><span>Paper 1 Q${q.n}</span></div>
      <p class="qtext">${esc(q.question)}</p>
      <div class="options">${optionsHTML(q, chosen, done)}</div>
      ${done ? feedbackHTML(chosen === q.answer ? 'ok' : 'bad', chosen === q.answer ? 'Correct!' : `Not quite. The answer is ${q.answer}.`, `<p>${esc(q.explanation)}</p>`) : ''}
      <div class="quiz-foot">
        <button class="btn" data-act="prev" ${i === 0 ? 'disabled' : ''} type="button">Back</button>
        <button class="btn btn-primary" data-act="next" ${done ? '' : 'disabled'} type="button">${i === order.length - 1 ? 'See my score' : 'Next question'}</button>
      </div>`;
  };

  const renderSummary = () => {
    const score = order.reduce((s, q, k) => s + (answers[k] === q.answer ? 1 : 0), 0);
    const pct = Math.round((score / order.length) * 100);
    el.innerHTML = `
      <div class="center stack">
        <div class="scorebig">${score} / ${order.length}</div>
        <p>${pct >= 80 ? 'Excellent work!' : pct >= 50 ? 'Good effort. Review the ones you missed and try again.' : 'Keep practising. Read the explanations, then try again.'}</p>
        <div class="row" style="justify-content:center">
          <button class="btn btn-primary" data-act="retry" type="button">Try again</button>
          <button class="btn" data-act="retry-wrong" type="button" ${score === order.length ? 'disabled' : ''}>Retry the ones I missed</button>
        </div>
      </div>`;
    void saveResult({
      kind: 'topic-quiz', itemId: `quiz:${topicId}`, topicId, score, max: order.length,
      durationSec: Math.round((Date.now() - startedAt) / 1000),
      details: { answers: order.map((q, k) => ({ n: q.n, chosen: answers[k] ?? null, correct: answers[k] === q.answer })) },
    });
  };

  const onClick = (e: Event) => {
    const t = e.target as HTMLElement;
    const opt = t.closest<HTMLElement>('[data-opt]');
    if (opt && answers[i] === undefined) {
      answers[i] = opt.dataset.opt as Letter;
      render();
      return;
    }
    const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'next') { i++; render(); }
    if (act === 'prev') { i = Math.max(0, i - 1); render(); }
    if (act === 'retry') { order = shuffle(questions); answers = []; i = 0; render(); }
    if (act === 'retry-wrong') {
      order = order.filter((q, k) => answers[k] !== q.answer);
      answers = []; i = 0; render();
    }
  };
  el.addEventListener('click', onClick);
  render();
  return () => el.removeEventListener('click', onClick);
}

/* ------------------------------------------------------------------ */
/* Mock mode: full paper, optional timer, review at the end           */
/* ------------------------------------------------------------------ */

const MOCK_KEY = 'wassce.mock.inprogress.v1';

interface MockState {
  learnerId: string;
  order: number[];
  answers: Record<number, Letter>;
  flags: number[];
  startedAt: number;
  deadline: number | null;
  current: number;
}

function loadMock(): MockState | null {
  try {
    const raw = localStorage.getItem(MOCK_KEY);
    const s = raw ? (JSON.parse(raw) as MockState) : null;
    return s && s.learnerId === learner()?.id ? s : null;
  } catch {
    return null;
  }
}
function storeMock(s: MockState | null) {
  try {
    if (s) localStorage.setItem(MOCK_KEY, JSON.stringify(s));
    else localStorage.removeItem(MOCK_KEY);
  } catch { /* ignore */ }
}

export interface MockOptions {
  minutes: number;
  shuffle: boolean;
}

export function mountMock(el: HTMLElement, all: Paper1Question[], opts: MockOptions): () => void {
  const byN = new Map(all.map((q) => [q.n, q]));
  let state: MockState | null = loadMock();
  let timer: number | undefined;

  const stopTimer = () => { if (timer) clearInterval(timer); timer = undefined; };

  const renderStart = () => {
    const resume = state;
    el.innerHTML = `
      <div class="card qcard stack">
        <h2>Full Paper 1 Mock</h2>
        <p>${all.length} objective questions covering all 10 topics. Choose one answer for each question. You see your score, the explanations and your score per topic at the end.</p>
        <ul>
          <li><b>Timer:</b> ${opts.minutes > 0 ? `${opts.minutes} minutes (the paper is submitted automatically when time runs out)` : 'no time limit'}</li>
          <li><b>Question order:</b> ${opts.shuffle ? 'shuffled' : 'same as the paper'}</li>
        </ul>
        <p class="muted small">Your teacher sets the timer and shuffle on the teacher page.</p>
        ${resume ? feedbackHTML('info', 'You have an unfinished mock.', `<p>${Object.keys(resume.answers).length} of ${all.length} answered.</p>`) : ''}
        <div class="row">
          ${resume ? '<button class="btn btn-primary btn-big" data-act="resume" type="button">Resume mock</button>' : ''}
          <button class="btn ${resume ? '' : 'btn-primary'} btn-big" data-act="start" type="button">${resume ? 'Start a new mock' : 'Start mock'}</button>
        </div>
      </div>`;
  };

  const begin = () => {
    const order = all.map((q) => q.n);
    state = {
      learnerId: learner()?.id ?? '',
      order: opts.shuffle ? shuffle(order) : order,
      answers: {}, flags: [], startedAt: Date.now(),
      deadline: opts.minutes > 0 ? Date.now() + opts.minutes * 60_000 : null,
      current: 0,
    };
    storeMock(state);
    renderQuestion();
  };

  const tick = () => {
    if (!state?.deadline) return;
    const left = (state.deadline - Date.now()) / 1000;
    const t = el.querySelector<HTMLElement>('.timer');
    if (t) {
      t.textContent = fmtTime(left);
      t.classList.toggle('low', left < 300);
    }
    if (left <= 0) {
      stopTimer();
      void finish(true);
    }
  };

  const renderQuestion = () => {
    if (!state) return renderStart();
    const s = state;
    const n = s.order[s.current];
    const q = byN.get(n)!;
    const answered = Object.keys(s.answers).length;
    el.innerHTML = `
      <div class="card qcard">
        <div class="qmeta">
          <span>Question ${s.current + 1} of ${s.order.length} · ${answered} answered</span>
          ${s.deadline ? `<span class="timer" aria-label="Time left">${fmtTime((s.deadline - Date.now()) / 1000)}</span>` : ''}
        </div>
        <p class="qtext">${esc(q.question)}</p>
        <div class="options">${optionsHTML(q, s.answers[n], false)}</div>
        <div class="quiz-foot">
          <button class="btn" data-act="prev" type="button" ${s.current === 0 ? 'disabled' : ''}>Back</button>
          <button class="btn btn-ghost" data-act="flag" type="button">${s.flags.includes(n) ? 'Unflag' : 'Flag for review'}</button>
          ${s.current < s.order.length - 1
            ? '<button class="btn btn-primary" data-act="next" type="button">Next</button>'
            : '<button class="btn btn-accent" data-act="submit" type="button">Submit paper</button>'}
        </div>
      </div>
      <div class="card qcard">
        <div class="row" style="justify-content:space-between;margin-bottom:8px"><b>Jump to a question</b>
          <button class="btn btn-accent btn-sm" data-act="submit" type="button">Submit paper</button></div>
        <div class="qnav">${s.order.map((qn, k) => `<button type="button" data-jump="${k}" class="${s.answers[qn] ? 'answered' : ''} ${k === s.current ? 'current' : ''} ${s.flags.includes(qn) ? 'flagged' : ''}" aria-label="Question ${k + 1}">${k + 1}</button>`).join('')}</div>
        <p class="muted small" style="margin:8px 0 0">Shaded = answered. Yellow line = flagged.</p>
      </div>`;
    if (s.deadline && !timer) timer = window.setInterval(tick, 1000);
  };

  const finish = async (timeUp = false) => {
    if (!state) return;
    stopTimer();
    const s = state;
    state = null;
    storeMock(null);
    const qs = s.order.map((n) => byN.get(n)!);
    const per: Record<number, { correct: number; total: number }> = {};
    let score = 0;
    for (const q of qs) {
      const ok = s.answers[q.n] === q.answer;
      if (ok) score++;
      const p = (per[q.topic] ??= { correct: 0, total: 0 });
      p.total++;
      if (ok) p.correct++;
    }
    const durationSec = Math.round((Date.now() - s.startedAt) / 1000);
    await saveResult({
      kind: 'mock', itemId: 'mock:paper1', score, max: qs.length, durationSec,
      details: { perTopic: per, answers: s.answers, timeUp },
    });
    renderReview(qs, s.answers, per, score, durationSec, timeUp);
  };

  const renderReview = (
    qs: Paper1Question[], answers: Record<number, Letter>,
    per: Record<number, { correct: number; total: number }>, score: number, durationSec: number, timeUp: boolean,
  ) => {
    const pct = Math.round((score / qs.length) * 100);
    const rows = Object.entries(per).sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([tid, v]) => {
        const p = Math.round((v.correct / v.total) * 100);
        return `<tr class="${p < 50 ? 'weak' : ''}"><td class="left">${Number(tid)}. ${esc(topicName(Number(tid)))}</td><td>${v.correct} / ${v.total}</td>
          <td style="min-width:120px"><div class="bar ${p < 50 ? 'weak' : ''}"><span style="width:${p}%"></span></div></td></tr>`;
      }).join('');
    el.innerHTML = `
      ${timeUp ? feedbackHTML('info', 'Time is up! Your paper was submitted automatically.') : ''}
      <div class="card center">
        <div class="scorebig">${score} / ${qs.length}</div>
        <p style="font-size:1.2rem;font-weight:700">${pct}% · time taken ${fmtTime(durationSec)}</p>
        <div class="row" style="justify-content:center">
          <button class="btn btn-primary" data-act="again" type="button">Try another mock</button>
          <a class="btn" href="/progress">My progress</a>
        </div>
      </div>
      <div class="card">
        <h2>Score per topic</h2>
        <div class="table-wrap"><table class="data"><thead><tr><th class="left">Topic</th><th>Score</th><th>Bar</th></tr></thead><tbody>${rows}</tbody></table></div>
        <p class="muted small">Topics under 50% are shown in red. Open those topic pages to practise.</p>
      </div>
      <div class="card">
        <div class="row" style="justify-content:space-between"><h2 style="margin:0">Answers and explanations</h2>
          <label class="switch"><input type="checkbox" data-act="wrong-only" /> Show wrong only</label></div>
        <div class="review-list" style="margin-top:12px">
          ${qs.map((q, k) => {
            const a = answers[q.n];
            const ok = a === q.answer;
            return `<div class="review-item ${ok ? 'ok' : 'bad'}" data-ok="${ok}">
              <div class="qmeta"><span>${k + 1}. Paper 1 Q${q.n} · ${esc(topicName(q.topic))}</span><span class="${ok ? 'mark-ok' : 'mark-bad'}">${ok ? '✓ Correct' : a ? '✗ Wrong' : '✗ Not answered'}</span></div>
              <p style="font-weight:600;margin:6px 0">${esc(q.question)}</p>
              <p style="margin:4px 0">Your answer: <b>${a ? `${a}. ${esc(q.options[a])}` : 'none'}</b></p>
              ${ok ? '' : `<p style="margin:4px 0">Correct answer: <b>${q.answer}. ${esc(q.options[q.answer])}</b></p>`}
              <p class="muted" style="margin:4px 0 0">${esc(q.explanation)}</p>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    window.scrollTo(0, 0);
  };

  const onClick = async (e: Event) => {
    const t = e.target as HTMLElement;
    const opt = t.closest<HTMLElement>('[data-opt]');
    if (opt && state) {
      const n = state.order[state.current];
      state.answers[n] = opt.dataset.opt as Letter;
      storeMock(state);
      el.querySelectorAll('[data-opt]').forEach((b) => {
        const on = (b as HTMLElement).dataset.opt === state!.answers[n];
        b.classList.toggle('selected', on);
        b.setAttribute('aria-pressed', String(on));
      });
      const nav = el.querySelector(`[data-jump="${state.current}"]`);
      nav?.classList.add('answered');
      const meta = el.querySelector('.qmeta span');
      if (meta) meta.textContent = `Question ${state.current + 1} of ${state.order.length} · ${Object.keys(state.answers).length} answered`;
      return;
    }
    const jump = t.closest<HTMLElement>('[data-jump]');
    if (jump && state) { state.current = Number(jump.dataset.jump); storeMock(state); renderQuestion(); window.scrollTo(0, 0); return; }
    const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
    if (!act) return;
    if (act === 'start') begin();
    else if (act === 'resume') renderQuestion();
    else if (act === 'again') { state = null; renderStart(); }
    else if (state && act === 'next') { state.current++; storeMock(state); renderQuestion(); window.scrollTo(0, 0); }
    else if (state && act === 'prev') { state.current--; storeMock(state); renderQuestion(); window.scrollTo(0, 0); }
    else if (state && act === 'flag') {
      const n = state.order[state.current];
      state.flags = state.flags.includes(n) ? state.flags.filter((x) => x !== n) : [...state.flags, n];
      storeMock(state);
      renderQuestion();
    } else if (state && act === 'submit') {
      const left = state.order.length - Object.keys(state.answers).length;
      const ok = await confirmDialog(left > 0 ? `You have ${left} unanswered question${left > 1 ? 's' : ''}. Submit anyway?` : 'Submit your paper now?', 'Submit');
      if (ok) await finish();
    }
  };

  const onChange = (e: Event) => {
    const t = e.target as HTMLInputElement;
    if (t.dataset.act === 'wrong-only') {
      el.querySelectorAll<HTMLElement>('.review-item').forEach((r) => {
        r.hidden = t.checked && r.dataset.ok === 'true';
      });
    }
  };

  el.addEventListener('click', onClick);
  el.addEventListener('change', onChange);
  renderStart();
  return () => {
    stopTimer();
    el.removeEventListener('click', onClick);
    el.removeEventListener('change', onChange);
  };
}
