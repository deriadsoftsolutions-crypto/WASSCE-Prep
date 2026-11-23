import type { ActivityContext } from './types';
import { GATE_INFO, GATE_TYPES, evalGate, gateSymbolSVG, type Bit, type GateType } from '../lib/gates';
import { shuffle } from '../lib/dom';
import { feedbackHTML } from '../lib/ui';

/** A truth table is identified by its output column. */
type TT = { key: string; label: string; rows: { ins: string; out: Bit }[] };

function ttFor(g: GateType): TT {
  if (g === 'NOT') return { key: 'NOT', label: g, rows: [0, 1].map((a) => ({ ins: `${a}`, out: evalGate('NOT', a as Bit) })) };
  const rows = [[0, 0], [0, 1], [1, 0], [1, 1]].map(([a, b]) => ({ ins: `${a} ${b}`, out: evalGate(g, a as Bit, b as Bit) }));
  return { key: g, label: g, rows };
}

function notDistractors(): TT[] {
  const mk = (key: string, outs: Bit[]): TT => ({ key, label: key, rows: [0, 1].map((a, i) => ({ ins: `${a}`, out: outs[i] })) });
  return [mk('BUF', [0, 1]), mk('ONE', [1, 1]), mk('ZERO', [0, 0])];
}

function ttHTML(t: TT): string {
  const two = t.rows[0].ins.includes(' ');
  return `<table class="data" style="min-width:0;width:auto;margin:0 auto">
    <thead><tr>${two ? '<th>A</th><th>B</th>' : '<th>A</th>'}<th>F</th></tr></thead>
    <tbody>${t.rows.map((r) => `<tr>${r.ins.split(' ').map((x) => `<td>${x}</td>`).join('')}<td><b>${r.out}</b></td></tr>`).join('')}</tbody>
  </table>`;
}

export function mount(el: HTMLElement, ctx: ActivityContext) {
  let order: GateType[] = [];
  let i = 0, score = 0;
  let nameAns: GateType | null = null;
  let ttAns: string | null = null;
  let ttOptions: TT[] = [];

  const start = () => { order = shuffle(GATE_TYPES); i = 0; score = 0; nextRound(); };

  const nextRound = () => {
    nameAns = null; ttAns = null;
    const g = order[i];
    const correct = ttFor(g);
    const others = g === 'NOT' ? notDistractors() : shuffle(GATE_TYPES.filter((x) => x !== g && x !== 'NOT')).slice(0, 3).map(ttFor);
    ttOptions = shuffle([correct, ...others]);
    render();
  };

  const render = () => {
    const g = order[i];
    const total = order.length * 2;
    if (i >= order.length) {
      el.innerHTML = `<div class="center stack"><div class="scorebig">${score} / ${total}</div>
        <p>${score === total ? 'You know all seven gates!' : 'Read the explanations and try again to get them all.'}</p>
        <button class="btn btn-primary" data-act="again" data-bar type="button">Try again</button></div>`;
      return;
    }
    const nameDone = nameAns !== null;
    const ttDone = ttAns !== null;
    el.innerHTML = `
      <div class="qmeta"><span data-bar-status>Gate ${i + 1} of ${order.length}, ${score} point${score === 1 ? '' : 's'} so far</span><span>Score: ${score}</span></div>
      <div class="center" style="margin:10px 0">${gateSymbolSVG(g, 280)}</div>
      <p><b>1. What is the name of this gate?</b></p>
      <div class="row">${GATE_TYPES.map((t) => {
        let cls = 'btn';
        if (nameDone && t === g) cls += ' btn-primary';
        else if (nameDone && t === nameAns) cls += ' btn-danger';
        return `<button type="button" class="${cls}" data-name="${t}" ${nameDone ? 'disabled' : ''}>${t}</button>`;
      }).join('')}</div>
      ${nameDone ? feedbackHTML(nameAns === g ? 'ok' : 'bad', nameAns === g ? 'Correct!' : `It is ${g}.`, `<p>${GATE_INFO[g]}</p>`) : ''}
      ${nameDone ? `
        <p style="margin-top:16px"><b>2. Which truth table belongs to this gate?</b></p>
        <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr))">
          ${ttOptions.map((t, k) => {
            let style = '';
            if (ttDone && t.key === g) style = 'border-color:var(--ok);background:var(--ok-soft)';
            else if (ttDone && t.key === ttAns) style = 'border-color:var(--bad);background:var(--bad-soft)';
            return `<button type="button" class="option" style="display:block;${style}" data-tt="${t.key}" ${ttDone ? 'disabled' : ''} aria-label="Truth table option ${k + 1}">${ttHTML(t)}</button>`;
          }).join('')}
        </div>` : ''}
      ${ttDone ? feedbackHTML(ttAns === g ? 'ok' : 'bad', ttAns === g ? 'Correct truth table!' : 'That is not the right table.', `<p>The ${g} gate's output column reads ${ttFor(g).rows.map((r) => r.out).join(', ')} from top to bottom.</p>`)
        + `<div class="row" style="margin-top:10px"><button class="btn btn-primary" data-act="next" data-bar type="button">${i === order.length - 1 ? 'See my score' : 'Next gate'}</button></div>` : ''}`;
  };

  el.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const g = order[i];
    const n = t.closest<HTMLElement>('[data-name]');
    if (n && nameAns === null) { nameAns = n.dataset.name as GateType; if (nameAns === g) score++; render(); return; }
    const tt = t.closest<HTMLElement>('[data-tt]');
    if (tt && ttAns === null) { ttAns = tt.dataset.tt!; if (ttAns === g) score++; render(); return; }
    const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'next') {
      i++;
      if (i >= order.length) { void ctx.save(score, order.length * 2); render(); } else nextRound();
    }
    if (act === 'again') start();
  });
  start();
}
