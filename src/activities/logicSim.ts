import type { ActivityContext } from './types';
import { gateShape, type Bit } from '../lib/gates';
import { feedbackHTML } from '../lib/ui';
import { randInt } from '../lib/dom';

/**
 * Paper 2 Q4 circuit: AND1(X, NOT Y), AND2(Y, Z), F = AND1 XOR AND2.
 */
function compute(x: Bit, y: Bit, z: Bit) {
  const ny = (y ? 0 : 1) as Bit;
  const a1 = (x & ny) as Bit;
  const a2 = (y & z) as Bit;
  const f = (a1 ^ a2) as Bit;
  return { ny, a1, a2, f };
}

function circuitSVG(): string {
  const not = gateShape('NOT', 120, 150);
  const and1 = gateShape('AND', 280, 100);
  const and2 = gateShape('AND', 280, 230);
  const xor = gateShape('XOR', 440, 165);
  const input = (id: string, y: number) => `
    <g class="toggle-in" data-in="${id}" role="button" tabindex="0" aria-label="Toggle input ${id}">
      <circle cx="36" cy="${y}" r="24"/>
      <text class="svg-text" x="36" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="22" font-weight="800" data-inval="${id}">0</text>
      <text class="svg-text" x="36" y="${y - 34}" text-anchor="middle" font-size="18" font-weight="800">${id}</text>
    </g>`;
  return `
  <svg viewBox="0 0 640 310" role="img" aria-label="Logic circuit: F equals X AND NOT Y, XOR, Y AND Z">
    <path class="wire" data-w="x" d="M60 50 H240 V85 H${and1.ins[0].x}"/>
    <path class="wire" data-w="y" d="M60 150 H${not.ins[0].x}"/>
    <path class="wire" data-w="y" d="M90 150 V215 H${and2.ins[0].x}"/>
    <circle data-w="y" class="wire" cx="90" cy="150" r="5" style="stroke-width:3"/>
    <path class="wire" data-w="ny" d="M${not.out.x} 150 H220 V115 H${and1.ins[1].x}"/>
    <path class="wire" data-w="z" d="M60 270 H240 V245 H${and2.ins[1].x}"/>
    <path class="wire" data-w="a1" d="M${and1.out.x} 100 H400 V150 H${xor.ins[0].x}"/>
    <path class="wire" data-w="a2" d="M${and2.out.x} 230 H400 V180 H${xor.ins[1].x}"/>
    <path class="wire" data-w="f" d="M${xor.out.x} 165 H568"/>
    <g data-g="not">${not.svg}</g>
    <g data-g="a1">${and1.svg}</g>
    <g data-g="a2">${and2.svg}</g>
    <g data-g="f">${xor.svg}</g>
    <text class="svg-muted" x="140" y="188" text-anchor="middle" font-size="14">NOT</text>
    <text class="svg-muted" x="305" y="104" text-anchor="middle" font-size="14">AND 1</text>
    <text class="svg-muted" x="305" y="234" text-anchor="middle" font-size="14">AND 2</text>
    <text class="svg-muted" x="482" y="169" text-anchor="middle" font-size="14">XOR</text>
    <text class="svg-text" x="180" y="140" font-size="15" font-weight="700" data-lbl="ny">Y' = 1</text>
    <text class="svg-text" x="346" y="88" font-size="15" font-weight="700" data-lbl="a1">XY' = 0</text>
    <text class="svg-text" x="346" y="258" font-size="15" font-weight="700" data-lbl="a2">YZ = 0</text>
    <circle class="lamp" data-lamp cx="595" cy="165" r="26"/>
    <text class="svg-text" x="595" y="165" text-anchor="middle" dominant-baseline="central" font-size="22" font-weight="800" data-lbl="fv">0</text>
    <text class="svg-text" x="595" y="122" text-anchor="middle" font-size="18" font-weight="800">F</text>
    ${input('X', 50)}${input('Y', 150)}${input('Z', 270)}
  </svg>`;
}

