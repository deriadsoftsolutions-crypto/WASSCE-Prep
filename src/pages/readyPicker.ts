import { esc } from '../lib/dom';

/** The "ready-made" picker card shared by Lessons, Tests and Assignments on the teacher dashboard. */
export function readyPickerHTML(heading: string, items: { key: string; title: string; when: string; added: boolean }[]): string {
  return `<div class="card" data-readycard><h3>${esc(heading)}</h3>
    <p class="muted small" style="margin-top:-6px">Added as a draft for you to check, edit, give a class and dates, and publish.</p>
    ${items.map((r) => `<div class="row" style="justify-content:space-between;border-top:1px solid var(--line);padding:10px 0;flex-wrap:nowrap">
      <span style="min-width:0"><b>${esc(r.title)}</b><br><span class="muted small">${esc(r.when)}</span></span>
      <button class="btn btn-primary btn-sm" data-addready="${esc(r.key)}" type="button" ${r.added ? 'disabled' : ''}>${r.added ? 'Already added' : 'Add as draft'}</button></div>`).join('')}</div>`;
}
