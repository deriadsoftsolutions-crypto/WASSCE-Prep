import type { ActivityContext } from './types';
import data from '../data/activities.json';
import { esc, shuffle } from '../lib/dom';
import { enableDnD } from '../lib/dnd';
import { feedbackHTML } from '../lib/ui';
import { shapeIcon, type FlowShape } from '../lib/shapes';

interface MatchSet {
  title: string;
  instructions: string;
  leftTitle: string;
  rightTitle: string;
  pairs: { left: string; right: string; why: string; shape?: FlowShape }[];
}

const COLORS = ['#0b6e5f', '#b35c00', '#5b3cc4', '#b0185a', '#1d5fbf', '#6b7a00', '#7a4a2a', '#00799c'];

export function mount(el: HTMLElement, ctx: ActivityContext, param?: string) {
  const set = (data.matching as Record<string, MatchSet>)[param ?? ''];
  if (!set) { el.innerHTML = '<p>Missing matching data.</p>'; return; }
  const n = set.pairs.length;
  let leftOrder = shuffle(set.pairs.map((_, i) => i));
  let rightOrder = shuffle(set.pairs.map((_, i) => i));
  /** link[leftIndex] = rightIndex */
  let link: (number | null)[] = set.pairs.map(() => null);
  let checked = false;

  const tagFor = (li: number) => {
    const k = leftOrder.indexOf(li);
    return `<span class="tag" style="background:${COLORS[k % COLORS.length]}">${k + 1}</span>`;
  };

  const render = () => {
    el.innerHTML = `
      <p class="instructions small">${esc(set.instructions)}</p>
      <div class="match">
        <div class="match-col"><b>${esc(set.leftTitle)}</b>
          ${leftOrder.map((li) => {
            const p = set.pairs[li];
            const st = checked ? (link[li] === li ? 'ok' : 'bad') : '';
            return `<div class="match-item ${st}" data-left="${li}" role="button" tabindex="0">${tagFor(li)}${p.shape ? shapeIcon(p.shape) : ''}<span>${esc(p.left)}</span></div>`;
          }).join('')}
        </div>
        <div class="match-col"><b>${esc(set.rightTitle)}</b>
          ${rightOrder.map((ri) => {
            const li = link.indexOf(ri);
            const st = checked && li >= 0 ? (li === ri ? 'ok' : 'bad') : '';
            return `<button type="button" class="match-item ${st}" data-right="${ri}">${li >= 0 ? tagFor(li) : '<span class="tag" style="background:var(--border)">?</span>'}<span>${esc(set.pairs[ri].right)}</span></button>`;
          }).join('')}
        </div>
      </div>
      <div class="row" style="margin-top:12px">
        <button class="btn btn-primary btn-big" data-act="check" data-bar type="button">Check</button>
        <button class="btn" data-act="reset" data-bar type="button">Try again</button>
      </div>
      <div data-fb></div>`;
  };

  const dnd = enableDnD({
    root: el,
    pieceSelector: '[data-left]',
    dropSelector: '[data-right]',
    onDrop: (p, target) => {
      const li = Number(p.dataset.left), ri = Number(target.dataset.right);
      link = link.map((r) => (r === ri ? null : r));
      link[li] = ri;
      checked = false;
      render();
    },
  });

  el.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'check') {
      const right = link.filter((r, li) => r === li).length;
      const done = link.every((r) => r !== null);
      checked = true;
      render();
      const wrong = set.pairs.map((p, i) => ({ p, i })).filter(({ i }) => link[i] !== i);
      (el.querySelector('[data-fb]') as HTMLElement).innerHTML = feedbackHTML(right === n ? 'ok' : 'bad',
        right === n ? `All ${n} matched correctly!` : `${right} / ${n} correct${done ? '' : ' (some not matched yet)'}`,
        `<ul>${(right === n ? set.pairs : wrong.map((w) => w.p)).map((p) => `<li><b>${esc(p.left)}</b> → ${esc(p.right)}. ${esc(p.why)}</li>`).join('')}</ul>`);
      if (done) void ctx.save(right, n);
    }
    if (act === 'reset') {
      link = set.pairs.map(() => null);
      leftOrder = shuffle(leftOrder); rightOrder = shuffle(rightOrder);
      checked = false; dnd.clearSelection(); render();
    }
  });
  render();
  return () => dnd.destroy();
}
