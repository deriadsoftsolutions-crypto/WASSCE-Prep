/**
 * The unit lesson player (/study/:unitId?at=l:<lessonId>|t:<testId>|a:<assignmentId>).
 *
 * Left: the unit's running order. Each lesson is followed by the quick test and practical set with it,
 * then the unit's own assessments, with ticks for what is done.
 * Right: the current step: a lesson (its slides, then its text and quick checks), or a test or
 * assignment to open. Previous and Next walk the running order.
 *
 * Read budget (free plan, see firebase/reads.ts): everything here comes from the catalog and the
 * learner's own work kept on the device; only a lesson's text may cost one read, the first time.
 */
import { esc, fmtDate } from '../lib/dom';
import { icon } from '../lib/icons';
import { learner } from '../lib/session';
import { navigate } from '../router';
import { usingFirebase } from '../storage';
import { viewerHref } from '../lib/viewable';
import { audienceLabel, audienceOf, type ClassInfo } from '../lib/audience';
import { SLIDE_DECKS, slideFile } from '../data/slideDecks';
import { richText } from './assignments';
import { finishedLessons, mountLessonBody } from './lessons';
import type { Lesson } from '../firebase/lessons';
import type { Assessment } from '../firebase/assessments';
import type { Assignment } from '../firebase/assignments';
import type { MyWork } from '../firebase/mywork';
import type { Unit } from '../firebase/units';
import { buildModules, type Step } from '../lib/runningOrder';

type State = 'done' | 'started' | 'todo' | 'locked' | 'missed';

function stateOf(s: Step, work: MyWork, finished: Map<string, number>): State {
  if (s.kind === 'lesson') return finished.has(s.item.id) ? 'done' : 'todo';
  if (s.kind === 'assignment') return work.submissions[s.item.id] || work.feedback[s.item.id] ? 'done' : 'todo';
  const t = s.item;
  if (work.attempts[t.id] || work.results[t.id]) return 'done';
  if (t.opensAt && t.opensAt > Date.now()) return 'locked';
  if (t.closesAt && t.closesAt < Date.now()) return work.starts[t.id] ? 'started' : 'missed';
  return work.starts[t.id] ? 'started' : 'todo';
}

const stepLabel = (s: Step) => (s.kind === 'lesson' ? 'Lesson'
  : /^key assessment/i.test(s.item.title) ? `Key assessment, ${s.kind === 'test' ? 'written' : 'practical'}`
  : s.kind === 'test' ? 'Quick test' : 'Practical');
const stepMeta = (s: Step, work: MyWork): string => {
  if (s.kind === 'lesson') return 'Read';
  if (s.kind === 'test') { const r = work.results[s.item.id]; return r ? `${r.total} / ${r.max}` : `${s.item.totalMarks} marks`; }
  const f = work.feedback[s.item.id]; return f ? `${f.mark} / ${f.maxMarks}` : `${s.item.maxMarks} marks`;
};
const stateIcon = (st: State, kind: Step['kind']) =>
  st === 'done' ? `<span class="sp-dot done">${icon('check', 16)}</span>`
  : st === 'locked' ? `<span class="sp-dot locked">${icon('lock', 15)}</span>`
  : `<span class="sp-dot ${st}">${icon(kind === 'lesson' ? 'book' : kind === 'test' ? 'test' : 'clip', 15)}</span>`;

function ring(done: number, total: number): string {
  if (total && done === total) return `<span class="sp-ring full" aria-label="All done">${icon('check', 14)}</span>`;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return `<span class="sp-ring" style="--p:${pct}" aria-label="${done} of ${total} done"></span>`;
}

/** The slides of a lesson (from its "View the slides" link), shown at the top like a video. */
function slidesHTML(lesson: Lesson): string {
  const link = lesson.blocks.find((b): b is Extract<Lesson['blocks'][number], { type: 'link' }> => b.type === 'link' && !!SLIDE_DECKS[b.url]);
  if (!link) return '';
  const deck = SLIDE_DECKS[link.url];
  return `<figure class="sp-slides" data-deck="${esc(link.url)}" data-n="1" data-count="${deck.count}">
    <img data-sp-img src="${esc(slideFile(deck.dir, deck.count, 1))}" alt="Slide 1 of ${deck.count}: ${esc(deck.title)}" />
    <figcaption class="sp-slidebar">
      <button class="btn btn-sm" type="button" data-sp-prev aria-label="Previous slide">${icon('back', 16)}</button>
      <span data-sp-count>1 / ${deck.count}</span>
      <button class="btn btn-sm" type="button" data-sp-next aria-label="Next slide" style="transform:scaleX(-1)">${icon('back', 16)}</button>
      <span class="spacer"></span>
      <a class="btn btn-sm" href="${esc(viewerHref(link.url) ?? link.url)}">Full screen</a>
    </figcaption>
  </figure>`;
}