export function mount(el: HTMLElement, ctx: ActivityContext) {
  const v: Record<'X' | 'Y' | 'Z', Bit> = { X: 0, Y: 0, Z: 0 };
  let mode: 'explore' | 'predict' = 'explore';
  let round = 0, score = 0, hidden = false;
  const ROUNDS = 6;

  el.innerHTML = `
    <div class="tabs" role="tablist">
      <button class="tab" role="tab" data-mode="explore" aria-selected="true" type="button">Explore</button>
      <button class="tab" role="tab" data-mode="predict" aria-selected="false" type="button">Predict F challenge</button>
    </div>
    <div class="svg-wrap">${circuitSVG()}</div>
    <div class="row" style="margin-top:12px">
      <div class="bigtoggles">
        ${(['X', 'Y', 'Z'] as const).map((k) => `<button type="button" class="bigtoggle" data-big="${k}" aria-pressed="false">${k} = 0</button>`).join('')}
      </div>
    </div>
    <p style="margin-top:12px"><span class="expr">F = XY' ⊕ YZ</span></p>
    <p class="mono" data-working style="font-size:1.05rem"></p>
    <div data-predict hidden></div>`;

  const svg = el.querySelector('svg')!;
  const working = el.querySelector('[data-working]') as HTMLElement;
  const predictBox = el.querySelector('[data-predict]') as HTMLElement;

  const draw = () => {
    const r = compute(v.X, v.Y, v.Z);
    const on: Record<string, Bit> = { x: v.X, y: v.Y, z: v.Z, ny: r.ny, a1: r.a1, a2: r.a2, f: r.f };
    const hideF = hidden;
    svg.querySelectorAll<SVGElement>('[data-w]').forEach((w) => {
      const k = w.dataset.w!;
      const masked = hideF && k === 'f';
      w.classList.toggle('on', !masked && on[k] === 1);
    });
    svg.querySelectorAll<SVGGElement>('[data-in]').forEach((g) => {
      const k = g.dataset.in as 'X' | 'Y' | 'Z';
      g.classList.toggle('on', v[k] === 1);
      g.querySelector('[data-inval]')!.textContent = String(v[k]);
    });
    (['not', 'a1', 'a2', 'f'] as const).forEach((g) => {
      const val = g === 'not' ? r.ny : r[g];
      svg.querySelectorAll(`[data-g="${g}"] .gate`).forEach((p) => p.classList.toggle('on', !(hideF && g === 'f') && val === 1));
    });
    svg.querySelector('[data-lbl="ny"]')!.textContent = `Y' = ${r.ny}`;
    svg.querySelector('[data-lbl="a1"]')!.textContent = `XY' = ${r.a1}`;
    svg.querySelector('[data-lbl="a2"]')!.textContent = `YZ = ${r.a2}`;
    svg.querySelector('[data-lbl="fv"]')!.textContent = hideF ? '?' : String(r.f);
    svg.querySelector('[data-lamp]')!.classList.toggle('on', !hideF && r.f === 1);
    el.querySelectorAll<HTMLButtonElement>('[data-big]').forEach((b) => {
      const k = b.dataset.big as 'X' | 'Y' | 'Z';
      b.classList.toggle('on', v[k] === 1);
      b.setAttribute('aria-pressed', String(v[k] === 1));
      b.textContent = `${k} = ${v[k]}`;
      b.disabled = mode === 'predict';
    });
    working.textContent = hideF
      ? `F = ${v.X}·${r.ny} ⊕ ${v.Y}·${v.Z} = ${r.a1} ⊕ ${r.a2} = ?`
      : `F = ${v.X}·${r.ny} ⊕ ${v.Y}·${v.Z} = ${r.a1} ⊕ ${r.a2} = ${r.f}`;
  };

  const newRound = () => {
    v.X = randInt(0, 1) as Bit; v.Y = randInt(0, 1) as Bit; v.Z = randInt(0, 1) as Bit;
    hidden = true;
    predictBox.innerHTML = `
      <div class="card" style="margin:12px 0 0">
        <p><b>Round ${round + 1} of ${ROUNDS}.</b> The inputs are X = ${v.X}, Y = ${v.Y}, Z = ${v.Z}. What will F be?</p>
        <div class="row"><button class="btn btn-big" data-guess="0" type="button">F = 0</button><button class="btn btn-big" data-guess="1" type="button">F = 1</button>
        <span class="spacer"></span><span class="muted">Score: ${score} / ${round}</span></div>
        <div data-fb></div>
      </div>`;
    draw();
  };

  const setMode = (m: typeof mode) => {
    mode = m;
    el.querySelectorAll('[data-mode]').forEach((t) => t.setAttribute('aria-selected', String((t as HTMLElement).dataset.mode === m)));
    predictBox.hidden = m !== 'predict';
    hidden = false;
    if (m === 'predict') { round = 0; score = 0; newRound(); }
    else draw();
  };

  const toggle = (k: 'X' | 'Y' | 'Z') => {
    if (mode === 'predict') return;
    v[k] = (v[k] ? 0 : 1) as Bit;
    draw();
  };

  el.addEventListener('click', (e) => {
    const t = e.target as Element;
    const inp = t.closest<SVGGElement>('[data-in]');
    if (inp) return toggle(inp.dataset.in as 'X' | 'Y' | 'Z');
    const big = t.closest<HTMLElement>('[data-big]');
    if (big) return toggle(big.dataset.big as 'X' | 'Y' | 'Z');
    const m = t.closest<HTMLElement>('[data-mode]');
    if (m) return setMode(m.dataset.mode as typeof mode);
    const g = t.closest<HTMLElement>('[data-guess]');
    if (g && hidden) {
      const r = compute(v.X, v.Y, v.Z);
      const ok = Number(g.dataset.guess) === r.f;
      if (ok) score++;
      round++;
      hidden = false;
      draw();
      predictBox.querySelectorAll<HTMLButtonElement>('[data-guess]').forEach((b) => (b.disabled = true));
      const why = `<p>XY' = ${v.X}·${r.ny} = ${r.a1} and YZ = ${v.Y}·${v.Z} = ${r.a2}. XOR gives 1 only when its inputs differ, so F = ${r.a1} ⊕ ${r.a2} = ${r.f}.</p>`;
      const done = round >= ROUNDS;
      predictBox.querySelector('[data-fb]')!.innerHTML =
        feedbackHTML(ok ? 'ok' : 'bad', ok ? 'Correct!' : `Not quite, F = ${r.f}.`, why) +
        `<div class="row" style="margin-top:10px">${done
          ? `<b>Final score: ${score} / ${ROUNDS}</b><button class="btn btn-primary" data-again type="button">Try again</button>`
          : '<button class="btn btn-primary" data-nextround type="button">Next round</button>'}</div>`;
      if (done) void ctx.save(score, ROUNDS, { mode: 'predict' });
      return;
    }
    if (t.closest('[data-nextround]')) return newRound();
    if (t.closest('[data-again]')) { round = 0; score = 0; newRound(); }
  });
  el.addEventListener('keydown', (e) => {
    const inp = (e.target as Element).closest<SVGGElement>('[data-in]');
    if (inp && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(inp.dataset.in as 'X' | 'Y' | 'Z'); }
  });
  draw();
}
