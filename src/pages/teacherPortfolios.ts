/** Teacher dashboard: Portfolios (review check-ins, mark out of 40 on the Ministry scheme, return for changes). */
import { esc } from '../lib/dom';
import { learner } from '../lib/session';
import { confirmDialog, feedbackHTML, toast } from '../lib/ui';
import { SECTIONS, buildPortfolio, markTotal, type PMeta, type SectionId, type Year } from '../lib/portfolioCore';
import { classesOf, listLearners, type LearnerInfo } from '../firebase/assignments';
import {
  addReview, allPortfolioSummaries, getMark, getPortfolioSettings, listReviews, loadBuildInput, saveMark, savePortfolioSettings,
  setStatus, yearInfo, type PSettings,
} from '../firebase/portfolio';
import { fmtDay, loadThumbs, portfolioSectionsHTML } from './portfolioView';
import { reviewsHTML } from './portfolio';
import { avatarHTML } from '../lib/avatar';
import { allPhotos, approvedPhotoOf } from '../firebase/profilePhoto';

const YEAR_KEY = 'wassce.portfolioYear';
const STATUS: Record<PMeta['status'], string> = { building: 'Building', 'handed-in': 'Handed in', returned: 'Returned', marked: 'Marked' };
const toDateInput = (ts: number | null) => (ts ? new Date(ts - new Date(ts).getTimezoneOffset() * 60_000).toISOString().slice(0, 10) : '');

