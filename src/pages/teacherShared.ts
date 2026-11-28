/** Shared pieces for the teacher's Lessons, Tests and Assignments lists: who-is-it-for labels and the class filter. */
import { esc } from '../lib/dom';
import { audienceLabel, audienceOf, audienceYears, inAudience, learnerClassId, type ClassInfo } from '../lib/audience';
import type { LearnerInfo } from '../firebase/assignments';

type Item = { classIds?: string[] | null; classKey?: string | null; year?: number };

/** Learners an item is set for. */
export const peopleFor = (item: Item, learners: LearnerInfo[]) =>
  learners.filter((l) => inAudience(audienceOf(item), { classId: learnerClassId(l), year: l.year }));

/** True if a learner (by their current class) is outside the item's audience. */
export const isOutside = (item: Item, l: { classId?: string; className: string; year?: number } | undefined) =>
  !!l && !inAudience(audienceOf(item), { classId: learnerClassId(l), year: l.year });

export const audienceCell = (item: Item, classes: ClassInfo[]) => {
  const aud = audienceOf(item);
  return `<span class="aud-label ${aud.length ? '' : 'all'}">${esc(audienceLabel(aud, classes))}</span>`;
};

/* ---------- Filter: everything / one STEM year / one class (remembered while the teacher works) ---------- */
const KEY = 'wassce.teacher.filter';
export const getFilter = () => { try { return sessionStorage.getItem(KEY) ?? ''; } catch { return ''; } };
const setFilter = (v: string) => { try { sessionStorage.setItem(KEY, v); } catch { /* ignore */ } };

export function filterBarHTML(classes: ClassInfo[], counts: { shown: number; total: number }): string {
  const f = getFilter();
  const active = classes.filter((c) => !c.retired);
  return `<div class="t-filter row">
    <label class="field" style="margin:0"><span class="small">Show</span><select data-tfilter>
      <option value="">Everything</option>
      ${[1, 2, 3].map((y) => `<optgroup label="STEM ${y}"><option value="year:${y}" ${f === `year:${y}` ? 'selected' : ''}>All of STEM ${y}</option>
        ${active.filter((c) => c.year === y).map((c) => `<option value="${esc(c.id)}" ${f === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</optgroup>`).join('')}
    </select></label>
    <span class="muted small">${counts.shown === counts.total ? `${counts.total} item${counts.total === 1 ? '' : 's'}` : `${counts.shown} of ${counts.total} shown`}</span>
  </div>`;
}

/** Does an item belong under the current filter? Work for all classes shows everywhere. */
export function matchesFilter(item: Item, classes: ClassInfo[], f = getFilter()): boolean {
  if (!f) return true;
  const aud = audienceOf(item);
  if (f.startsWith('year:')) {
    const y = Number(f.slice(5));
    if (item.year && item.year !== y) return false;
    return !aud.length || audienceYears(aud, classes).includes(y);
  }
  const c = classes.find((x) => x.id === f);
  if (!c) return true;
  if (item.year && item.year !== c.year) return false;
  return inAudience(aud, { classId: c.id, year: c.year });
}

/** Re-draw the list when the filter changes. */
export function wireFilter(host: HTMLElement, redraw: () => void) {
  host.querySelector<HTMLSelectElement>('[data-tfilter]')?.addEventListener('change', (e) => { setFilter((e.target as HTMLSelectElement).value); redraw(); });
}

/** A pill marking a learner who is not in the class(es) the work was set for. */
export const outsidePill = (className: string) =>
  `<span class="pill" style="background:var(--accent-soft)" title="This learner is not in the class this work was set for">From ${esc(className || 'another class')}, not this class</span>`;

/* ---------- Where a test or assignment appears in a unit's lesson player ---------- */
type UnitLite = { id: string; year: number; code: string; subStrand: string };
type LessonLite = { id: string; title: string; unitId?: string; createdAt: number };

export function placementSelectHTML(units: UnitLite[], lessons: LessonLite[], unitId = '', lessonId = ''): string {
  const cur = lessonId ? `lesson:${lessonId}` : unitId ? `unit:${unitId}` : '';
  const used = units.filter((u) => lessons.some((l) => l.unitId === u.id) || u.id === unitId);
  return `<label class="field"><span>Where it appears in the lesson player</span><select name="place">
    <option value="">Not in a unit's lesson player</option>
    ${used.map((u) => `<optgroup label="STEM ${u.year}, ${esc(u.code)} ${esc(u.subStrand)}">
      ${lessons.filter((l) => l.unitId === u.id).sort((a, b) => a.createdAt - b.createdAt).map((l) => `<option value="lesson:${esc(l.id)}" ${cur === `lesson:${l.id}` ? 'selected' : ''}>After: ${esc(l.title)}</option>`).join('')}
      <option value="unit:${esc(u.id)}" ${cur === `unit:${u.id}` ? 'selected' : ''}>At the end of the unit</option></optgroup>`).join('')}
  </select></label>`;
}

export function readPlacement(form: HTMLElement, lessons: LessonLite[]): { unitId: string; lessonId: string } {
  const v = (form.querySelector('select[name=place]') as HTMLSelectElement | null)?.value ?? '';
  if (v.startsWith('lesson:')) { const l = lessons.find((x) => x.id === v.slice(7)); return { unitId: l?.unitId ?? '', lessonId: l?.id ?? '' }; }
  if (v.startsWith('unit:')) return { unitId: v.slice(5), lessonId: '' };
  return { unitId: '', lessonId: '' };
}

/** A ready-made test or assignment: the unit it belongs to and the lesson already added from its ready-made lesson. */
export function readyPlacement(r: { unitId: string; lessonKey?: string }, lessons: (LessonLite & { readyKey?: string })[], readyLessonTitle?: string): { unitId: string; lessonId: string } {
  const l = lessons.find((x) => (r.lessonKey && x.readyKey === r.lessonKey) || (!!readyLessonTitle && x.title === readyLessonTitle));
  return { unitId: r.unitId, lessonId: l?.id ?? '' };
}
