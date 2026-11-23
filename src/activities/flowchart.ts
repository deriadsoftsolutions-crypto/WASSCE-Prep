import type { ActivityContext } from './types';
import data from '../data/activities.json';
import { esc, shuffle } from '../lib/dom';
import { enableDnD } from '../lib/dnd';
import { shapeIcon, shapeSVG, type FlowShape } from '../lib/shapes';
import { feedbackHTML } from '../lib/ui';

interface Piece { id: string; text: string; shape: FlowShape }
const FC = data.flowchart as {
  pieces: Piece[];
  solution: { slots: string[]; labels: Record<string, 'Yes' | 'No'> };
  explanation: string;
  instructions: string;
};

/* Slot layout in SVG units (viewBox 0 0 700 790). Slots 0..6 are the main column, slot 7 is on the right. */
const SLOTS = [
  { cx: 280, cy: 45, w: 220 }, { cx: 280, cy: 155, w: 220 }, { cx: 280, cy: 270, w: 220 },
  { cx: 280, cy: 385, w: 220 }, { cx: 280, cy: 500, w: 220 }, { cx: 280, cy: 615, w: 220 },
  { cx: 280, cy: 730, w: 220 }, { cx: 595, cy: 270, w: 190 },
];
const H = 70;
const LABELS: Record<string, { x: number; y: number }> = {
  a: { x: 445, y: 247 }, b: { x: 325, y: 327 }, c: { x: 125, y: 478 },
  d: { x: 325, y: 557 }, e: { x: 105, y: 593 }, f: { x: 325, y: 672 },
};
const ARROWS = [
  'M280 80 V118', 'M280 190 V233', 'M390 270 H498', 'M280 305 V348', 'M280 420 V463',
  'M170 500 H80 V145 H168', 'M280 535 V578', 'M170 615 H40 V165 H168', 'M280 650 V693',
  'M390 730 H650 V385 H392',
];

function wrapText(text: string, max = 20): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

