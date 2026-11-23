import type { ActivityContext } from './types';
import data from '../data/calculations.json';
import { esc, nice, pick, randInt, shuffle } from '../lib/dom';
import { close, evaluate } from '../lib/mathparse';
import { feedbackHTML } from '../lib/ui';
import { CONFIG } from '../config';
import { icon } from '../lib/icons';

interface CalcType {
  name: string;
  formulas: string[];
  correctFormula: number;
  vars: { sym: string; label: string }[];
  units: string[];
  unit: string;
  twoAnswers?: boolean;
  hints: { formula: string; subs: string; answer: string; unit: string };
}
interface Problem {
  id: string;
  type: string;
  question: string;
  vars: Record<string, number[]>;
  answers: number[];
  altAnswers?: number[][];
  working: string;
}

const TYPES = data.types as unknown as Record<string, CalcType>;
const PROBLEMS = data.problems as unknown as Problem[];

/* ---------- Random problem generators (new numbers each time) ---------- */
const GEN: Record<string, () => Problem> = {
  'time-travel': () => {
    const d = randInt(4, 30), v = pick([0.2, 0.25, 0.4, 0.5, 0.8, 1, 1.2, 1.5, 2]);
    return { id: 'rand', type: 'time-travel', question: `A robot moves at ${v} m/s. How long does it take to travel ${d} m?`,
      vars: { d: [d], v: [v] }, answers: [d / v], working: `t = d ÷ v = ${d} ÷ ${v} = ${nice(d / v)} s` };
  },
  'leg-load': () => {
    const m = randInt(3, 24), n = pick([4, 6]);
    return { id: 'rand', type: 'leg-load', question: `A ${n}-legged walking robot has a mass of ${m} kg. Find the load on each leg when all legs are on the ground. (g = 9.8 m/s²)`,
      vars: { m: [m], g: [9.8, 10], n: [n] }, answers: [(m * 9.8) / n], altAnswers: [[(m * 10) / n]],
      working: `W = ${m} × 9.8 = ${nice(m * 9.8)} N. Load per leg = ${nice(m * 9.8)} ÷ ${n} = ${nice((m * 9.8) / n)} N.` };
  },
  'stride-distance': () => {
    const f = pick([0.25, 0.5, 0.75, 1, 1.5, 2]), mm = pick([40, 50, 60, 75, 80, 100, 120]), min = randInt(1, 5);
    const d = f * (mm / 1000) * min * 60;
    return { id: 'rand', type: 'stride-distance', question: `A crank motor turns at ${f} rev/s and the robot moves ${mm} mm per rotation. How far does it travel in ${min} minute${min > 1 ? 's' : ''}?`,
      vars: { f: [f], s: [mm / 1000], t: [min * 60] }, answers: [d],
      working: `Rotations = ${f} × ${min * 60} = ${nice(f * min * 60)}. Distance = ${nice(f * min * 60)} × ${mm / 1000} m = ${nice(d)} m.` };
  },
  'angular-velocity': () => {
    const deg = pick([15, 30, 45, 60, 90, 120, 180]), t = pick([0.1, 0.2, 0.25, 0.5, 1, 1.5, 2]);
    const th = (deg * Math.PI) / 180;
    return { id: 'rand', type: 'angular-velocity', question: `A robot joint rotates ${deg}° in ${t} s. Find its average angular velocity in rad/s.`,
      vars: { 'θ': [th], t: [t] }, answers: [th / t],
      working: `${deg}° = ${deg}π/180 = ${nice(th)} rad. ω = ${nice(th)} ÷ ${t} = ${nice(th / t)} rad/s.` };
  },
  'wheel-speed': () => {
    const rc = pick([5, 10, 15, 20, 25, 30, 40, 50]), deg = pick([90, 180, 270, 360]), t = pick([1, 2, 2.5, 4, 5]);
    const th = (deg * Math.PI) / 180, r = rc / 100;
    return { id: 'rand', type: 'wheel-speed', question: `A robot wheel of radius ${rc} cm rotates through ${deg}° in ${t} s. Find its linear speed in m/s.`,
      vars: { 'θ': [th], r: [r], t: [t] }, answers: [(th * r) / t],
      working: `${deg}° = ${nice(th)} rad, r = ${r} m. v = ${nice(th)} × ${r} ÷ ${t} = ${nice((th * r) / t)} m/s.` };
  },
  'spin-turn': () => {
    const rc = pick([3, 4, 5, 6, 8, 10]), sp = pick([12, 16, 20, 24, 30]), deg = pick([45, 60, 72, 90, 180, 360]);
    const R = sp / 2, N = (deg / 360) * (R / rc);
    return { id: 'rand', type: 'spin-turn', question: `A two-wheel differential robot has wheel radius ${rc} cm and wheel spacing ${sp} cm. It makes a ${deg}° spin turn. How many rotations does each wheel make?`,
      vars: { 'θ': [deg], R: [R, R / 100], r: [rc, rc / 100] }, answers: [N],
      working: `R = ${sp} ÷ 2 = ${R} cm. N = (${deg} ÷ 360) × (${R} ÷ ${rc}) = ${nice(N)} rotations.` };
  },
  'at-rest': () => {
    const p = randInt(1, 3), q = randInt(p + 1, 5), k = pick([1, 2]), c0 = randInt(1, 9);
    const A = 2 * k, B = -3 * k * (p + q), C = 6 * k * p * q;
    const term = (coef: number, s: string, first = false) => coef === 0 ? '' : `${coef < 0 ? (first ? '−' : ' − ') : first ? '' : ' + '}${Math.abs(coef) === 1 && s ? '' : Math.abs(coef)}${s}`;
    const P = `${term(A, 't³', true)}${term(B, 't²')}${term(C, 't')}${term(c0, '')}`;
    return { id: 'rand', type: 'at-rest', question: `A robot's position is P(t) = ${P}. At what times is it momentarily at rest?`,
      vars: { a: [3 * A, 1], b: [2 * B, -(p + q)], c: [C, p * q] }, answers: [p, q],
      working: `v = dP/dt = ${3 * A}t² ${2 * B < 0 ? '−' : '+'} ${Math.abs(2 * B)}t + ${C} = ${6 * k}(t − ${p})(t − ${q}) = 0, so t = ${p} s and t = ${q} s.` };
  },
  'cam-lift': () => {
    const r = randInt(2, 8), deg = pick([30, 45, 60, 90, 120, 180]);
    const s = r * (1 - Math.cos((deg * Math.PI) / 180));
    return { id: 'rand', type: 'cam-lift', question: `An eccentric cam with eccentricity r = ${r} cm rotates through ${deg}°. Using s = r(1 − cos θ), find the follower lift.`,
      vars: { r: [r], 'θ': [deg] }, answers: [s],
      working: `s = ${r} × (1 − cos ${deg}°) = ${r} × ${nice(1 - Math.cos((deg * Math.PI) / 180))} = ${nice(s)} cm.` };
  },
};

