/** Learner Portfolio page (/portfolio): the Ministry portfolio assessment for the learner's STEM year. */
import { esc } from '../lib/dom';
import { icon } from '../lib/icons';
import { learner } from '../lib/session';
import { usingFirebase } from '../storage';
import { confirmDialog, toast } from '../lib/ui';
import { SECTIONS, buildPortfolio, type Built, type PFile, type PMeta, type SectionId, type Year } from '../lib/portfolioCore';
import { fmtDay, itemHTML, loadThumbs, portfolioSectionsHTML, thumbsHTML } from './portfolioView';
import { shrinkImage, uploadFile, deleteFile } from '../firebase/assignments';
import {
  deleteItem, getMark, getPortfolioSettings, listReviews, loadBuildInput, saveItem, saveMeta, yearInfo,
  type PMark, type PReview, type StoredItem, type YearInfo,
} from '../firebase/portfolio';

const STATUS: Record<PMeta['status'], string> = {
  building: 'Building', 'handed-in': 'Handed in', returned: 'Returned for changes', marked: 'Marked',
};
const toDateInput = (ts: number) => new Date(ts - new Date(ts).getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

export function markTableHTML(mark: PMark): string {
  return `<div class="table-wrap"><table class="data"><thead><tr><th class="left">Section</th><th>Mark</th></tr></thead><tbody>
    ${SECTIONS.filter((s) => s.max).map((s) => `<tr><td class="left">${esc(s.title)}</td><td>${mark.scores[s.id] ?? 0} / ${s.max}</td></tr>`).join('')}
    <tr><td class="left"><b>Total</b></td><td><b>${mark.total} / 40</b></td></tr></tbody></table></div>
    ${mark.comment ? `<p style="margin:10px 0 0">${esc(mark.comment)}</p>` : ''}`;
}

export function reviewsHTML(reviews: PReview[]): string {
  return reviews.map((r) => `<div class="p-review"><span class="muted small">${fmtDay(r.at)}${r.teacherName ? `, ${esc(r.teacherName)}` : ''}</span><p>${esc(r.comment)}</p></div>`).join('');
}

export async function portfolioPage(el: HTMLElement) {
  const l = learner();
  if (!usingFirebase || !l) {
    el.innerHTML = `<h1>Portfolio</h1><p class="muted">${usingFirebase ? 'Sign in to see your portfolio.' : 'The portfolio needs learner accounts (Firebase mode).'}</p>`;
    return;
  }
  el.innerHTML = '<div class="skel"><span></span><span class="tall"></span><span class="tall"></span></div>';
  const uid = l.id;
  let info: YearInfo;
  try { info = await yearInfo(uid); } catch { info = { year: (l.year ?? 1) as Year, yearSetAt: null, prevYear: null }; }
  info.year = (l.year ?? info.year) as Year;
  let year: Year = info.year;
  let built: Built, meta: PMeta, items: StoredItem[] = [], reviews: PReview[] = [], mark: PMark | null = null;
  let dueAt: number | null = null;

  const load = async () => {
    const [input, settings, rv, mk] = await Promise.all([
      loadBuildInput(uid, year, info), getPortfolioSettings(), listReviews(uid, year).catch(() => []), getMark(uid, year).catch(() => null),
    ]);
    built = buildPortfolio(input); meta = input.meta; items = input.items as StoredItem[]; reviews = rv; mark = mk;
    dueAt = settings.dueAt[String(year) as '1' | '2' | '3'] ?? null;
  };
  const locked = () => meta.status === 'handed-in' || meta.status === 'marked';
  /** Learners may only send building or handed-in; a returned portfolio keeps its status while being edited. */
  const editStatus = (): PMeta['status'] => (meta.status === 'returned' ? 'returned' : 'building');
  const persist = async (patch: Partial<PMeta>) => {
    const next = { ...meta, ...patch };
    await saveMeta(uid, year, next);
    meta = next;
  };

  const render = () => {
    const lk = locked();
    const SHORT: Record<string, string> = { assignments: 'Assignments', projects: 'Projects', tests: 'Quizzes and tests', reflections: 'Reflections', semester: 'Semester papers', other: 'Other' };
    const counts = built.sections.map((s) => `<span class="pill">${SHORT[s.id]}: ${s.items.length}</span>`).join(' ');
    el.innerHTML = `
      <div class="page-head"><h1>STEM ${year} Portfolio</h1><span data-status class="pill ${meta.status === 'marked' ? 'ok' : meta.status === 'returned' ? 'urgent' : ''}">${STATUS[meta.status]}${mark && meta.status === 'marked' ? ` ${mark.total} / 40` : ''}</span></div>
      ${info.prevYear ? `<div class="tabs" role="tablist" aria-label="Year">${[info.prevYear, info.year].sort().map((y) => `<button class="tab" role="tab" type="button" data-pyear="${y}" aria-selected="${y === year}">STEM ${y}</button>`).join('')}</div>` : ''}
      <div class="card">
        <p style="margin-top:0">Your portfolio shows your Robotics work this year. Results from this site are added for you ${icon('lock', 16)}. Add photos of your notebook, circuits, builds and certificates, and say what each one shows.</p>
        <p class="small" style="margin:0 0 12px"><b>${dueAt ? `Hand it in by ${fmtDay(dueAt)}.` : 'Your teacher has not set a due date yet.'}</b> ${counts}</p>
        ${meta.status === 'handed-in' ? '<p class="mark-ok" style="margin:0 0 12px">Handed in. Your teacher will review it. You cannot change it unless your teacher returns it.</p>' : ''}
        ${meta.status === 'returned' ? '<p class="mark-bad" style="margin:0 0 12px">Your teacher returned your portfolio for changes. Read the feedback below, make the changes, then hand it in again.</p>' : ''}
        <div class="row">
          <button class="btn btn-primary" data-padd type="button" ${lk ? 'disabled' : ''}>+ Add to my portfolio</button>
          <a class="btn" href="/portfolio/print?y=${year}" data-print>Print or save as PDF</a>
          <span class="spacer"></span>
          ${lk ? '' : '<button class="btn btn-accent" data-handin type="button">Hand in my portfolio</button>'}
        </div>
        <div data-pformwrap></div>
      </div>
      ${portfolioSectionsHTML(built, { editable: true, locked: lk })}
      <section class="card">
        <h2>Final reflection</h2>
        <p class="muted small" style="margin-top:-6px">Look back over the year: what you learned, what you are proud of, what was hard and what you will do next.</p>
        <textarea data-final rows="6" ${lk ? 'readonly' : ''} aria-label="Final reflection">${esc(meta.finalReflection)}</textarea>
        <span data-finalsaved class="small"></span>
      </section>
      ${reviews.length || mark ? `<section class="card"><h2>Teacher feedback</h2>${reviewsHTML(reviews)}${mark ? `<h3>Mark</h3>${markTableHTML(mark)}` : ''}</section>` : ''}
      ${built.hiddenItems.length ? `<section class="card" data-hidden><h2>Hidden from your portfolio</h2><p class="muted small" style="margin-top:-6px">These stay on the site but are left out of your portfolio and its printout.</p>${built.hiddenItems.map((it) => itemHTML(it, { editable: true, locked: lk, hiddenList: true })).join('')}</section>` : ''}`;
    void loadThumbs(el);
  };

  /* ---------- Add or edit an item ---------- */
  const openForm = (existing?: StoredItem) => {
    const wrap = el.querySelector('[data-pformwrap]') as HTMLElement;
    const files: PFile[] = existing ? [...existing.files] : [];
    const uploadedNow: PFile[] = [];
    wrap.innerHTML = `<form data-pform class="stack p-form" novalidate>
      <h3 style="margin:16px 0 0">${existing ? 'Edit item' : 'Add to my portfolio'}</h3>
      <div class="grid-2">
        <label class="field"><span>Section</span><select name="section">${SECTIONS.map((s) => `<option value="${s.id}" ${existing?.section === s.id ? 'selected' : ''}>${esc(s.title)}</option>`).join('')}</select></label>
        <label class="field"><span>Date</span><input name="date" type="date" value="${toDateInput(existing?.date ?? Date.now())}" /></label>
      </div>
      <label class="field"><span>Title</span><input name="title" maxlength="120" value="${esc(existing?.title ?? '')}" placeholder="e.g. Truth tables for AND, OR and NOT" /></label>
      <label class="field"><span>Description: what is this, and what does it show about your learning?</span><textarea name="description" rows="3">${esc(existing?.description ?? '')}</textarea></label>
      <div class="row">
        <label class="btn"><input type="file" accept="image/*" capture="environment" data-pcam hidden />${icon('upload', 20)} Take a photo</label>
        <label class="btn"><input type="file" multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx" data-pfiles hidden />Choose files</label>
        <span class="muted small">Photos, PDF, Word or PowerPoint, up to 10 MB each.</span>
      </div>
      <div data-plist></div>
      <div data-pprog class="small"></div>
      <div data-perr class="mark-bad small"></div>
      <div class="row"><button class="btn btn-primary" data-psave type="button">Save</button><button class="btn" data-pcancel type="button">Cancel</button></div>
    </form>`;
    const form = wrap.querySelector('form') as HTMLFormElement;
    const list = form.querySelector('[data-plist]') as HTMLElement;
    const prog = form.querySelector('[data-pprog]') as HTMLElement;
    const errBox = form.querySelector('[data-perr]') as HTMLElement;
    let busy = 0;
    const drawFiles = () => {
      list.innerHTML = files.length ? `<div class="p-pending">${files.map((f, i) => `<span class="p-pend" data-pendfile>${thumbsHTML([f])}<button class="btn btn-sm" type="button" data-prm="${i}" aria-label="Remove ${esc(f.name)}">Remove</button></span>`).join('')}</div>` : '';
      void loadThumbs(list);
    };
    drawFiles();
    form.addEventListener('change', async (e) => {
      const inp = e.target as HTMLInputElement;
      if (inp.type !== 'file' || !inp.files?.length) return;
      const picked = [...inp.files];
      inp.value = '';
      busy++;
      for (const f of picked) {
        try {
          const small = await shrinkImage(f);
          const up = await uploadFile('portfolio', small, (p) => { prog.textContent = `Uploading ${f.name}: ${Math.round(p * 100)}%`; });
          files.push(up); uploadedNow.push(up);
          drawFiles();
        } catch (ex) {
          errBox.textContent = `${f.name}: ${(ex as Error).message}`;
        }
      }
      busy--;
      prog.textContent = '';
    });
    form.addEventListener('click', async (e) => {
      const t = e.target as HTMLElement;
      const rm = t.closest<HTMLElement>('[data-prm]')?.dataset.prm;
      if (rm !== undefined) {
        const [f] = files.splice(Number(rm), 1);
        if (uploadedNow.includes(f)) void deleteFile(f.key).catch(() => undefined);
        drawFiles();
        return;
      }
      if (t.closest('[data-pcancel]')) {
        uploadedNow.forEach((f) => void deleteFile(f.key).catch(() => undefined));
        wrap.innerHTML = '';
        return;
      }
      if (!t.closest('[data-psave]')) return;
      if (busy) { errBox.textContent = 'Wait for the upload to finish.'; return; }
      const fd = new FormData(form);
      const title = String(fd.get('title') ?? '').trim();
      if (!title) { errBox.textContent = 'Give it a title.'; return; }
      const d = String(fd.get('date') ?? '');
      const btn = t.closest('[data-psave]') as HTMLButtonElement;
      btn.disabled = true;
      try {
        await saveItem(uid, {
          id: existing?.id, year, section: String(fd.get('section')) as SectionId, title,
          date: d ? new Date(`${d}T12:00:00`).getTime() : Date.now(), description: String(fd.get('description') ?? '').trim(),
          files, createdAt: existing?.createdAt ?? Date.now(),
        });
        toast(existing ? 'Saved.' : 'Added to your portfolio.');
        await load(); render();
      } catch (ex) {
        console.error(ex);
        btn.disabled = false;
        errBox.textContent = 'Could not save. Check your internet connection.';
      }
    });
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* ---------- Note on an automatic item ---------- */
  const openNote = (card: HTMLElement, id: string) => {
    const slot = card.querySelector('[data-slot]') as HTMLElement;
    slot.innerHTML = `<div data-noteform class="stack" style="margin-top:10px">
      <label class="field"><span>Your note: what this shows about your learning</span><textarea rows="3">${esc(meta.notes[id] ?? '')}</textarea></label>
      <div class="row"><button class="btn btn-primary btn-sm" data-nsave type="button">Save note</button><button class="btn btn-sm" data-ncancel type="button">Cancel</button></div></div>`;
    (slot.querySelector('textarea') as HTMLTextAreaElement).focus();
  };

  el.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    const y = t.closest<HTMLElement>('[data-pyear]')?.dataset.pyear;
    if (y) { year = Number(y) as Year; await load(); render(); return; }
    if (t.closest('[data-padd]')) { openForm(); return; }
    if (t.closest('[data-handin]')) {
      if (!(await confirmDialog('Hand in your portfolio? You cannot change it after this unless your teacher returns it to you.', 'Hand in'))) return;
      try { await persist({ status: 'handed-in', submittedAt: Date.now() }); toast('Portfolio handed in.'); }
      catch { toast('Could not hand in. Check your internet connection.'); }
      render();
      return;
    }
    const card = t.closest<HTMLElement>('[data-pid]');
    if (!card) return;
    const id = card.dataset.pid!;
    try {
      if (t.closest('[data-phide]')) { await persist({ hidden: [...new Set([...meta.hidden, id])], status: editStatus() }); await load(); render(); return; }
      if (t.closest('[data-pshow]')) { await persist({ hidden: meta.hidden.filter((x) => x !== id), status: editStatus() }); await load(); render(); return; }
      if (t.closest('[data-ncancel]')) { (card.querySelector('[data-slot]') as HTMLElement).innerHTML = ''; return; }
      if (t.closest('[data-nsave]')) {
        const note = (card.querySelector('[data-noteform] textarea') as HTMLTextAreaElement).value.trim();
        const notes = { ...meta.notes };
        if (note) notes[id] = note; else delete notes[id];
        await persist({ notes, status: editStatus() });
        await load(); render();
        return;
      }
      const own = items.find((x) => x.id === id);
      if (t.closest('[data-pedit]')) { if (own) openForm(own); else openNote(card, id); return; }
      if (t.closest('[data-pdel]') && own) {
        if (!(await confirmDialog(`Delete "${own.title}" and its photos from your portfolio?`, 'Delete', true))) return;
        await deleteItem(uid, own);
        await load(); render();
      }
    } catch (ex) {
      console.error(ex);
      toast('Could not save. Check your internet connection.');
    }
  });
  el.addEventListener('focusout', async (e) => {
    const ta = e.target as HTMLTextAreaElement;
    if (ta.dataset.final === undefined || ta.readOnly || ta.value.trim() === meta.finalReflection) return;
    const out = el.querySelector('[data-finalsaved]') as HTMLElement;
    try { await persist({ finalReflection: ta.value.trim(), status: editStatus() }); out.innerHTML = '<span class="mark-ok">Saved</span>'; }
    catch { out.innerHTML = '<span class="mark-bad">Not saved. Check your internet connection.</span>'; }
  });

  try {
    await load();
  } catch (ex) {
    console.error(ex);
    el.innerHTML = '<h1>Portfolio</h1><p class="mark-bad">Could not load your portfolio. Check your internet connection.</p>';
    return;
  }
  render();
}
