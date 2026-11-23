import { esc, fmtDate, fmtTime } from '../lib/dom';
import { confirmDialog, feedbackHTML, toast } from '../lib/ui';
import { learner } from '../lib/session';
import { navigate } from '../router';
import {
  assessmentsFor, autoScore, getAssessment, getKey, getQuestions, myAttempt, myResult, myStart, startAssessment, statusOf, submitAttempt,
  type Assessment, type Attempt, type KeyEntry, type Question, type Response, type Result,
} from '../firebase/assessments';
import { richText } from './assignments';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function windowText(a: Assessment): string {
  const parts: string[] = [];
  if (a.opensAt) parts.push(`Opens ${fmtDate(a.opensAt)}`);
  if (a.closesAt) parts.push(`Closes ${fmtDate(a.closesAt)}`);
  parts.push(a.timeLimitMin ? `${a.timeLimitMin} minutes` : 'No time limit');
  return parts.join(' · ');
}

/** HTML list of tests for the Classwork page. */
export async function testsListHTML(className: string, all = false): Promise<string> {
  const list = await assessmentsFor(className, all);
  if (!list.length) return `<div class="card"><p style="margin:0">${all ? 'No published tests yet.' : 'No tests for your class yet.'}</p></div>`;
  const rows = await Promise.all(list.map(async (a) => {
    const [att, res, start] = await Promise.all([myAttempt(a.id).catch(() => null), myResult(a.id).catch(() => null), myStart(a.id).catch(() => null)]);
    const st = statusOf(a);
    const pill = res ? `<span class="pill ok">Result: ${res.total} / ${res.max}</span>`
      : att ? '<span class="pill ok">Submitted</span>'
      : start && st === 'open' ? '<span class="pill accent">In progress</span>'
      : st === 'open' ? '<span class="pill accent">Open now</span>'
      : st === 'upcoming' ? '<span class="pill">Upcoming</span>'
      : '<span class="pill" style="background:var(--bad-soft);color:var(--bad)">Closed</span>';
    return `<a class="topic-card" href="/tests/${a.id}" style="flex-direction:column;align-items:flex-start">
      <div class="row" style="width:100%"><b style="font-size:1.15rem">📝 ${esc(a.title)}</b><span class="spacer"></span>${pill}</div>
      <div class="muted small">${all ? `${esc(a.className || 'All classes')} · ` : ''}${a.questionCount} questions · ${a.totalMarks} marks · ${esc(windowText(a))}</div></a>`;
  }));
  return `<div class="qlist">${rows.join('')}</div>`;
}

export async function testPage(el: HTMLElement, params: Record<string, string>): Promise<(() => void) | void> {
  const l = learner();
  if (!l) { el.innerHTML = '<h1>Test</h1><p class="muted">Sign in to take tests.</p>'; return; }
  el.innerHTML = '<p class="muted">Loading...</p>';
  const id = params.id;
  const [a, attempt, result, start] = await Promise.all([
    getAssessment(id).catch(() => null), myAttempt(id).catch(() => null), myResult(id).catch(() => null), myStart(id).catch(() => null),
  ]);
  if (!a || !a.published) { el.innerHTML = '<h1>Test not found</h1><p><a href="/assignments">Back to classwork</a></p>'; return; }
  const head = `<a class="crumb" href="/assignments">← Classwork</a>
    <div class="page-head"><h1>${esc(a.title)}</h1><span class="pill">${a.questionCount} questions · ${a.totalMarks} marks</span></div>`;

  if (attempt) return renderResults(el, head, a, attempt, result);

  const st = statusOf(a);
  if (st === 'upcoming') { el.innerHTML = `${head}<div class="card"><p style="margin:0">This test opens on <b>${fmtDate(a.opensAt!)}</b>.</p></div>`; return; }
  if (st === 'closed' && !start) { el.innerHTML = `${head}<div class="card"><p style="margin:0">This test closed on ${fmtDate(a.closesAt!)}. You did not take it.</p></div>`; return; }

  if (!start) {
    el.innerHTML = `${head}
      <div class="card stack">
        ${a.instructions ? `<p style="margin:0">${richText(a.instructions)}</p>` : ''}
        <ul style="margin:0">
          <li>${a.questionCount} questions, ${a.totalMarks} marks.</li>
          <li>${a.timeLimitMin ? `You have <b>${a.timeLimitMin} minutes</b> from when you press Start. The test is submitted automatically when time runs out.` : 'There is no time limit.'}</li>
          ${a.closesAt ? `<li>It must be submitted before <b>${fmtDate(a.closesAt)}</b>.</li>` : ''}
          <li>You can take it <b>once</b>. You need internet to start and to submit.</li>
        </ul>
        <div data-err></div>
        <button class="btn btn-primary btn-big" data-start type="button">Start the test</button>
      </div>`;
    el.querySelector('[data-start]')!.addEventListener('click', async (e) => {
      const btn = e.currentTarget as HTMLButtonElement;
      if (!navigator.onLine) { (el.querySelector('[data-err]') as HTMLElement).innerHTML = feedbackHTML('bad', 'You are offline. Connect to the internet to start.'); return; }
      if (!(await confirmDialog(a.timeLimitMin ? `Start now? Your ${a.timeLimitMin} minutes begin immediately.` : 'Start the test now?', 'Start'))) return;
      btn.disabled = true;
      try {
        await startAssessment(id);
        navigate(`/tests/${id}`, true);
      } catch (ex) {
        console.error(ex);
        btn.disabled = false;
        (el.querySelector('[data-err]') as HTMLElement).innerHTML = feedbackHTML('bad', 'Could not start the test. Check your internet connection and try again.');
      }
    });
    return;
  }

  return renderTaking(el, head, a, start, l.name, l.className);
}