export function mount(el: HTMLElement, ctx: ActivityContext) {
  const byId = new Map(FC.pieces.map((p) => [p.id, p]));
  let placed: (string | null)[] = SLOTS.map(() => null);
  let labels: Record<string, '' | 'Yes' | 'No'> = Object.fromEntries(Object.keys(LABELS).map((k) => [k, '']));
  let trayOrder = shuffle(FC.pieces.map((p) => p.id));
  let result: { slots: boolean[]; labels: Record<string, boolean> } | null = null;
  let justDropped = false;

  el.innerHTML = `
    <p class="instructions small">${esc(FC.instructions)}</p>
    <div class="tray" data-tray aria-label="Blocks to place"></div>
    <div class="svg-wrap" style="margin-top:12px"><svg viewBox="0 0 700 790" data-fc role="img" aria-label="Flowchart with empty slots"></svg></div>
    <div class="row" style="margin-top:12px">
      <button class="btn btn-primary btn-big" data-act="check" data-bar type="button">Check flowchart</button>
      <button class="btn" data-act="reset" data-bar type="button">Try again</button>
      <button class="btn btn-ghost" data-act="show" data-bar type="button">Show answer</button>
    </div>
    <div data-fb></div>`;
  const tray = el.querySelector('[data-tray]') as HTMLElement;
  const svg = el.querySelector('[data-fc]') as SVGSVGElement;

  const draw = () => {
    tray.innerHTML = trayOrder.filter((id) => !placed.includes(id)).map((id) => {
      const p = byId.get(id)!;
      return `<div class="piece" data-piece="${p.id}" role="button" tabindex="0">${shapeIcon(p.shape)}<span>${esc(p.text)}</span></div>`;
    }).join('') || '<span class="muted">All blocks placed. Now set the Yes and No labels and check.</span>';

    const arrows = ARROWS.map((d) => `<path class="fc-arrow" d="${d}" marker-end="url(#fc-head)"/>`).join('');
    const slots = SLOTS.map((s, i) => {
      const pid = placed[i];
      const p = pid ? byId.get(pid)! : null;
      const st = result ? (result.slots[i] ? 'ok' : 'bad') : '';
      const lines = p ? wrapText(p.text, s.w > 200 ? 22 : 18) : [];
      const textY = s.cy - ((lines.length - 1) * 18) / 2;
      return `<g class="fc-slot ${p ? 'filled' : ''} ${st}" data-slot="${i}" role="button" aria-label="Slot ${i + 1}${p ? `: ${esc(p.text)}` : ' empty'}">
        <rect class="slot-box" x="${s.cx - s.w / 2}" y="${s.cy - H / 2}" width="${s.w}" height="${H}" rx="12"/>
        ${p ? shapeSVG(p.shape, s.cx, s.cy, s.w, H) : `<text class="svg-muted" x="${s.cx}" y="${s.cy}" text-anchor="middle" dominant-baseline="central" font-size="15">Drop block here</text>`}
        ${lines.map((l, k) => `<text class="svg-text" x="${s.cx}" y="${textY + k * 18}" text-anchor="middle" dominant-baseline="central" font-size="${p?.shape === 'diamond' ? 14 : 16}" font-weight="650">${esc(l)}</text>`).join('')}
      </g>`;
    }).join('');
    const lbls = Object.entries(LABELS).map(([k, pos]) => {
      const st = result ? (result.labels[k] ? 'ok' : 'bad') : '';
      return `<g class="fc-label ${st}" data-label="${k}" role="button" aria-label="Branch label ${k}: ${labels[k] || 'not set'}">
        <rect x="${pos.x - 32}" y="${pos.y - 20}" width="64" height="40" rx="10"/>
        <text class="svg-text" x="${pos.x}" y="${pos.y}" text-anchor="middle" dominant-baseline="central" font-size="16" font-weight="800">${labels[k] || '?'}</text>
      </g>`;
    }).join('');
    svg.innerHTML = `<defs><marker id="fc-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" style="fill:var(--text)"/></marker></defs>${arrows}${slots}${lbls}`;
  };

  const dnd = enableDnD({
    root: el,
    pieceSelector: '[data-piece]',
    dropSelector: '[data-slot], [data-tray]',
    onDrop: (piece, target) => {
      const id = piece.dataset.piece!;
      justDropped = true;
      setTimeout(() => (justDropped = false), 0);
      result = null;
      if (target.dataset.slot !== undefined) {
        const i = Number(target.dataset.slot);
        placed = placed.map((x) => (x === id ? null : x));
        placed[i] = id;
      }
      draw();
    },
  });

  el.addEventListener('click', (e) => {
    const t = e.target as Element;
    const lbl = t.closest<SVGGElement>('[data-label]');
    if (lbl) {
      const k = lbl.dataset.label!;
      labels[k] = labels[k] === '' ? 'Yes' : labels[k] === 'Yes' ? 'No' : 'Yes';
      result = null;
      draw();
      return;
    }
    const slot = t.closest<SVGGElement>('[data-slot]');
    if (slot && !justDropped && !el.querySelector('.piece.selected')) {
      const i = Number(slot.dataset.slot);
      if (placed[i]) { placed[i] = null; result = null; draw(); }
      return;
    }
    const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
    const fb = el.querySelector('[data-fb]') as HTMLElement;
    if (act === 'check') {
      const sol = FC.solution;
      result = {
        slots: placed.map((p, i) => p === sol.slots[i]),
        labels: Object.fromEntries(Object.keys(LABELS).map((k) => [k, labels[k] === sol.labels[k]])),
      };
      const s = result.slots.filter(Boolean).length + Object.values(result.labels).filter(Boolean).length;
      const max = SLOTS.length + Object.keys(LABELS).length;
      draw();
      fb.innerHTML = feedbackHTML(s === max ? 'ok' : 'bad', s === max ? `Perfect flowchart! ${s} / ${max}` : `${s} / ${max} correct. Red items need fixing.`,
        `<p>${esc(FC.explanation)}</p>`);
      void ctx.save(s, max);
    }
    if (act === 'reset') {
      placed = SLOTS.map(() => null);
      labels = Object.fromEntries(Object.keys(LABELS).map((k) => [k, '']));
      trayOrder = shuffle(trayOrder);
      result = null;
      fb.innerHTML = '';
      dnd.clearSelection();
      draw();
    }
    if (act === 'show') {
      placed = FC.solution.slots.slice();
      labels = { ...FC.solution.labels };
      result = null;
      draw();
      fb.innerHTML = feedbackHTML('info', 'Model answer shown', `<p>${esc(FC.explanation)}</p><p>Press Try again and build it yourself.</p>`);
    }
  });

  draw();
  return () => dnd.destroy();
}
