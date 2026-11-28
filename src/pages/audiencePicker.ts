/**
 * "Who is it for?" on the teacher's lesson, test and assignment forms:
 * all classes, every class in a STEM year, or particular classes.
 */
import { esc } from '../lib/dom';
import { audienceLabel, normaliseAudience, yearToken, type ClassInfo } from '../lib/audience';

export function audiencePickerHTML(aud: string[], classes: ClassInfo[]): string {
  const active = classes.filter((c) => !c.retired || aud.includes(c.id));
  // Items set for a class typed before classes were fixed (no longer in the list) keep that choice.
  const unknown = aud.filter((t) => !t.startsWith('year:') && !classes.some((c) => c.id === t));
  const chip = (value: string, label: string, extra = '') =>
    `<label class="aud-chip"><input type="checkbox" value="${esc(value)}" ${aud.includes(value) ? 'checked' : ''} ${extra} /> <span>${esc(label)}</span></label>`;
  return `<fieldset class="field aud-picker" data-aud>
    <legend>Who is it for?</legend>
    <label class="aud-chip aud-all"><input type="checkbox" data-aud-all ${aud.length ? '' : 'checked'} /> <span>All classes</span></label>
    ${[1, 2, 3].map((y) => {
      const inY = active.filter((c) => c.year === y);
      return `<div class="aud-year" data-year="${y}">
        ${chip(yearToken(y), `All STEM ${y}`, 'data-aud-year')}
        ${inY.map((c) => chip(c.id, c.name, `data-aud-class data-y="${y}"`)).join('')}
      </div>`;
    }).join('')}
    ${unknown.length ? `<div class="aud-year">${unknown.map((t) => chip(t, `${t.toUpperCase()} (typed class)`, 'data-aud-class')).join('')}</div>` : ''}
    <p class="muted small" data-aud-note style="margin:6px 0 0"></p>
    ${classes.length ? '' : '<p class="muted small" style="margin:4px 0 0">Add your classes on the Classes page to set work for one class.</p>'}
  </fieldset>`;
}

/** Keep the choices consistent: "All classes" clears the rest; a whole year covers its classes. */
export function wireAudiencePicker(root: HTMLElement, classes: ClassInfo[]) {
  const box = root.querySelector<HTMLElement>('[data-aud]');
  if (!box) return;
  const all = box.querySelector<HTMLInputElement>('[data-aud-all]')!;
  const sync = () => {
    box.querySelectorAll<HTMLElement>('.aud-year').forEach((row) => {
      const yearOn = !!row.querySelector<HTMLInputElement>('[data-aud-year]')?.checked;
      row.querySelectorAll<HTMLInputElement>('[data-aud-class]').forEach((c) => { c.disabled = yearOn; if (yearOn) c.checked = false; });
    });
    const aud = readAudience(root, classes);
    all.checked = !aud.length;
    (box.querySelector('[data-aud-note]') as HTMLElement).textContent = `Set for: ${audienceLabel(aud, classes)}. Learners in other classes can still open it; you will see who they are.`;
  };
  box.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t === all && all.checked) box.querySelectorAll<HTMLInputElement>('input[type=checkbox]:not([data-aud-all])').forEach((c) => { c.checked = false; });
    sync();
  });
  sync();
}

export function readAudience(root: HTMLElement, classes: ClassInfo[]): string[] {
  const picked = [...root.querySelectorAll<HTMLInputElement>('[data-aud] input[type=checkbox]:not([data-aud-all]):checked')].map((c) => c.value);
  return normaliseAudience(picked, classes);
}