async function renderTaking(el: HTMLElement, head: string, a: Assessment, startedAt: number, name: string, className: string): Promise<() => void> {
  const questions = await getQuestions(a.id).catch(() => [] as Question[]);
  const saveKey = `wassce.test.${a.id}.${learner()?.id}`;
  let responses: Record<string, Response> = {};
  try { responses = JSON.parse(localStorage.getItem(saveKey) ?? '{}'); } catch { /* ignore */ }
  const store = () => { try { localStorage.setItem(saveKey, JSON.stringify(responses)); } catch { /* ignore */ } };
  const deadlines = [a.timeLimitMin ? startedAt + a.timeLimitMin * 60_000 : Infinity, a.closesAt ?? Infinity];
  const deadline = Math.min(...deadlines);
  let submitting = false;
  let timer = 0;

  el.innerHTML = `${head}
    ${Number.isFinite(deadline) ? '<div class="card" style="position:sticky;top:70px;z-index:5;padding:10px 16px"><div class="row"><b>Time left</b><span class="spacer"></span><span class="timer" data-left></span></div></div>' : ''}
    ${questions.map((q, i) => `
      <div class="card" data-q="${esc(q.id)}">
        <div class="qmeta"><span>Question ${i + 1} of ${questions.length}</span><span>${q.marks} mark${q.marks === 1 ? '' : 's'}</span></div>
        <p class="qtext">${richText(q.text)}</p>
        ${q.type === 'mcq' ? `<div class="options">${(q.options ?? []).map((o, k) => `
            <button type="button" class="option ${responses[q.id] === k ? 'selected' : ''}" data-opt="${k}"><span class="letter">${LETTERS[k]}</span><span>${esc(o)}</span></button>`).join('')}</div>`
        : q.type === 'number' ? `<div class="row"><input data-num inputmode="decimal" style="max-width:260px" value="${esc(responses[q.id] ?? '')}" placeholder="Your answer" />${q.unit ? `<b>${esc(q.unit)}</b>` : ''}</div>
            <p class="muted small" style="margin:6px 0 0">You can type fractions and pi, for example 2*pi/3.</p>`
        : `<textarea data-short rows="5" placeholder="Type your answer">${esc(responses[q.id] ?? '')}</textarea>`}
      </div>`).join('')}
    <div class="card"><div class="row"><span data-count class="muted"></span><span class="spacer"></span>
      <button class="btn btn-accent btn-big" data-submit type="button">Submit test</button></div><div data-err></div></div>`;

  const answered = () => questions.filter((q) => responses[q.id] !== undefined && responses[q.id] !== null && responses[q.id] !== '').length;
  const updateCount = () => { (el.querySelector('[data-count]') as HTMLElement).textContent = `${answered()} of ${questions.length} answered. Your answers are saved on this device as you go.`; };
  updateCount();

  const doSubmit = async (auto = false) => {
    if (submitting) return;
    const err = el.querySelector('[data-err]') as HTMLElement;
    if (!navigator.onLine) { err.innerHTML = feedbackHTML('bad', 'You are offline.', '<p>Your answers are saved on this device. Reconnect to the internet and tap Submit again.</p>'); return; }
    submitting = true;
    const btn = el.querySelector('[data-submit]') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Submitting...';
    try {
      await Promise.race([
        submitAttempt({ assessmentId: a.id, learnerName: name, className, responses, startedAt }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 20_000)),
      ]);
      clearInterval(timer);
      try { localStorage.removeItem(saveKey); } catch { /* ignore */ }
      toast(auto ? 'Time is up. Your test was submitted.' : 'Test submitted.');
      navigate(`/tests/${a.id}`, true);
    } catch (ex) {
      console.error(ex);
      submitting = false;
      btn.disabled = false;
      btn.textContent = 'Submit test';
      const late = (ex as { code?: string }).code === 'permission-denied';
      err.innerHTML = feedbackHTML('bad', late ? 'This test could not be accepted.' : 'Could not submit yet.',
        late ? '<p>The time limit or closing time has passed. Tell your teacher; they can let you retake it.</p>'
          : '<p>Your answers are safe on this device. Check the internet and tap Submit again.</p>');
    }
  };

  const tick = () => {
    const out = el.querySelector('[data-left]') as HTMLElement | null;
    if (!out) return;
    const left = (deadline - Date.now()) / 1000;
    out.textContent = fmtTime(left);
    out.classList.toggle('low', left < 120);
    if (left <= 0) { clearInterval(timer); void doSubmit(true); }
  };
  if (Number.isFinite(deadline)) { tick(); timer = window.setInterval(tick, 1000); }

  el.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    const opt = t.closest<HTMLElement>('[data-opt]');
    if (opt) {
      const card = opt.closest<HTMLElement>('[data-q]')!;
      responses[card.dataset.q!] = Number(opt.dataset.opt);
      card.querySelectorAll('[data-opt]').forEach((b) => b.classList.toggle('selected', b === opt));
      store(); updateCount();
      return;
    }
    if (t.closest('[data-submit]')) {
      const left = questions.length - answered();
      if (await confirmDialog(left ? `You have ${left} unanswered question${left > 1 ? 's' : ''}. Submit anyway? You cannot change your answers afterwards.` : 'Submit your test? You cannot change your answers afterwards.', 'Submit')) void doSubmit();
    }
  });
  el.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    const card = t.closest<HTMLElement>('[data-q]');
    if (!card) return;
    responses[card.dataset.q!] = t.value;
    store(); updateCount();
  });
  return () => clearInterval(timer);
}

