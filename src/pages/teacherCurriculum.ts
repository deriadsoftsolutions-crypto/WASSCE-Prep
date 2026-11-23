import topicsData from '../data/topics.json';
import type { Topic } from '../types';
import { esc } from '../lib/dom';
import { confirmDialog, feedbackHTML, toast } from '../lib/ui';
import {
  STRANDS, deleteMaterial, listMaterials, listUnits, materialKindLabel, saveMaterial, saveUnit, seedUnits, uploadMaterialFile,
  type Material, type Unit, type Year,
} from '../firebase/units';
import { listLessons, youtubeId, type Lesson } from '../firebase/lessons';
import curriculum from '../data/curriculum.json';

const topics = topicsData as Topic[];
const YEAR_KEY = 'wassce.curriculumYear';
export const NEW_LESSON_KEY = 'wassce.newLessonUnit';
const fmtSize = (n?: number) => (!n ? '' : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
const baseName = (n: string) => n.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();

/** Teacher dashboard: Curriculum section (units and materials for STEM 1 to 3). */
export async function mountTeacherCurriculum(host: HTMLElement, openLessons: () => void) {
  host.innerHTML = '<div class="skel"><span class="tall"></span><span></span><span></span></div>';
  let units: Unit[] = [], materials: Material[] = [], lessons: Lesson[] = [];
  let year: Year = 1;
  try { const y = Number(sessionStorage.getItem(YEAR_KEY)); if ([1, 2, 3].includes(y)) year = y as Year; } catch { /* ignore */ }
  const load = async () => { [units, materials, lessons] = await Promise.all([listUnits(), listMaterials(true), listLessons()]); };

  /* ---------------- Year overview ---------------- */
  const renderList = () => {
    host.onclick = null;
    const yu = units.filter((u) => u.year === year).sort((a, b) => a.order - b.order);
    const yearRes = materials.filter((m) => m.year === year && !m.unitId);
    const missing = (curriculum.units as { code: string }[]).length - units.length;
    host.innerHTML = `
      <div class="row" style="justify-content:space-between;margin-bottom:12px"><h2 style="margin:0">Curriculum</h2>
        ${missing > 0 ? `<button class="btn btn-accent" data-seed type="button">${units.length ? `Add the ${missing} missing NaCCA units` : 'Load the 21 NaCCA units as drafts'}</button>` : ''}</div>
      ${!units.length ? feedbackHTML('info', 'Start here', '<p style="margin:4px 0 0">Load the units from the NaCCA SHS Robotics curriculum (8 for STEM 1, 8 for STEM 2, 5 for STEM 3). They arrive as drafts with the official outcomes and indicators and a short summary for you to check. Learners see a unit only after you publish it.</p>') : ''}
      <div class="tabs" role="tablist">${[1, 2, 3].map((y) => `<button class="tab" role="tab" type="button" data-year="${y}" aria-selected="${y === year}">STEM ${y} (${units.filter((u) => u.year === y).length})</button>`).join('')}</div>
      ${yu.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th>Code</th><th class="left">Unit</th><th>Status</th><th>Lessons</th><th>Materials</th><th></th></tr></thead>
        <tbody>${yu.map((u, i) => `<tr>
          <td class="num" style="font-size:1.2rem">${esc(u.code)}</td>
          <td class="left"><b>${esc(u.title)}</b><div class="muted small">${esc(STRANDS[String(u.strand)] ?? '')} > ${esc(u.subStrand)}${u.section ? `. Book section ${u.section}` : ''}</div></td>
          <td>${u.published ? '<span class="pill ok">Published</span>' : '<span class="pill">Draft</span>'}</td>
          <td>${lessons.filter((x) => x.unitId === u.id).length}</td>
          <td>${materials.filter((m) => m.unitId === u.id).length}</td>
          <td><div class="row" style="flex-wrap:nowrap;justify-content:center">
            <button class="btn btn-sm" data-up="${u.id}" type="button" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
            <button class="btn btn-sm" data-down="${u.id}" type="button" ${i === yu.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
            <button class="btn btn-sm btn-primary" data-edit="${u.id}" type="button">Open</button></div></td></tr>`).join('')}</tbody></table></div>
        ${yu.some((u) => !u.published) ? `<div class="row" style="margin-top:10px"><button class="btn" data-publishall type="button">Publish all STEM ${year} drafts</button></div>` : ''}` : ''}
      <section class="card" style="margin-top:20px">
        <h3>Books and resources for the whole of STEM ${year}</h3>
        <p class="muted small" style="margin-top:-4px">For a whole-year book, such as a Learner Edition. Then, inside each unit, add <b>Section of a book</b> to open the book at that unit's page.</p>
        <div data-matlist></div>
        <div data-matform></div>
      </section>`;
    mountMaterials(host.querySelector('[data-matlist]') as HTMLElement, host.querySelector('[data-matform]') as HTMLElement, year, '', yearRes);
    host.onclick = async (e) => {
      const t = e.target as HTMLElement;
      const y = t.closest<HTMLElement>('[data-year]')?.dataset.year;
      if (y) { year = Number(y) as Year; try { sessionStorage.setItem(YEAR_KEY, y); } catch { /* ignore */ } return renderList(); }
      if (t.closest('[data-seed]')) {
        (t.closest('[data-seed]') as HTMLButtonElement).disabled = true;
        const n = await seedUnits().catch((ex) => { console.error(ex); return -1; });
        if (n < 0) return toast('Could not load the units. Check the Firebase rules are published.');
        toast(`${n} draft unit${n === 1 ? '' : 's'} added.`);
        await load();
        return renderList();
      }
      if (t.closest('[data-publishall]')) {
        const drafts = units.filter((u) => u.year === year && !u.published);
        if (!(await confirmDialog(`Publish all ${drafts.length} STEM ${year} draft units? Learners in STEM ${year} will see them.`, 'Publish'))) return;
        await Promise.all(drafts.map((u) => saveUnit({ ...u, published: true })));
        await load();
        return renderList();
      }
      const up = t.closest<HTMLElement>('[data-up]')?.dataset.up;
      const down = t.closest<HTMLElement>('[data-down]')?.dataset.down;
      if (up || down) {
        const yu2 = units.filter((u) => u.year === year).sort((a, b) => a.order - b.order);
        const i = yu2.findIndex((u) => u.id === (up ?? down));
        const j = up ? i - 1 : i + 1;
        if (j < 0 || j >= yu2.length) return;
        const [a, b] = [yu2[i], yu2[j]];
        await Promise.all([saveUnit({ ...a, order: b.order }), saveUnit({ ...b, order: a.order })]);
        await load();
        return renderList();
      }
      const ed = t.closest<HTMLElement>('[data-edit]')?.dataset.edit;
      if (ed) renderUnit(units.find((u) => u.id === ed)!);
    };
  };

  /* ---------------- Materials list and add form (shared by units and year resources) ---------------- */
  const mountMaterials = (listEl: HTMLElement, formEl: HTMLElement, y: Year, unitId: string, list: Material[]) => {
    const drawList = () => {
      listEl.innerHTML = list.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th class="left">Material</th><th>Type</th><th>Who sees it</th><th></th></tr></thead>
        <tbody>${list.map((m) => `<tr data-mid="${m.id}">
          <td class="left"><a href="${esc(m.kind === 'youtube' ? `https://youtu.be/${m.url}` : m.page ? `${m.url}#page=${m.page}` : m.url)}" target="_blank" rel="noopener"><b>${esc(m.title)}</b></a>${m.description ? `<div class="muted small">${esc(m.description)}</div>` : ''}</td>
          <td class="small">${esc(materialKindLabel(m))}${m.page ? `, page ${m.page}` : ''}${m.size ? `, ${fmtSize(m.size)}` : ''}</td>
          <td><select data-aud aria-label="Who sees ${esc(m.title)}"><option value="learners" ${m.audience === 'learners' && m.published ? 'selected' : ''}>Learners</option><option value="teachers" ${m.audience === 'teachers' ? 'selected' : ''}>Teachers only</option><option value="hidden" ${m.audience === 'learners' && !m.published ? 'selected' : ''}>Hidden (draft)</option></select></td>
          <td><button class="btn btn-sm btn-danger" data-mdel type="button">Remove</button></td></tr>`).join('')}</tbody></table></div>`
        : '<p class="muted">No materials yet.</p>';
    };
    const fileOptions = materials.filter((m) => m.year === y && m.kind === 'file' && /\.pdf$/i.test(m.fileName ?? ''));
    formEl.innerHTML = `
      <div class="row" style="margin-top:12px">
        <label class="btn btn-primary"><input type="file" data-upl multiple hidden accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.mp4,.webm,image/*" />Upload files</label>
        <button class="btn" data-addform="youtube" type="button">+ YouTube video</button>
        <button class="btn" data-addform="link" type="button">+ Website link</button>
        ${unitId ? `<button class="btn" data-addform="section" type="button" ${fileOptions.length ? '' : 'disabled title="Upload a PDF book under the year resources first"'}>+ Section of a book</button>` : ''}
        <label class="switch" style="margin-left:auto"><input type="checkbox" data-teachonly /> New uploads are for teachers only</label>
      </div>
      <div data-subform></div><div data-upstatus class="small"></div>
      <p class="muted small" style="margin:6px 0 0">Notes and slides up to 40 MB, videos (MP4) up to 95 MB, images up to 5 MB. Teacher versions of manuals: tick "teachers only" before uploading.</p>`;
    drawList();
    const sub = formEl.querySelector('[data-subform]') as HTMLElement;
    const status = formEl.querySelector('[data-upstatus]') as HTMLElement;
    const nextOrder = () => (list.reduce((m, x) => Math.max(m, x.order), 0) || 0) + 1;
    const add = async (m: Omit<Material, 'id'>) => {
      const id = await saveMaterial(m);
      const full = { ...m, id };
      list.push(full); materials.push(full);
      drawList();
    };

    formEl.addEventListener('change', async (e) => {
      const inp = e.target as HTMLInputElement;
      if (inp.dataset.upl === undefined || !inp.files?.length) return;
      const files = [...inp.files];
      inp.value = '';
      const teachersOnly = (formEl.querySelector('[data-teachonly]') as HTMLInputElement).checked;
      for (const f of files) {
        status.textContent = `Uploading ${f.name}...`;
        try {
          const up = await uploadMaterialFile(f, (p) => { status.textContent = `Uploading ${f.name}: ${Math.round(p * 100)}%`; });
          await add({
            unitId, year: y, title: baseName(f.name), description: '', kind: up.mime.startsWith('video/') ? 'video' : 'file',
            url: up.url, fileName: f.name, mime: up.mime, size: up.size, audience: teachersOnly ? 'teachers' : 'learners',
            published: true, order: nextOrder(), createdAt: Date.now(),
          });
          status.innerHTML = `<span class="mark-ok">Added ${esc(f.name)}.</span>`;
        } catch (ex) {
          status.innerHTML = `<span class="mark-bad">${esc(f.name)}: ${esc((ex as Error).message)}</span>`;
        }
      }
    });
    listEl.addEventListener('change', async (e) => {
      const sel = e.target as HTMLSelectElement;
      if (sel.dataset.aud === undefined) return;
      const m = list.find((x) => x.id === sel.closest<HTMLElement>('[data-mid]')!.dataset.mid)!;
      m.audience = sel.value === 'teachers' ? 'teachers' : 'learners';
      m.published = sel.value !== 'hidden';
      await saveMaterial(m);
      toast('Saved.');
    });
    listEl.addEventListener('click', async (e) => {
      const b = (e.target as HTMLElement).closest('[data-mdel]');
      if (!b) return;
      const id = b.closest<HTMLElement>('[data-mid]')!.dataset.mid!;
      const m = list.find((x) => x.id === id)!;
      if (!(await confirmDialog(`Remove "${m.title}"? Learners will no longer see it.`, 'Remove', true))) return;
      await deleteMaterial(id);
      list.splice(list.indexOf(m), 1);
      materials = materials.filter((x) => x.id !== id);
      drawList();
    });
    formEl.addEventListener('click', async (e) => {
      const t = e.target as HTMLElement;
      const kind = t.closest<HTMLElement>('[data-addform]')?.dataset.addform;
      if (kind) {
        sub.innerHTML = `<div class="card" style="margin-top:10px">
          <label class="field"><span>Title</span><input data-ft placeholder="${kind === 'section' ? 'e.g. Learner book: Section 3' : ''}" /></label>
          ${kind === 'youtube' ? '<label class="field"><span>YouTube link</span><input data-fu placeholder="https://youtu.be/..." /></label>' : ''}
          ${kind === 'link' ? '<label class="field"><span>Web address</span><input data-fu placeholder="https://..." /></label>' : ''}
          ${kind === 'section' ? `<div class="grid-2"><label class="field"><span>Book</span><select data-fb>${fileOptions.map((f) => `<option value="${f.id}">${esc(f.title)}${f.audience === 'teachers' ? ' (teachers only)' : ''}</option>`).join('')}</select></label>
            <label class="field"><span>Open at page (of the PDF)</span><input data-fp type="number" min="1" /></label></div>` : ''}
          <label class="field"><span>Short description (optional)</span><input data-fd /></label>
          <div class="row"><button class="btn btn-primary" data-fsave="${kind}" type="button">Add</button><button class="btn" data-fcancel type="button">Cancel</button><span data-ferr class="mark-bad small"></span></div></div>`;
        return;
      }
      if (t.closest('[data-fcancel]')) { sub.innerHTML = ''; return; }
      const saveBtn = t.closest<HTMLButtonElement>('[data-fsave]');
      const save = saveBtn?.dataset.fsave;
      if (!saveBtn || !save) return;
      const card = saveBtn.closest('.card');
      const v = (sel: string) => ((sub.querySelector(sel) as HTMLInputElement | null)?.value ?? '').trim();
      const err = (m: string) => { (sub.querySelector('[data-ferr]') as HTMLElement).textContent = m; };
      const teachersOnly = (formEl.querySelector('[data-teachonly]') as HTMLInputElement).checked;
      const base = { unitId, year: y, description: v('[data-fd]'), audience: teachersOnly ? 'teachers' as const : 'learners' as const, published: true, order: nextOrder(), createdAt: Date.now() };
      saveBtn.disabled = true;
      try {
      if (save === 'youtube') {
        const id = youtubeId(v('[data-fu]'));
        if (!id) return err('That does not look like a YouTube link.');
        await add({ ...base, title: v('[data-ft]') || 'Video', kind: 'youtube', url: id });
      } else if (save === 'link') {
        const u = v('[data-fu]');
        if (!/^https?:\/\//.test(u)) return err('The address must start with https://');
        await add({ ...base, title: v('[data-ft]') || u, kind: 'link', url: u });
      } else if (save === 'section') {
        const book = materials.find((m) => m.id === v('[data-fb]'));
        const page = Math.round(Number(v('[data-fp]')));
        if (!book) return err('Choose a book.');
        if (!(page >= 1)) return err('Enter the page number to open at.');
        await add({ ...base, title: v('[data-ft]') || `${book.title}, page ${page}`, kind: 'file', url: book.url, fileName: book.fileName, mime: book.mime, page, audience: book.audience });
      }
      } catch (ex) {
        console.error(ex);
        return err('Could not save. Check the connection and the Firebase rules.');
      } finally {
        saveBtn.disabled = false;
      }
      if (card && sub.contains(card)) sub.innerHTML = '';
      toast('Material added.');
    });
  };

  /* ---------------- One unit ---------------- */
  const renderUnit = (u: Unit) => {
    host.onclick = null;
    const ls = lessons.filter((x) => x.unitId === u.id);
    host.innerHTML = `
      <button class="btn btn-sm" data-back type="button">← All STEM ${u.year} units</button>
      <div class="page-head" style="margin-top:12px"><h2 style="margin:0">${esc(u.code)}: ${esc(u.subStrand)}</h2><a class="btn btn-sm" href="/learn/${u.id}">View as learner</a></div>
      <div class="card">
        <form data-uform class="stack" novalidate>
          <label class="field"><span>Title</span><input name="title" value="${esc(u.title)}" /></label>
          <label class="field"><span>Summary (what this unit is about)</span><textarea name="summary" rows="3">${esc(u.summary)}</textarea></label>
          <label class="field"><span>"By the end you will be able to" (one per line)</span><textarea name="indicators" rows="5">${esc(u.indicators.join('\n'))}</textarea></label>
          <label class="field"><span>NaCCA learning outcomes (one per line)</span><textarea name="outcomes" rows="3">${esc(u.outcomes.join('\n'))}</textarea></label>
          <div class="grid-2">
            <label class="field"><span>Ministry book section number (optional)</span><input name="section" type="number" min="1" value="${u.section ?? ''}" /></label>
            <fieldset class="field" style="border:0;padding:0;margin:0"><legend style="font-weight:600">Linked WASSCE practice topics</legend>
              <div class="row">${topics.map((t) => `<label class="switch" style="min-height:40px"><input type="checkbox" name="wt" value="${t.id}" ${u.wassceTopics.includes(t.id) ? 'checked' : ''} /> ${t.id}</label>`).join('')}</div></fieldset>
          </div>
          <label class="switch"><input type="checkbox" name="published" ${u.published ? 'checked' : ''} /> Published (STEM ${u.year} learners can see this unit)</label>
          <div class="row"><button class="btn btn-primary" type="submit">Save unit</button><span data-saved class="small"></span></div>
        </form>
      </div>
      <section class="card"><h3>Materials</h3><div data-matlist></div><div data-matform></div></section>
      <section class="card"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Lessons in this unit</h3><button class="btn btn-primary" data-newlesson type="button">+ Write a lesson for this unit</button></div>
        ${ls.length ? `<ul class="key-ideas" style="margin-top:10px">${ls.map((x) => `<li><a href="/lessons/${x.id}">${esc(x.title)}</a>${x.published ? '' : ' <span class="pill">Draft</span>'}</li>`).join('')}</ul>` : '<p class="muted" style="margin-top:10px">No lessons yet.</p>'}
        <p class="muted small" style="margin:6px 0 0">Edit lessons under <b>Lessons</b>.</p></section>`;
    mountMaterials(host.querySelector('[data-matlist]') as HTMLElement, host.querySelector('[data-matform]') as HTMLElement, u.year, u.id,
      materials.filter((m) => m.unitId === u.id));
    const form = host.querySelector('[data-uform]') as HTMLFormElement;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const next: Unit = {
        ...u, title: String(fd.get('title') ?? '').trim() || u.title, summary: String(fd.get('summary') ?? '').trim(),
        indicators: lines(String(fd.get('indicators') ?? '')), outcomes: lines(String(fd.get('outcomes') ?? '')),
        section: Number(fd.get('section')) || null, wassceTopics: fd.getAll('wt').map(Number), published: fd.get('published') === 'on',
      };
      try {
        await saveUnit(next);
        Object.assign(u, next);
        (host.querySelector('[data-saved]') as HTMLElement).innerHTML = '<span class="mark-ok">Saved ✓</span>';
      } catch {
        (host.querySelector('[data-saved]') as HTMLElement).innerHTML = '<span class="mark-bad">Could not save. Check the connection and the Firebase rules.</span>';
      }
    });
    host.onclick = async (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-back]')) { year = u.year; await load(); return renderList(); }
      if (t.closest('[data-newlesson]')) {
        try { sessionStorage.setItem(NEW_LESSON_KEY, u.id); } catch { /* ignore */ }
        openLessons();
      }
    };
  };

  try {
    await load();
  } catch (ex) {
    console.error(ex);
    host.innerHTML = feedbackHTML('bad', 'Could not load the curriculum.', '<p>Check your internet connection, and that the latest security rules are published in Firebase.</p>');
    return;
  }
  renderList();
}
