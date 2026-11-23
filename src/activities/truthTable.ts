import type { ActivityContext } from './types';
import type { Bit } from '../lib/gates';
import { esc, pick, randInt } from '../lib/dom';
import { feedbackHTML } from '../lib/ui';

/* ---------- Tiny Boolean expression trees for the random mode ---------- */
type Node =
  | { k: 'var'; n: string }
  | { k: 'not'; a: Node }
  | { k: 'bin'; op: 'AND' | 'OR' | 'XOR'; a: Node; b: Node };

const SYM = { AND: '·', OR: ' + ', XOR: ' ⊕ ' } as const;

function show(n: Node): string {
  if (n.k === 'var') return n.n;
  if (n.k === 'not') return n.a.k === 'var' ? `${n.a.n}'` : `(${show(n.a)})'`;
  const wrap = (c: Node) => (c.k === 'bin' ? `(${show(c)})` : show(c));
  return `${wrap(n.a)}${SYM[n.op]}${wrap(n.b)}`;
}

function evalNode(n: Node, env: Record<string, Bit>): Bit {
  if (n.k === 'var') return env[n.n];
  if (n.k === 'not') return (evalNode(n.a, env) ? 0 : 1) as Bit;
  const a = evalNode(n.a, env), b = evalNode(n.b, env);
  return (n.op === 'AND' ? a & b : n.op === 'OR' ? a | b : a ^ b) as Bit;
}

const v = (n: string): Node => ({ k: 'var', n });
const maybeNot = (n: Node, p = 0.35): Node => (Math.random() < p ? { k: 'not', a: n } : n);
const randOp = () => pick(['AND', 'OR', 'XOR'] as const);

function randomExpr(vars: 2 | 3): { inner: Node; expr: Node } {
  if (vars === 2) {
    const inner: Node = { k: 'bin', op: randOp(), a: maybeNot(v('A')), b: maybeNot(v('B')) };
    return { inner, expr: maybeNot(inner, 0.3) };
  }
  const inner: Node = { k: 'bin', op: randOp(), a: maybeNot(v('A')), b: maybeNot(v('B')) };
  const c = maybeNot(v('C'));
  const expr: Node = Math.random() < 0.5 ? { k: 'bin', op: randOp(), a: inner, b: c } : { k: 'bin', op: randOp(), a: c, b: inner };
  return { inner, expr };
}

/* ---------- Table model ---------- */
interface Table {
  title: string;
  inputs: string[];
  cols: { name: string; values: Bit[] }[];
  why: string;
}

function q4Table(): Table {
  const rows = Array.from({ length: 8 }, (_, i) => [(i >> 2) & 1, (i >> 1) & 1, i & 1] as Bit[]);
  const xy = rows.map(([x, y]) => (x & (y ? 0 : 1)) as Bit);
  const yz = rows.map(([, y, z]) => (y & z) as Bit);
  return {
    title: "Paper 2 Q4: F = XY' ⊕ YZ",
    inputs: ['X', 'Y', 'Z'],
    cols: [
      { name: "XY'", values: xy },
      { name: 'YZ', values: yz },
      { name: 'F', values: xy.map((a, i) => (a ^ yz[i]) as Bit) },
    ],
    why: "XY' is 1 only when X = 1 and Y = 0 (rows 100 and 101). YZ is 1 only when Y = 1 and Z = 1 (rows 011 and 111). F = XY' ⊕ YZ is 1 when exactly one of them is 1, so F = 1 for 011, 100, 101 and 111.",
  };
}

function randomTable(): Table {
  const nv = (randInt(0, 1) ? 3 : 2) as 2 | 3;
  const inputs = nv === 3 ? ['A', 'B', 'C'] : ['A', 'B'];
  const { inner, expr } = randomExpr(nv);
  const rows = Array.from({ length: 2 ** nv }, (_, i) => inputs.map((_, j) => ((i >> (nv - 1 - j)) & 1) as Bit));
  const env = (r: Bit[]) => Object.fromEntries(inputs.map((n, j) => [n, r[j]])) as Record<string, Bit>;
  const cols = [];
  if (show(inner) !== show(expr)) cols.push({ name: show(inner), values: rows.map((r) => evalNode(inner, env(r))) });
  cols.push({ name: 'F', values: rows.map((r) => evalNode(expr, env(r))) });
  return {
    title: `F = ${show(expr)}`,
    inputs,
    cols,
    why: "Work out the bracket first for every row, then combine it with the rest. Remember: · is AND, + is OR, ⊕ is XOR (1 when different), and ' means NOT.",
  };
}