export async function studyPage(el: HTMLElement, params: Record<string, string>) {
  const l = learner();
  if (!usingFirebase || !l) { el.innerHTML = '<h1>Lesson player</h1><p class="muted">Sign in to use the lesson player.</p>'; return; }
  el.innerHTML = '<div class="skel"><span></span><span class="tall"></span><span></span></div>';
  const unitId = params.id;
  const [{ isTeacher }, { lessonsFor, getLessonForLearner }, asg, tst, { myWork }, units, { classNames }] = await Promise.all([
    import('../firebase/account'), import('../firebase/lessons'), import('../firebase/assignments'), import('../firebase/assessments'),
    import('../firebase/mywork'), import('../firebase/units'), import('../firebase/classes'),
  ]);
  const teacher = await isTeacher().catch(() => false);
  let unit: Unit | null; let lessons: Lesson[]; let tests: Assessment[]; let assignments: Assignment[]; let work: MyWork; let finished: Map<string, number>; let classes: ClassInfo[];
  try {
    const [u, ls, t, a, w, f, c] = await Promise.all([
      teacher ? units.getUnit(unitId) : units.learnerUnit(unitId), lessonsFor(l, teacher), tst.assessmentsFor(l), asg.assignmentsFor(l), myWork(), finishedLessons(), classNames().catch(() => []),
    ]);
    unit = u; lessons = ls; work = w; finished = f; classes = c;
    // Learners follow their own class's work; the teacher previews everything.
    tests = teacher ? [...t.mine, ...t.others] : t.mine;
    assignments = teacher ? [...a.mine, ...a.others] : a.mine;
  } catch {
    el.innerHTML = '<h1>Lesson player</h1><p class="mark-bad">Could not load this unit. Check your internet connection.</p>';
    return;
  }
  if (!unit) { el.innerHTML = '<h1>Unit not found</h1><p><a href="/learn">Back to Learn</a></p>'; return; }
  const modules = buildModules(unitId, lessons, tests, assignments);
  const steps = modules.flatMap((m) => m.steps);
  const back = `<a class="back" href="/learn/${esc(unitId)}" aria-label="Back to the unit">${icon('back', 22)}</a>`;
  if (!steps.length) {
    el.innerHTML = `<div class="act-header">${back}<div><div class="crumb-line">STEM ${unit.year}, ${esc(unit.code)}</div><h1>${esc(unit.subStrand)}</h1></div></div>
      <div class="card"><p style="margin:0">No lessons in this unit for your class yet.</p></div>`;
    return;
  }
  const POS = `wassce.study.${l.id}.${unitId}`;
  const wanted = new URLSearchParams(location.search).get('at') ?? (() => { try { return localStorage.getItem(POS); } catch { return null; } })();
  let current = steps.findIndex((s) => s.key === wanted);
  if (current < 0) current = Math.max(0, steps.findIndex((s) => stateOf(s, work, finished) !== 'done'));

  el.innerHTML = `
    <div class="act-header sp-head">${back}
      <div style="min-width:0"><div class="crumb-line">STEM ${unit.year}, unit ${esc(unit.code)}</div><h1>${esc(unit.subStrand)}</h1></div>
      <span class="spacer"></span><span class="sp-progress" data-sp-progress></span>
    </div>
    <div class="sp-layout">
      <nav class="sp-outline" aria-label="Running order" data-outline></nav>
      <section class="sp-main" aria-live="polite">
        <div data-sp-body></div>
        <div class="sp-nav">
          <button class="btn" type="button" data-sp-back>${icon('back', 18)} Previous</button>
          <span class="muted small" data-sp-where></span>
          <button class="btn btn-primary" type="button" data-sp-fwd>Next <span style="display:inline-flex;transform:scaleX(-1)">${icon('back', 18)}</span></button>
        </div>
      </section>
    </div>`;
  const outline = el.querySelector('[data-outline]') as HTMLElement;
  const body = el.querySelector('[data-sp-body]') as HTMLElement;
  let openModule = modules.findIndex((m) => m.steps.includes(steps[current]));

  const drawOutline = () => {
    const doneAll = steps.filter((s) => stateOf(s, work, finished) === 'done').length;
    (el.querySelector('[data-sp-progress]') as HTMLElement).innerHTML = `${ring(doneAll, steps.length)} <b>${doneAll} of ${steps.length}</b> done`;
    const cur = steps[current];
    const curModule = modules.findIndex((m) => m.steps.includes(cur));
    outline.innerHTML = `
      <details class="sp-phone-toggle" ${window.matchMedia('(min-width: 900px)').matches ? 'open' : ''}>
        <summary><span><b>${esc(stepLabel(cur))}${modules[curModule].number ? ` · Lesson ${modules[curModule].number} of ${modules.filter((m) => m.number).length}` : ''}</b><br><span class="muted small">${esc(cur.item.title)}</span></span><span class="sp-toggle-hint">Running order</span></summary>
        ${modules.map((m, mi) => {
          const done = m.steps.filter((s) => stateOf(s, work, finished) === 'done').length;
          const open = mi === openModule;
          return `<div class="sp-module ${open ? 'open' : ''}">
            <button type="button" class="sp-mhead" data-mod="${mi}" aria-expanded="${open}">
              <span class="sp-num">${m.number ?? icon('test', 16)}</span><span class="sp-mtitle">${esc(m.title)}</span>${ring(done, m.steps.length)}
            </button>
            ${open ? `<ol class="sp-steps">${m.steps.map((s) => {
              const st = stateOf(s, work, finished);
              const here = s === cur;
              return `<li><button type="button" class="sp-step ${here ? 'here' : ''} ${st}" data-step="${esc(s.key)}" ${here ? 'aria-current="step"' : ''}>
                ${stateIcon(st, s.kind)}<span class="sp-stitle"><span class="muted small">${esc(stepLabel(s))}</span><br>${esc(s.kind === 'lesson' ? s.item.title.replace(/^.*?:\s*/, '') : s.item.title)}</span>
                <span class="sp-smeta ${st === 'done' && s.kind !== 'lesson' ? 'ok' : ''}">${esc(stepMeta(s, work))}</span></button></li>`;
            }).join('')}</ol>` : ''}
          </div>`;
        }).join('')}
      </details>`;
  };

  const show = async (i: number) => {
    current = Math.max(0, Math.min(steps.length - 1, i));
    const s = steps[current];
    openModule = modules.findIndex((m) => m.steps.includes(s));
    try { localStorage.setItem(POS, s.key); } catch { /* ignore */ }
    history.replaceState(history.state, '', `/study/${encodeURIComponent(unitId)}?at=${encodeURIComponent(s.key)}`);
    (el.querySelector('[data-sp-back]') as HTMLButtonElement).disabled = current === 0;
    const fwd = el.querySelector('[data-sp-fwd]') as HTMLButtonElement;
    fwd.innerHTML = current === steps.length - 1 ? 'Back to the unit' : `Next <span style="display:inline-flex;transform:scaleX(-1)">${icon('back', 18)}</span>`;
    (el.querySelector('[data-sp-where]') as HTMLElement).textContent = `Step ${current + 1} of ${steps.length}`;
    drawOutline();
    const st = stateOf(s, work, finished);
    const forWhom = (x: Assessment | Assignment) => (teacher ? `<p class="muted small" style="margin:0 0 8px">Set for ${esc(audienceLabel(audienceOf(x), classes))}</p>` : '');
    if (s.kind === 'lesson') {
      body.innerHTML = '<div class="skel"><span class="tall"></span><span></span></div>';
      const full = await getLessonForLearner(s.item.id).catch(() => null);
      if (steps[current] !== s) return; // moved on while it loaded
      if (!full) { body.innerHTML = '<div class="card"><p class="mark-bad" style="margin:0">Could not open this lesson. Check your internet connection.</p></div>'; return; }
      body.innerHTML = `<h2 class="sp-title">${esc(full.title)}</h2>${slidesHTML(full)}<div data-sp-lesson></div>`;
      mountLessonBody(body.querySelector('[data-sp-lesson]') as HTMLElement, full, finished.get(full.id), () => { finished.set(full.id, Date.now()); drawOutline(); });
      wireSlides();
    } else if (s.kind === 'test') {
      const t = s.item; const r = work.results[t.id];
      body.innerHTML = `<h2 class="sp-title">${esc(t.title)}</h2>
        <div class="card sp-task">${forWhom(t)}
          <div class="sp-facts"><span>${icon('test', 18)} ${t.questionCount} questions</span><span>${t.totalMarks} marks</span><span>${t.timeLimitMin ? `${t.timeLimitMin} minutes` : 'No time limit'}</span>${t.closesAt ? `<span>Closes ${esc(fmtDate(t.closesAt))}</span>` : ''}</div>
          ${t.instructions ? `<p>${richText(t.instructions)}</p>` : ''}
          ${st === 'done' ? `<p class="mark-ok">${icon('check', 18)} ${r ? `Your result: <b>${r.total} / ${r.max}</b>` : 'You have submitted this test.'}</p><a class="btn" href="/tests/${esc(t.id)}">See my answers</a>`
            : st === 'locked' ? `<p class="muted">This test opens on <b>${esc(fmtDate(t.opensAt!))}</b>.</p>`
            : st === 'missed' ? '<p class="muted">This test has closed.</p>'
            : `<a class="btn btn-primary btn-big" href="/tests/${esc(t.id)}">${st === 'started' ? 'Continue the test' : 'Open the test'}</a>`}
        </div>`;
    } else {
      const a = s.item; const f = work.feedback[a.id];
      body.innerHTML = `<h2 class="sp-title">${esc(a.title)}</h2>
        <div class="card sp-task">${forWhom(a)}
          <div class="sp-facts"><span>${icon('clip', 18)} ${a.maxMarks} marks</span>${a.dueAt ? `<span>Due ${esc(fmtDate(a.dueAt))}</span>` : '<span>No deadline</span>'}</div>
          <details class="sp-instr" ${st === 'done' ? '' : 'open'}><summary><b>Instructions</b></summary><p style="white-space:pre-wrap">${richText(a.instructions)}</p></details>
          ${f ? `<p class="mark-ok">${icon('check', 18)} Marked: <b>${f.mark} / ${f.maxMarks}</b></p>` : st === 'done' ? `<p class="mark-ok">${icon('check', 18)} Handed in. You can change it until your teacher marks it.</p>` : ''}
          <a class="btn ${st === 'done' ? '' : 'btn-primary btn-big'}" href="/assignments/${esc(a.id)}">${st === 'done' ? 'Open my work' : 'Open the assignment to hand in'}</a>
        </div>`;
    }
    if (window.matchMedia('(max-width: 899px)').matches) el.querySelector('.sp-main')?.scrollIntoView({ block: 'start' });
  };

  function wireSlides() {
    const fig = body.querySelector<HTMLElement>('[data-deck]');
    if (!fig) return;
    const deck = SLIDE_DECKS[fig.dataset.deck!];
    const img = fig.querySelector('[data-sp-img]') as HTMLImageElement;
    const go = (n: number) => {
      n = Math.max(1, Math.min(deck.count, n));
      fig.dataset.n = String(n);
      img.src = slideFile(deck.dir, deck.count, n);
      img.alt = `Slide ${n} of ${deck.count}: ${deck.title}`;
      (fig.querySelector('[data-sp-count]') as HTMLElement).textContent = `${n} / ${deck.count}`;
      if (n < deck.count) new Image().src = slideFile(deck.dir, deck.count, n + 1);
    };
    fig.querySelector('[data-sp-prev]')!.addEventListener('click', () => go(Number(fig.dataset.n) - 1));
    fig.querySelector('[data-sp-next]')!.addEventListener('click', () => go(Number(fig.dataset.n) + 1));
    // Swipe on phones
    let x0 = 0;
    img.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    img.addEventListener('touchend', (e) => { const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(Number(fig.dataset.n) + (dx < 0 ? 1 : -1)); });
  }

  el.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const mod = t.closest<HTMLElement>('[data-mod]');
    if (mod) { const mi = Number(mod.dataset.mod); openModule = openModule === mi ? -1 : mi; drawOutline(); return; }
    const step = t.closest<HTMLElement>('[data-step]');
    if (step) { void show(steps.findIndex((s) => s.key === step.dataset.step)); return; }
    if (t.closest('[data-sp-back]')) { void show(current - 1); return; }
    if (t.closest('[data-sp-fwd]')) { if (current === steps.length - 1) navigate(`/learn/${unitId}`); else void show(current + 1); }
  });
  void show(current);
}
