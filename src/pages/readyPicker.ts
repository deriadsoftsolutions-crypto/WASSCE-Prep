import { esc } from '../lib/dom';
import { unitLabel } from '../data/ready';

export interface PickItem { key: string; title: string; when: string; added: boolean; year: number; unitId: string }

/**
 * The "ready-made" picker shared by Lessons, Tests and Assignments on the teacher dashboard:
 * a STEM year filter, then the items grouped under their curriculum unit, in teaching order.
 * Buttons carry data-addready="<key>"; the page handles the click.
 */
export function mountReadyPicker(box: HTMLElement, heading: string, items: PickItem[]) {
  const years = [...new Set(items.map((i) => i.year))].sort();
  // Open the first year that still has something to add.
  let year = years.find((y) => items.some((i) => i.year === y && !i.added)) ?? years[0];
  const draw = () => {
    const shown = items.filter((i) => i.year === year);
    const units = [...new Set(shown.map((i) => i.unitId))];
    box.innerHTML = `<div class="card" data-readycard><h3>${esc(heading)}</h3>
      <p class="muted small" style="margin-top:-6px">Added as a draft for you to check, edit, give a class and dates, and publish.</p>
      ${years.length > 1 ? `<div class="tabs" role="tablist">${years.map((y) => `<button class="tab" role="tab" type="button" data-ryear="${y}" aria-selected="${y === year}">STEM ${y}</button>`).join('')}</div>` : ''}
      ${units.map((u) => `<h4 class="ready-unit">${esc(unitLabel(u))}</h4>${shown.filter((i) => i.unitId === u).map((r) => `<div class="row ready-row">
        <span style="min-width:0"><b>${esc(r.title)}</b><br><span class="muted small">${esc(r.when)}</span></span>
        <button class="btn btn-primary btn-sm" data-addready="${esc(r.key)}" type="button" ${r.added ? 'disabled' : ''}>${r.added ? 'Already added' : 'Add as draft'}</button></div>`).join('')}`).join('')}
      ${!items.length ? '<p class="muted">None yet.</p>' : ''}</div>`;
  };
  box.onclick = (e) => {
    const y = (e.target as HTMLElement).closest<HTMLElement>('[data-ryear]')?.dataset.ryear;
    if (y) { year = Number(y); draw(); }
  };
  draw();
}