export function mount(el: HTMLElement, ctx: ActivityContext) {
  let mode: 'q4' | 'random' = 'q4';
  let table = q4Table();
  let cells: (Bit | null)[][] = [];
  let checked = false;

  const reset = () => {
    cells = table.cols.map((c) => c.values.map(() => null));
    checked = false;
  };

  const render = () => {
    const n = table.inputs.length;
    const rows = 2 ** n;
    el.innerHTML = `
      <div class="tabs" role="tablist">
        <button class="tab" role="tab" data-mode="q4" aria-selected="${mode === 'q4'}" type="button">Paper 2 Q4 table</button>
        <button class="tab" role="tab" data-mode="random" aria-selected="${mode === 'random'}" type="button">Random practice</button>
      </div>
      <p><span class="expr">${esc(table.title)}</span></p>
      <p class="muted">Tap a cell to set it to 0 or 1. Tap again to change it.</p>
      <div class="table-wrap"><table class="data">
        <thead><tr>${table.inputs.map((i) => `<th>${i}</th>`).join('')}${table.cols.map((c) => `<th>${esc(c.name)}</th>`).join('')}</tr></thead>
        <tbody>${Array.from({ length: rows }, (_, r) => `<tr>
          ${table.inputs.map((_, j) => `<td style="font-weight:700">${(r >> (n - 1 - j)) & 1}</td>`).join('')}
          ${table.cols.map((c, ci) => {
            const val = cells[ci][r];
            const st = checked ? (val === c.values[r] ? 'ok' : 'bad') : '';
            return `<td style="padding:4px"><button type="button" class="tt-cell ${val !== null ? 'filled' : ''} ${st}" data-c="${ci}" data-r="${r}" aria-label="${esc(c.name)} row ${r + 1}">${val ?? ''}</button></td>`;
          }).join('')}
        </tr>`).join('')}</tbody>
      </table></div>
      <div class="row" style="margin-top:12px">
        <button class="btn btn-primary" data-act="check" type="button">Check</button>
        <button class="btn" data-act="clear" type="button">Try again</button>
        ${mode === 'random' ? '<button class="btn" data-act="new" type="button">New expression</button>' : ''}
      </div>
      <div data-fb></div>`;
  };

  const check = () => {
    let right = 0, total = 0, blanks = 0;
    table.cols.forEach((c, ci) => c.values.forEach((val, r) => {
      total++;
      if (cells[ci][r] === null) blanks++;
      if (cells[ci][r] === val) right++;
    }));
    checked = true;
    render();
    const perfect = right === total;
    const colReport = table.cols.map((c, ci) => {
      const wrong = c.values.filter((val, r) => cells[ci][r] !== val).length;
      return `<li>${esc(c.name)}: ${wrong === 0 ? '<span class="mark-ok">all correct</span>' : `<span class="mark-bad">${wrong} to fix</span>`}</li>`;
    }).join('');
    (el.querySelector('[data-fb]') as HTMLElement).innerHTML = feedbackHTML(
      perfect ? 'ok' : 'bad',
      perfect ? `Perfect! ${right} / ${total}` : `${right} / ${total} cells correct${blanks ? ` (${blanks} empty)` : ''}`,
      `<ul>${colReport}</ul><p>${esc(table.why)}</p>`,
    );
    void ctx.save(right, total, { mode, expression: table.title });
  };

  el.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const cell = t.closest<HTMLElement>('[data-c]');
    if (cell) {
      const ci = Number(cell.dataset.c), r = Number(cell.dataset.r);
      const cur = cells[ci][r];
      cells[ci][r] = cur === null ? 0 : cur === 0 ? 1 : 0;
      if (checked) { checked = false; el.querySelectorAll('.tt-cell').forEach((b) => b.classList.remove('ok', 'bad')); }
      cell.textContent = String(cells[ci][r]);
      cell.classList.add('filled');
      return;
    }
    const m = t.closest<HTMLElement>('[data-mode]')?.dataset.mode as typeof mode | undefined;
    if (m && m !== mode) { mode = m; table = m === 'q4' ? q4Table() : randomTable(); reset(); render(); return; }
    const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'check') check();
    if (act === 'clear') { reset(); render(); }
    if (act === 'new') { table = randomTable(); reset(); render(); }
  });

  reset();
  render();
}
