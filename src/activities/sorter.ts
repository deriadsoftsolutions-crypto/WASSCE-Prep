import type { ActivityContext } from './types';
import data from '../data/activities.json';
import { esc, shuffle } from '../lib/dom';
import { enableDnD } from '../lib/dnd';
import { feedbackHTML } from '../lib/ui';

interface SortSet {
  title: string;
  instructions: string;
  bins: { id: string; label: string }[];
  items: { text: string; bin: string; why: string }[];
}

export function mount(el: HTMLElement, ctx: ActivityContext, param?: string) {
  const set = (data.sorting as Record<string, SortSet>)[param ?? ''];
  if (!set) { el.innerHTML = '<p>Missing sorting data.</p>'; return; }
  let order = shuffle(set.items.map((_, i) => i));
  let where: (string | null)[] = set.items.map(() => null);
  let checked = false;

  const piece = (i: number) => {
    const st = checked && where[i] !== null ? (where[i] === set.items[i].bin ? 'ok' : 'bad') : '';
    return `<div class="piece ${st}" data-item="${i}" role="button" tabindex="0">${esc(set.items[i].text)}</div>`;
  };

  const render = () => {
    el.innerHTML = `
      <p class="instructions small">${esc(set.instructions)}</p>
      <div class="tray" data-bin="">${order.filter((i) => where[i] === null).map(piece).join('') || '<span class="muted">All sorted. Press Check.</span>'}</div>
      <div class="bins">${set.bins.map((b) => `
        <div class="bin" data-bin="${esc(b.id)}" role="button" aria-label="Bin: ${esc(b.label)}">
          <h4>${esc(b.label)}</h4>
          <div class="bin-items">${order.filter((i) => where[i] === b.id).map(piece).join('')}</div>
        </div>`).join('')}</div>
      <div class="row" style="margin-top:12px">
        <button class="btn btn-primary btn-big" data-act="check" type="button">Check</button>
        <button class="btn" data-act="reset" type="button">Try again</button>
      </div>
      <div data-fb></div>`;
  };

  const dnd = enableDnD({
    root: el,
    pieceSelector: '[data-item]',
    dropSelector: '[data-bin]',
    onDrop: (p, target) => {
      const i = Number(p.dataset.item);
      where[i] = target.dataset.bin || null;
      checked = false;
      render();
    },
  });

  el.addEventListener('click', (e) => {
    const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'check') {
      const placed = where.filter((w) => w !== null).length;
      const right = set.items.filter((it, i) => where[i] === it.bin).length;
      checked = true;
      render();
      const wrong = set.items.map((it, i) => ({ it, i })).filter(({ it, i }) => where[i] !== null && where[i] !== it.bin);
      const binName = (id: string) => set.bins.find((b) => b.id === id)?.label ?? id;
      const body = (wrong.length
        ? `<p>Fix these:</p><ul>${wrong.map(({ it }) => `<li><b>${esc(it.text)}</b> belongs in <b>${esc(binName(it.bin))}</b>. ${esc(it.why)}</li>`).join('')}</ul>`
        : '') + (placed < set.items.length ? `<p>${set.items.length - placed} card(s) still to sort.</p>` : '')
        + (right === set.items.length ? `<ul>${set.items.map((it) => `<li><b>${esc(it.text)}</b>: ${esc(it.why)}</li>`).join('')}</ul>` : '');
      (el.querySelector('[data-fb]') as HTMLElement).innerHTML = feedbackHTML(right === set.items.length ? 'ok' : 'bad',
        right === set.items.length ? `All ${right} correct!` : `${right} / ${set.items.length} correct`, body);
      if (placed === set.items.length) void ctx.save(right, set.items.length);
    }
    if (act === 'reset') { where = set.items.map(() => null); order = shuffle(order); checked = false; dnd.clearSelection(); render(); }
  });
  render();
  return () => dnd.destroy();
}
