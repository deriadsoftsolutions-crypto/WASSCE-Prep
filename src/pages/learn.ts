import topicsData from '../data/topics.json';
import type { Topic } from '../types';
import { esc } from '../lib/dom';
import { icon } from '../lib/icons';
import { learner } from '../lib/session';
import { storage, usingFirebase } from '../storage';
import { feedbackHTML } from '../lib/ui';
import { CONFIG } from '../config';
import { STRANDS, getUnit, listMaterials, listUnits, materialHref, materialKindLabel, type Material, type Unit } from '../firebase/units';
import { finishedLessons, lessonCardsHTML } from './lessons';
import { lessonsFor, type Lesson } from '../firebase/lessons';
import { ledHTML, masteryLevel } from './home';
import { viewerHref } from '../lib/viewable';

const topics = topicsData as Topic[];
const YEAR_KEY = 'wassce.learnYear';
const fmtSize = (n?: number) => (!n ? '' : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

/** Lessons for the learner's class in every year (for browsing units of any year). */
async function classLessons(teacher: boolean): Promise<Lesson[]> {
  const l = learner();
  return l ? lessonsFor({ ...l, year: null }, teacher).catch(() => [] as Lesson[]) : [];
}

async function isTeacherNow(): Promise<boolean> {
  const { isTeacher } = await import('../firebase/account');
  return isTeacher().catch(() => false);
}

function needsAccount(el: HTMLElement, title: string): boolean {
  if (usingFirebase && learner()) return false;
  el.innerHTML = `<h1>${esc(title)}</h1><p class="muted">${usingFirebase ? 'Sign in to see your lessons and materials.' : 'Lessons and materials need learner accounts (Firebase mode).'}</p>`;
  return true;
}

/* ---------------- Learn: units for a year ---------------- */
export async function learnPage(el: HTMLElement) {
  if (needsAccount(el, 'Learn')) return;
  el.innerHTML = '<div class="skel"><span></span><span class="tall"></span><span class="tall"></span></div>';
  const l = learner()!;
  let year = (l.year ?? 1) as 1 | 2 | 3;
  try { const s = Number(sessionStorage.getItem(YEAR_KEY)); if ([1, 2, 3].includes(s)) year = s as 1 | 2 | 3; } catch { /* ignore */ }
  const teacher = await isTeacherNow();
  let units: Unit[] = [], materials: Material[] = [];
  try {
    [units, materials] = await Promise.all([listUnits(), listMaterials(teacher)]);
  } catch {
    el.innerHTML = '<h1>Learn</h1><p class="mark-bad">Could not load the units. Check your internet connection.</p>';
    return;
  }
  const [lessons, done] = await Promise.all([classLessons(teacher), finishedLessons()]);

  const render = () => {
    const yu = units.filter((u) => u.year === year && (u.published || teacher));
    const yearRes = materials.filter((m) => m.year === year && !m.unitId);
    const strands = [...new Set(yu.map((u) => u.strand))].sort();
    el.innerHTML = `
      <div class="page-head"><h1>Learn</h1><span class="row"><span class="muted">Robotics${l.year ? `, you are in STEM ${l.year}` : ''}</span><a class="btn btn-sm" href="/python">${icon('play', 18)} Python practice</a></span></div>
      <div class="tabs" role="tablist" aria-label="Year">
        ${[1, 2, 3].map((y) => `<button class="tab" role="tab" type="button" data-year="${y}" aria-selected="${y === year}">STEM ${y}${y === l.year ? ' (your year)' : ''}</button>`).join('')}
      </div>
      ${yearRes.length ? `<section class="card" aria-labelledby="yr"><h2 id="yr">Books and resources for STEM ${year}</h2>${materialsListHTML(yearRes)}</section>` : ''}
      ${!yu.length ? `<div class="card"><p style="margin:0">${teacher ? 'No units for this year yet. Load the NaCCA units on the Teacher page, under Curriculum.' : 'Your teacher has not published any units for this year yet.'}</p></div>` : ''}
      ${strands.map((s) => `
        <section>
          <h2>Strand ${s}: ${esc(STRANDS[String(s)] ?? '')}</h2>
          <div class="act-cards">
            ${yu.filter((u) => u.strand === s).map((u) => {
              const ls = lessons.filter((x) => x.unitId === u.id);
              const fin = ls.filter((x) => done.has(x.id)).length;
              const mats = materials.filter((m) => m.unitId === u.id).length;
              return `<a class="act-card" href="/learn/${u.id}">
                <span class="muted small">${esc(u.code)}, ${esc(u.subStrand)}${u.published ? '' : ' <span class="pill">Draft</span>'}</span>
                <span class="ac-title">${esc(u.title)}</span>
                <span class="ac-blurb">${esc(u.summary)}</span>
                <span class="ac-foot"><span class="muted small">${ls.length} lesson${ls.length === 1 ? '' : 's'}${ls.length ? `, ${fin} finished` : ''}. ${mats} material${mats === 1 ? '' : 's'}</span><span class="ac-go">Open</span></span>
              </a>`;
            }).join('')}
          </div>
        </section>`).join('')}`;
  };
  render();
  el.addEventListener('click', (e) => {
    const y = (e.target as HTMLElement).closest<HTMLElement>('[data-year]')?.dataset.year;
    if (!y) return;
    year = Number(y) as 1 | 2 | 3;
    try { sessionStorage.setItem(YEAR_KEY, y); } catch { /* ignore */ }
    render();
  });
}

export function materialsListHTML(list: Material[]): string {
  return `<div class="due-list">${list.map((m) => {
    const kindIcon = m.kind === 'youtube' || m.kind === 'video' ? 'play' : m.kind === 'link' ? 'clip' : 'file';
    const external = m.kind === 'link' || m.kind === 'youtube';
    const inSite = m.kind === 'file' ? viewerHref(m.url, { name: m.fileName, title: m.title, page: m.page, teacherOnly: m.audience === 'teachers' }) : null;
    const href = m.kind === 'youtube' ? `https://www.youtube.com/watch?v=${encodeURIComponent(m.url)}` : inSite ?? materialHref(m);
    const extra = [materialKindLabel(m), m.page ? `from page ${m.page}` : '', fmtSize(m.size), m.audience === 'teachers' ? 'teachers only' : ''].filter(Boolean).join(', ');
    return `<a class="due-row" href="${esc(href)}" ${!inSite && (external || m.kind === 'file' || m.kind === 'video') ? 'target="_blank" rel="noopener"' : ''}>
      ${icon(kindIcon, 24)}
      <span class="due-main"><b>${esc(m.title)}</b>${m.description ? `<br><span class="due-sub">${esc(m.description)}</span>` : ''}</span>
      <span class="pill ${m.audience === 'teachers' ? 'urgent' : ''}">${esc(extra)}</span>
    </a>`;
  }).join('')}</div>`;
}

/* ---------------- One unit ---------------- */
export async function unitPage(el: HTMLElement, params: Record<string, string>) {
  if (needsAccount(el, 'Unit')) return;
  el.innerHTML = '<div class="skel"><span></span><span class="tall"></span><span class="tall"></span></div>';
  const teacher = await isTeacherNow();
  const [unit, materials, lessons, done] = await Promise.all([
    getUnit(params.id).catch(() => null), listMaterials(teacher).catch(() => [] as Material[]), classLessons(teacher), finishedLessons(),
  ]);
  if (!unit || (!unit.published && !teacher)) { el.innerHTML = '<h1>Unit not found</h1><p><a href="/learn">Back to Learn</a></p>'; return; }
  const l = learner()!;
  const prog = await storage.getProgress(l.id).catch(() => null);
  const mats = materials.filter((m) => m.unitId === unit.id);
  const ls = lessons.filter((x) => x.unitId === unit.id);
  const linked = unit.wassceTopics.map((id) => topics.find((t) => t.id === id)).filter((t): t is Topic => !!t);

  el.innerHTML = `
    <div class="act-header">
      <a class="back" href="/learn" aria-label="Back to Learn">${icon('back', 22)}</a>
      <div style="min-width:0">
        <div class="crumb-line">STEM ${unit.year}, ${esc(unit.code)}. Strand ${unit.strand}: ${esc(STRANDS[String(unit.strand)] ?? '')}${unit.published ? '' : '. Draft: learners cannot see it yet'}</div>
        <h1>${esc(unit.title)}</h1>
      </div>
    </div>
    <div class="grid-2">
      <div class="card">
        <h2>What this unit is about</h2>
        <p>${esc(unit.summary)}</p>
        ${unit.section ? `<p class="muted small" style="margin:0">In the Ministry Robotics book for Year ${unit.year}, this is Section ${unit.section}.</p>` : ''}
      </div>
      <div class="card">
        <h2>By the end you will be able to</h2>
        <ul class="key-ideas">${unit.indicators.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>
    </div>
    <section><h2>Lessons</h2>${ls.length ? lessonCardsHTML(ls, done, false) : '<div class="card"><p style="margin:0">No lessons in this unit yet.</p></div>'}</section>
    <section><h2>Materials</h2>${mats.length ? materialsListHTML(mats) : '<div class="card"><p style="margin:0">No materials in this unit yet.</p></div>'}
      ${mats.some((m) => m.kind === 'file') ? '<p class="muted small">Notes you open are kept on this tablet, so you can read them again without internet.</p>' : ''}</section>
    ${linked.length ? `<section><h2>Practise for WASSCE</h2><div class="tiles">${linked.map((t) => {
      const lv = masteryLevel(prog, t.id);
      return `<a class="tile" href="/topic/${t.id}"><span class="num">${t.id}</span><span class="tile-body"><span class="tile-title">${esc(t.short)}</span><span class="tile-level">${t.activities.length} activities and Paper 1 questions</span></span>${ledHTML(lv)}</a>`;
    }).join('')}</div></section>` : ''}
    <details class="card" style="margin-top:20px"><summary><b>Curriculum learning outcomes (NaCCA)</b></summary>
      <ul class="key-ideas" style="margin-top:10px">${unit.outcomes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>`;
}

/* ---------------- WASSCE hub ---------------- */
export async function wasscePage(el: HTMLElement) {
  const l = learner();
  const prog = l ? await storage.getProgress(l.id).catch(() => null) : null;
  const weeks = Math.max(0, Math.ceil((new Date(CONFIG.WASSCE_DATE).getTime() - Date.now()) / (7 * 86_400_000)));
  el.innerHTML = `
    <div class="page-head"><h1>WASSCE Prep</h1><span class="muted">${weeks} weeks to the ${esc(CONFIG.WASSCE_LABEL)} papers</span></div>
    ${l?.year && l.year < 3 ? feedbackHTML('info', `You are in STEM ${l.year}.`, '<p style="margin:4px 0 0">WASSCE is at the end of STEM 3, but practising early helps. Every question here comes from the WASSCE syllabus.</p>') : ''}
    <div class="t-summary" style="margin-top:12px">
      <a class="t-stat" href="/mock" style="text-decoration:none;color:inherit">${icon('paper1', 32)}<span class="lbl">Paper 1 mock</span><span class="sub">40 objective questions, timed, with your score per topic</span></a>
      <a class="t-stat" href="/paper2" style="text-decoration:none;color:inherit">${icon('paper2', 32)}<span class="lbl">Paper 2 practice</span><span class="sub">Essay questions with model answers and self-marking</span></a>
    </div>
    <section aria-labelledby="wt">
      <div class="section-head"><h2 id="wt">Practice topics</h2><span class="muted small">Activities and Paper 1 questions for each WASSCE topic</span></div>
      <div class="tiles">${topics.map((t) => {
        const lv = masteryLevel(prog, t.id);
        return `<a class="tile" href="/topic/${t.id}"><span class="num">${t.id}</span><span class="tile-body"><span class="tile-title">${esc(t.short)}</span><span class="tile-level">${['Not started', 'Learning', 'Practising', 'Nearly there', 'Mastered'][lv]}</span></span>${ledHTML(lv)}</a>`;
      }).join('')}</div>
    </section>`;
}