export async function mountTeacherPortfolios(host: HTMLElement) {
  host.innerHTML = '<div class="skel"><span class="tall"></span><span></span></div>';
  let year: Year = 1;
  try { const y = Number(sessionStorage.getItem(YEAR_KEY)); if ([1, 2, 3].includes(y)) year = y as Year; } catch { /* ignore */ }
  let cls = '';
  let learners: LearnerInfo[] = [], settings: PSettings, sums: Awaited<ReturnType<typeof allPortfolioSummaries>>;
  const load = async () => { [learners, settings, sums] = await Promise.all([listLearners(), getPortfolioSettings(), allPortfolioSummaries(), allPhotos().catch(() => [])]); };

  /* ---------------- List ---------------- */
  const renderList = () => {
    host.onclick = null;
    const metaOf = (uid: string) => sums.metas.find((m) => m.uid === uid && m.year === year);
    const markOf = (uid: string) => sums.marks.find((m) => m.uid === uid && m.year === year);
    const rows = learners
      .filter((l) => (l.year ?? 1) === year || metaOf(l.id))
      .filter((l) => !cls || l.className === cls)
      .map((l) => ({ l, meta: metaOf(l.id), mark: markOf(l.id), items: sums.items.filter((i) => i.uid === l.id && i.year === year).length }))
      .sort((a, b) => Number(b.meta?.status === 'handed-in') - Number(a.meta?.status === 'handed-in') || a.l.name.localeCompare(b.l.name));
    const handedIn = rows.filter((r) => r.meta?.status === 'handed-in').length;
    host.innerHTML = `
      <div class="row" style="justify-content:space-between;margin-bottom:12px"><h2 style="margin:0">Portfolios</h2>
        <span class="muted small">Ministry portfolio assessment: start in week 2, check every 3 to 4 weeks, due in week 20.</span></div>
      <form class="card" data-psettings novalidate>
        <h3>Due dates and cover page</h3>
        <div class="grid-2">
          ${[1, 2, 3].map((y) => `<label class="field"><span>STEM ${y} due date</span><input type="date" name="due${y}" value="${toDateInput(settings.dueAt[String(y) as '1'])}" /></label>`).join('')}
          <label class="field"><span>Period on the cover page</span><input name="period" value="${esc(settings.period)}" placeholder="e.g. 2026/2027 Academic Year" /></label>
        </div>
        <div class="row"><button class="btn btn-primary" data-ssave type="button">Save</button><span data-ssaved class="small"></span></div>
      </form>
      <div class="tabs" role="tablist">${[1, 2, 3].map((y) => `<button class="tab" role="tab" type="button" data-year="${y}" aria-selected="${y === year}">STEM ${y}</button>`).join('')}</div>
      <div class="row" style="margin-bottom:10px"><label class="field" style="margin:0;min-width:220px"><span>Class</span><select data-cls><option value="">All classes</option>${classesOf(learners).map((c) => `<option ${c === cls ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
        <span class="muted">${rows.length} learner${rows.length === 1 ? '' : 's'}, ${handedIn} handed in</span></div>
      ${rows.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th class="left">Learner</th><th>Class</th><th>Items added</th><th>Updated</th><th>Status</th><th>Mark</th><th></th></tr></thead>
        <tbody>${rows.map((r) => `<tr>
          <td class="left"><span class="name-with-avatar">${avatarHTML(r.l.name, approvedPhotoOf(r.l.id), 32)}<b>${esc(r.l.name)}</b></span></td><td>${esc(r.l.className)}</td><td>${r.items}</td>
          <td class="small">${r.meta?.updatedAt ? fmtDay(r.meta.updatedAt) : '-'}</td>
          <td><span class="pill ${r.meta?.status === 'handed-in' ? 'urgent' : r.meta?.status === 'marked' ? 'ok' : ''}">${STATUS[r.meta?.status ?? 'building']}</span></td>
          <td>${r.mark ? `${r.mark.total} / 40` : '-'}</td>
          <td><button class="btn btn-sm btn-primary" data-popen="${r.l.id}" type="button">Open</button></td></tr>`).join('')}</tbody></table></div>`
        : `<div class="card"><p style="margin:0">No STEM ${year} learners${cls ? ' in this class' : ''} yet.</p></div>`}`;
    host.onclick = async (e) => {
      const t = e.target as HTMLElement;
      const y = t.closest<HTMLElement>('[data-year]')?.dataset.year;
      if (y) { year = Number(y) as Year; try { sessionStorage.setItem(YEAR_KEY, y); } catch { /* ignore */ } return renderList(); }
      if (t.closest('[data-ssave]')) {
        const f = host.querySelector('[data-psettings]') as HTMLFormElement;
        const fd = new FormData(f);
        const due = (n: number) => { const v = String(fd.get(`due${n}`) ?? ''); return v ? new Date(`${v}T23:59:00`).getTime() : null; };
        settings = { dueAt: { '1': due(1), '2': due(2), '3': due(3) }, period: String(fd.get('period') ?? '').trim() };
        const out = host.querySelector('[data-ssaved]') as HTMLElement;
        try { await savePortfolioSettings(settings); out.innerHTML = '<span class="mark-ok">Saved</span>'; }
        catch { out.innerHTML = '<span class="mark-bad">Could not save. Check that the latest rules are published.</span>'; }
        return;
      }
      const open = t.closest<HTMLElement>('[data-popen]')?.dataset.popen;
      if (open) await renderOne(learners.find((l) => l.id === open)!);
    };
    host.querySelector('[data-cls]')!.addEventListener('change', (e) => { cls = (e.target as HTMLSelectElement).value; renderList(); });
  };

  /* ---------------- One learner ---------------- */
  const renderOne = async (l: LearnerInfo) => {
    host.onclick = null;
    host.innerHTML = '<div class="skel"><span class="tall"></span><span></span></div>';
    const info = await yearInfo(l.id);
    const [input, reviews, mark] = await Promise.all([loadBuildInput(l.id, year, info), listReviews(l.id, year), getMark(l.id, year)]);
    const built = buildPortfolio(input);
    const meta = input.meta;
    host.innerHTML = `
      <button class="btn btn-sm" data-back type="button">← All STEM ${year} portfolios</button>
      <div class="page-head" style="margin-top:12px"><h2 style="margin:0" class="name-with-avatar">${avatarHTML(l.name, approvedPhotoOf(l.id), 40)}${esc(l.name)}, ${esc(l.className)}: STEM ${year} portfolio</h2>
        <span class="pill">${STATUS[meta.status]}${meta.submittedAt ? `, ${fmtDay(meta.submittedAt)}` : ''}</span></div>
      <div class="row" style="margin-bottom:12px">
        <a class="btn" href="/portfolio/print/${l.id}?y=${year}">Print or save as PDF</a>
        ${meta.status === 'handed-in' || meta.status === 'marked' ? '<button class="btn" data-return type="button">Return for changes</button>' : ''}
      </div>
      ${portfolioSectionsHTML(built, { editable: false, locked: true })}
      <section class="card"><h2>Final reflection</h2><p style="white-space:pre-wrap">${meta.finalReflection ? esc(meta.finalReflection) : '<span class="muted">Not written yet.</span>'}</p></section>
      ${built.hiddenItems.length ? `<p class="muted small">${built.hiddenItems.length} result${built.hiddenItems.length === 1 ? '' : 's'} hidden by the learner.</p>` : ''}
      <section class="card" data-review>
        <h2>Check-in feedback</h2>
        <p class="muted small" style="margin-top:-6px">The Ministry asks for a check-in every 3 to 4 weeks. The learner sees these comments on their portfolio.</p>
        <div data-reviews>${reviewsHTML(reviews)}</div>
        <textarea rows="3" aria-label="New check-in comment" placeholder="e.g. Good start. Add a photo of your circuit and describe what it does."></textarea>
        <div class="row" style="margin-top:8px"><button class="btn btn-primary" data-rsave type="button">Add comment</button></div>
      </section>
      <form class="card" data-markform novalidate>
        <h2>Mark (Ministry scheme, out of 40)</h2>
        <div class="grid-2">${SECTIONS.filter((s) => s.max).map((s) => `<label class="field"><span>${esc(s.title)} (out of ${s.max})</span><input type="number" name="m-${s.id}" min="0" max="${s.max}" step="0.5" value="${mark?.scores[s.id] ?? ''}" /></label>`).join('')}</div>
        <p style="font-size:1.2rem;margin:4px 0 12px">Total: <b data-mtotal>${mark ? mark.total : 0} / 40</b></p>
        <label class="field"><span>Comment for the learner</span><textarea name="comment" rows="3">${esc(mark?.comment ?? '')}</textarea></label>
        <div class="row"><button class="btn btn-primary" data-msave type="button">${mark ? 'Update mark' : 'Save mark'}</button><span data-msaved class="small"></span></div>
      </form>`;
    void loadThumbs(host);
    const form = host.querySelector('[data-markform]') as HTMLFormElement;
    const scores = (): Partial<Record<SectionId, number>> => Object.fromEntries(SECTIONS.filter((s) => s.max)
      .map((s) => [s.id, Number((form.querySelector(`[name=m-${s.id}]`) as HTMLInputElement).value) || 0]));
    form.addEventListener('input', () => { (host.querySelector('[data-mtotal]') as HTMLElement).textContent = `${markTotal(scores())} / 40`; });
    host.onclick = async (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-back]')) { await load(); return renderList(); }
      try {
        if (t.closest('[data-rsave]')) {
          const ta = host.querySelector('[data-review] textarea') as HTMLTextAreaElement;
          if (!ta.value.trim()) return;
          await addReview(l.id, year, ta.value.trim(), learner()?.name ?? '');
          ta.value = '';
          (host.querySelector('[data-reviews]') as HTMLElement).innerHTML = reviewsHTML(await listReviews(l.id, year));
          toast('Comment added.');
          return;
        }
        if (t.closest('[data-msave]')) {
          const sc = scores();
          const clamped = Object.fromEntries(SECTIONS.filter((s) => s.max).map((s) => [s.id, Math.min(s.max, Math.max(0, sc[s.id] ?? 0))]));
          const m = await saveMark(l.id, year, { scores: clamped, comment: String(new FormData(form).get('comment') ?? '').trim() });
          (host.querySelector('[data-msaved]') as HTMLElement).innerHTML = `<span class="mark-ok">Saved: ${m.total} / 40. The learner can see it.</span>`;
          return;
        }
        if (t.closest('[data-return]')) {
          if (!(await confirmDialog(`Return ${l.name}'s portfolio for changes? They can edit it and hand it in again.`, 'Return'))) return;
          await setStatus(l.id, year, 'returned');
          toast('Returned for changes.');
          return renderOne(l);
        }
      } catch (ex) {
        console.error(ex);
        toast('Could not save. Check your connection and that the latest rules are published.');
      }
    };
  };

  try {
    await load();
  } catch (ex) {
    console.error(ex);
    host.innerHTML = feedbackHTML('bad', 'Could not load portfolios.', '<p>Check your internet connection, and that the latest security rules are published in Firebase.</p>');
    return;
  }
  renderList();
}