async function renderResults(el: HTMLElement, head: string, a: Assessment, attempt: Attempt, result: Result | null) {
  const [questions, key] = await Promise.all([getQuestions(a.id).catch(() => [] as Question[]), getKey(a.id)]);
  const showKey = !!key;
  let autoTotal = 0, autoMax = 0, pendingShort = 0;
  for (const q of questions) {
    const s = autoScore(q, key?.[q.id], attempt.responses[q.id] ?? null);
    if (q.type === 'short') pendingShort++;
    else if (s !== null) { autoTotal += s; autoMax += q.marks; }
  }
  const summary = result
    ? feedbackHTML(result.total >= result.max / 2 ? 'ok' : 'info', `Your result: ${result.total} / ${result.max}`, result.comment ? `<p style="margin:6px 0 0">${richText(result.comment)}</p>` : '')
    : showKey
      ? feedbackHTML('info', `Marked so far: ${autoTotal} / ${autoMax}`, pendingShort ? `<p style="margin:6px 0 0">${pendingShort} written answer${pendingShort > 1 ? 's' : ''} will be marked by your teacher.</p>` : '')
      : feedbackHTML('ok', 'Test submitted', `<p style="margin:6px 0 0">${a.showResults === 'after-close' && a.closesAt ? `Results appear after the test closes on ${fmtDate(a.closesAt)}.` : 'Your teacher will release your results.'}</p>`);

  el.innerHTML = `${head}
    <p class="muted" style="margin-top:-8px">Submitted ${fmtDate(attempt.submittedAt)}</p>
    ${summary}
    ${showKey || result ? questions.map((q, i) => answerReview(q, i, attempt.responses[q.id] ?? null, key?.[q.id], result)).join('') : ''}`;
}

function answerReview(q: Question, i: number, r: Response, k: KeyEntry | undefined, result: Result | null): string {
  const auto = autoScore(q, k, r);
  const got = result?.scores?.[q.id] ?? auto;
  const ok = got !== null && got >= q.marks;
  const yours = r === null || r === '' ? '<i>No answer</i>'
    : q.type === 'mcq' ? `${LETTERS[Number(r)]}. ${esc(q.options?.[Number(r)] ?? '')}` : richText(String(r));
  const correct = !k ? ''
    : q.type === 'mcq' && k.correct != null ? `${LETTERS[k.correct]}. ${esc(q.options?.[k.correct] ?? '')}`
    : q.type === 'number' && k.value != null ? `${esc(String(k.value))}${q.unit ? ` ${esc(q.unit)}` : ''}`
    : k.model ? richText(k.model) : '';
  return `<div class="review-item ${got === null ? '' : ok ? 'ok' : 'bad'}">
    <div class="qmeta"><span>Question ${i + 1}</span><span class="${got === null ? '' : ok ? 'mark-ok' : 'mark-bad'}">${got === null ? 'Waiting for teacher' : `${got} / ${q.marks}`}</span></div>
    <p style="font-weight:600;margin:6px 0">${richText(q.text)}</p>
    <p style="margin:4px 0">Your answer: <b>${yours}</b></p>
    ${correct && !ok ? `<p style="margin:4px 0">${q.type === 'short' ? 'Model answer' : 'Correct answer'}: <b>${correct}</b></p>` : ''}
    ${k?.explanation ? `<p class="muted" style="margin:4px 0 0">${richText(k.explanation)}</p>` : ''}
  </div>`;
}