interface StepState { formula: number | null; unit: string | null; hints: Set<string> }

export function mount(el: HTMLElement, ctx: ActivityContext, param?: string) {
  const fixed = param && PROBLEMS.some((p) => p.id === param) ? param : null;
  let problem: Problem = PROBLEMS.find((p) => p.id === fixed) ?? PROBLEMS[0];
  let formulaOrder: number[] = [];
  let st: StepState;
  let checked = false;

  const load = (p: Problem) => {
    problem = p;
    formulaOrder = shuffle(TYPES[p.type].formulas.map((_, i) => i));
    st = { formula: null, unit: null, hints: new Set() };
    checked = false;
    render();
  };

  const hintBtn = (k: keyof CalcType['hints']) => `<button class="btn btn-sm btn-ghost" data-hint="${k}" type="button">Hint</button>`;
  const hintBox = (k: keyof CalcType['hints']) => (st.hints.has(k) ? `<div class="hint">${icon('hint', 18)} ${esc(TYPES[problem.type].hints[k])}</div>` : '');

  const render = () => {
    const T = TYPES[problem.type];
    const answersCount = T.twoAnswers ? 2 : 1;
    el.innerHTML = `
      ${fixed ? '' : `
      <label class="field"><span>Choose a problem</span>
        <select data-pick>
          ${PROBLEMS.map((p) => `<option value="${p.id}" ${problem.id === p.id ? 'selected' : ''}>${esc(TYPES[p.type].name)}</option>`).join('')}
        </select></label>
      <div class="row" style="margin-bottom:12px">
        <button class="btn btn-accent" data-act="random" type="button">New numbers: random practice</button>
        <span class="muted small">Makes a new problem of the type you chose.</span>
      </div>`}
      <div class="card" style="background:var(--surface-2)">
        ${problem.id === 'rand' ? '<span class="pill accent">Random practice</span>' : ''}
        <p style="font-weight:650;font-size:1.1rem;margin:6px 0 0">${esc(problem.question)}</p>
      </div>
      <div class="calc-step" data-step="formula">
        <h4><span>(a) Choose the formula</span>${hintBtn('formula')}</h4>
        <div class="formula-opts">${formulaOrder.map((fi) => `<button type="button" class="formula-opt ${st.formula === fi ? 'selected' : ''}" data-formula="${fi}">${esc(T.formulas[fi])}</button>`).join('')}</div>
        ${hintBox('formula')}<div data-fb="formula"></div>
      </div>
      <div class="calc-step" data-step="subs">
        <h4><span>(b) Substitute the values</span>${hintBtn('subs')}</h4>
        <div class="var-grid">${T.vars.map((v) => `<label class="field" style="margin:0"><span>${esc(v.label)}</span><input inputmode="decimal" autocomplete="off" data-var="${esc(v.sym)}" placeholder="${esc(v.sym)} =" /></label>`).join('')}</div>
        <p class="muted small" style="margin:6px 0 0">You can type fractions and pi, for example 30*pi/180 or pi/6.</p>
        ${hintBox('subs')}<div data-fb="subs"></div>
      </div>
      <div class="calc-step" data-step="answer">
        <h4><span>(c) Final answer${answersCount > 1 ? 's' : ''}</span>${hintBtn('answer')}</h4>
        <div class="var-grid">${Array.from({ length: answersCount }, (_, k) => `<label class="field" style="margin:0"><span>${answersCount > 1 ? `Answer ${k + 1}` : 'Answer'}</span><input inputmode="decimal" autocomplete="off" data-ans="${k}" /></label>`).join('')}</div>
        ${hintBox('answer')}<div data-fb="answer"></div>
      </div>
      <div class="calc-step" data-step="unit">
        <h4><span>(d) Unit</span>${hintBtn('unit')}</h4>
        <div class="row">${T.units.map((u) => `<button type="button" class="btn ${st.unit === u ? 'btn-primary' : ''}" data-unit="${esc(u)}">${esc(u)}</button>`).join('')}</div>
        ${hintBox('unit')}<div data-fb="unit"></div>
      </div>
      <div class="row">
        <button class="btn btn-primary btn-big" data-act="check" data-bar type="button">Check my working</button>
        <button class="btn" data-act="retry" data-bar type="button">Try again</button>
      </div>
      <div data-fb="all"></div>`;
  };

  const check = () => {
    const T = TYPES[problem.type];
    const tol = CONFIG.CALC_TOLERANCE;
    const marks: Record<string, boolean> = {};
    const setStep = (k: string, ok: boolean, msg: string) => {
      marks[k] = ok;
      const s = el.querySelector(`[data-step="${k}"]`)!;
      s.classList.toggle('ok', ok);
      s.classList.toggle('bad', !ok);
      (el.querySelector(`[data-fb="${k}"]`) as HTMLElement).innerHTML = `<p class="${ok ? 'mark-ok' : 'mark-bad'}" style="margin:8px 0 0">${ok ? '✓ ' : '✗ '}${msg}</p>`;
    };

    // (a) formula
    el.querySelectorAll<HTMLElement>('[data-formula]').forEach((b) => {
      const fi = Number(b.dataset.formula);
      b.classList.toggle('ok', fi === T.correctFormula);
      b.classList.toggle('bad', fi === st.formula && fi !== T.correctFormula);
    });
    setStep('formula', st.formula === T.correctFormula, st.formula === T.correctFormula ? 'Correct formula.' : `The correct formula is ${T.formulas[T.correctFormula]}.`);

    // (b) substitution
    let subsOk = true;
    const wrongVars: string[] = [];
    el.querySelectorAll<HTMLInputElement>('[data-var]').forEach((inp) => {
      const sym = inp.dataset.var!;
      const val = evaluate(inp.value);
      const ok = problem.vars[sym].some((t) => close(val, t, tol));
      inp.classList.toggle('ok', ok);
      inp.classList.toggle('bad', !ok);
      if (!ok) { subsOk = false; wrongVars.push(`${sym} = ${nice(problem.vars[sym][0])}`); }
    });
    setStep('subs', subsOk, subsOk ? 'All values substituted correctly.' : `Check: ${wrongVars.join(', ')}.`);

    // (c) answer(s): accept main set or any alternative set, in any order
    const inputs = Array.from(el.querySelectorAll<HTMLInputElement>('[data-ans]'));
    const given = inputs.map((i) => evaluate(i.value));
    const sets = [problem.answers, ...(problem.altAnswers ?? [])];
    const matchSet = (set: number[]) => {
      const used = new Set<number>();
      return given.map((g) => {
        const k = set.findIndex((t, idx) => !used.has(idx) && close(g, t, tol));
        if (k >= 0) used.add(k);
        return k >= 0;
      });
    };
    const results = sets.map(matchSet);
    const best = results.reduce((a, b) => (b.filter(Boolean).length > a.filter(Boolean).length ? b : a));
    inputs.forEach((inp, k) => { inp.classList.toggle('ok', best[k]); inp.classList.toggle('bad', !best[k]); });
    const ansOk = best.every(Boolean);
    setStep('answer', ansOk, ansOk ? 'Correct answer.' : `The answer is ${problem.answers.map((a) => nice(a, 3)).join(' and ')}.`);

    // (d) unit
    el.querySelectorAll<HTMLElement>('[data-unit]').forEach((b) => {
      b.classList.toggle('btn-primary', b.dataset.unit === T.unit);
      b.classList.toggle('btn-danger', b.dataset.unit === st.unit && st.unit !== T.unit);
    });
    setStep('unit', st.unit === T.unit, st.unit === T.unit ? 'Correct unit.' : `The unit is ${T.unit}.`);

    const score = Object.values(marks).filter(Boolean).length;
    const hintNote = st.hints.size ? ` You used ${st.hints.size} hint${st.hints.size > 1 ? 's' : ''}.` : '';
    (el.querySelector('[data-fb="all"]') as HTMLElement).innerHTML = feedbackHTML(
      score === 4 ? 'ok' : 'bad',
      `${score} / 4 steps correct.${hintNote}`,
      `<p><b>Model working:</b> ${esc(problem.working)}</p>`,
    );
    if (!checked) void ctx.save(score, 4, { problem: problem.id, type: problem.type, hints: st.hints.size });
    checked = true;
  };

  el.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const f = t.closest<HTMLElement>('[data-formula]');
    if (f) {
      st.formula = Number(f.dataset.formula);
      el.querySelectorAll('[data-formula]').forEach((b) => b.classList.toggle('selected', b === f));
      return;
    }
    const u = t.closest<HTMLElement>('[data-unit]');
    if (u) {
      st.unit = u.dataset.unit!;
      el.querySelectorAll<HTMLElement>('[data-unit]').forEach((b) => { b.classList.remove('btn-danger'); b.classList.toggle('btn-primary', b === u); });
      return;
    }
    const h = t.closest<HTMLElement>('[data-hint]');
    if (h) {
      const k = h.dataset.hint as keyof CalcType['hints'];
      st.hints.add(k);
      const step = h.closest('.calc-step')!;
      if (!step.querySelector('.hint')) step.querySelector(`[data-fb]`)!.insertAdjacentHTML('beforebegin', `<div class="hint">${icon('hint', 18)} ${esc(TYPES[problem.type].hints[k])}</div>`);
      return;
    }
    const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'check') check();
    if (act === 'retry') load(problem);
    if (act === 'random') load(GEN[problem.type]());
  });
  el.addEventListener('change', (e) => {
    const s = (e.target as HTMLElement).closest<HTMLSelectElement>('[data-pick]');
    if (s) load(PROBLEMS.find((p) => p.id === s.value)!);
  });

  load(problem);
}

/** Exposed for tests: check every fixed problem's stated answer against its own values. */
export const _internal = { GEN, TYPES, PROBLEMS };
