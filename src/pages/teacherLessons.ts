import topicsData from '../data/topics.json';
import type { Topic } from '../types';
import { esc, fmtDate } from '../lib/dom';
import { confirmDialog, feedbackHTML, toast } from '../lib/ui';
import { storage } from '../storage';
import { ACTIVITIES } from '../activities';
import { listLearners, type LearnerInfo } from '../firebase/assignments';
import { listClasses, type SchoolClass } from '../firebase/classes';
import { legacyClassFields, audienceOf } from '../lib/audience';
import { audiencePickerHTML, readAudience, wireAudiencePicker } from './audiencePicker';
import { audienceCell, filterBarHTML, matchesFilter, peopleFor, wireFilter } from './teacherShared';
import { listMaterials, listUnits, saveMaterial, type Unit } from '../firebase/units';
import { READY_LESSONS } from '../data/ready';
import { mountReadyPicker } from './readyPicker';
import { NEW_LESSON_KEY } from './teacherCurriculum';
import { deleteLesson, listLessons, saveLesson, uploadLessonImage, youtubeId, type Block, type Lesson } from '../firebase/lessons';

const topics = topicsData as Topic[];
const LETTERS = ['A', 'B', 'C', 'D'];
const BLOCK_NAMES: Record<Block['type'], string> = {
  text: 'Text', image: 'Image', video: 'YouTube video', activity: 'Activity', check: 'Quick check', link: 'Link',
};

/** Teacher dashboard: Lessons section. */
export async function mountTeacherLessons(host: HTMLElement) {
  host.innerHTML = '<div class="skel"><span class="tall"></span><span></span><span></span></div>';
  let lessons: Lesson[] = [];
  let learners: LearnerInfo[] = [];
  let classes: SchoolClass[] = [];
  let units: Unit[] = [];
  let finished = new Map<string, Set<string>>();
  const load = async () => {
    const [ls, lr, attempts, us, cl] = await Promise.all([listLessons(), listLearners(), storage.getAttempts({ kind: 'lesson' }), listUnits().catch(() => [] as Unit[]), listClasses().catch(() => [] as SchoolClass[])]);
    classes = cl;
    lessons = ls; learners = lr; units = us.sort((a, b) => a.year - b.year || a.order - b.order);
    finished = new Map();
    for (const a of attempts) {
      const id = a.itemId.replace(/^lesson:/, '');
      if (!finished.has(id)) finished.set(id, new Set());
      finished.get(id)!.add(a.learnerId);
    }
  };
  const audience = (l: Lesson) => peopleFor(l, learners).filter((x) => !l.year || !x.year || x.year === l.year).length;
  const topicLabel = (id: number) => (id ? `${id}. ${topics.find((t) => t.id === id)?.short ?? ''}` : 'General');

  const unitLabel = (l: Lesson) => { const u = units.find((x) => x.id === l.unitId); return u ? `STEM ${u.year}, ${u.code}` : l.year ? `STEM ${l.year}` : 'Any year'; };

  /* ---------------- List ---------------- */
  const renderList = () => {
    host.onclick = null;
    host.innerHTML = `
      <div class="row" style="justify-content:space-between;margin-bottom:12px">
        <h2 style="margin:0">Lessons</h2><div class="row"><button class="btn" data-ready type="button">+ Add ready-made lesson</button><button class="btn btn-primary" data-new type="button">+ New lesson</button></div></div>
      <div data-readybox></div>
      ${lessons.length ? filterBarHTML(classes, { shown: lessons.filter((l) => matchesFilter(l, classes)).length, total: lessons.length }) : ''}
      ${lessons.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th class="left">Lesson</th><th>Unit</th><th>Topic</th><th>For</th><th>Finished</th><th></th></tr></thead>
        <tbody>${lessons.filter((l) => matchesFilter(l, classes)).map((l) => `<tr>
          <td class="left"><b>${esc(l.title)}</b>${l.published ? '' : ' <span class="pill">Draft</span>'}<div class="muted small">${l.blocks.length} block${l.blocks.length === 1 ? '' : 's'}, updated ${fmtDate(l.updatedAt)}</div></td>
          <td>${esc(unitLabel(l))}</td>
          <td>${esc(topicLabel(l.topicId))}</td>
          <td>${audienceCell(l, classes)}</td>
          <td>${finished.get(l.id)?.size ?? 0} / ${audience(l)}</td>
          <td><div class="row" style="flex-wrap:nowrap;justify-content:center">
            <a class="btn btn-sm" href="/lessons/${l.id}">View</a>
            <button class="btn btn-sm btn-primary" data-edit="${l.id}" type="button">Edit</button></div></td></tr>`).join('')}</tbody></table></div>`
        : '<div class="card"><p style="margin:0">No lessons yet. Tap <b>New lesson</b> to write your first one: text, pictures, a video, an activity and a quick check.</p></div>'}`;
    wireFilter(host, renderList);
    host.onclick = async (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-new]')) return renderEditor();
      if (t.closest('[data-ready]')) {
        const box = host.querySelector('[data-readybox]') as HTMLElement;
        mountReadyPicker(box, 'Ready-made lessons', READY_LESSONS.map((r) => ({
          key: r.key, title: r.title, year: r.year, unitId: r.unitId, added: lessons.some((x) => x.title === r.title), when: r.summary,
        })));
        return;
      }
      const rk = t.closest<HTMLElement>('[data-addready]')?.dataset.addready;
      if (rk) {
        const r = READY_LESSONS.find((x) => x.key === rk)!;
        (t.closest('[data-addready]') as HTMLButtonElement).disabled = true;
        try {
          const id = await saveLesson({ title: r.title, summary: r.summary, topicId: r.topicId, year: r.year, unitId: r.unitId, classIds: [], ...legacyClassFields([], classes), blocks: r.blocks, published: false });
          const existing = await listMaterials(true).catch(() => []);
          let order = existing.filter((m) => m.unitId === r.unitId).reduce((n, m) => Math.max(n, m.order), 0);
          for (const m of r.materials) {
            if (existing.some((x) => x.unitId === m.unitId && x.title === m.title)) continue;
            await saveMaterial({ ...m, order: ++order, createdAt: Date.now() });
          }
          toast('Lesson added as a draft. Check it, then switch on Published.');
          await load();
          renderEditor(lessons.find((x) => x.id === id));
        } catch (ex) {
          console.error(ex);
          toast('Could not add the lesson. Check your connection and that the latest rules are published.');
          renderList();
        }
        return;
      }
      const ed = t.closest<HTMLElement>('[data-edit]')?.dataset.edit;
      if (ed) renderEditor(lessons.find((x) => x.id === ed));
    };
  };

  /* ---------------- Editor ---------------- */
  const renderEditor = (lesson?: Lesson) => {
    host.onclick = null;
    let blocks: Block[] = lesson ? JSON.parse(JSON.stringify(lesson.blocks)) : [{ type: 'text', md: '' }];
    let preUnit = '';
    if (!lesson) { try { preUnit = sessionStorage.getItem(NEW_LESSON_KEY) ?? ''; sessionStorage.removeItem(NEW_LESSON_KEY); } catch { /* ignore */ } }
    const curUnit = lesson?.unitId ?? preUnit;
    const curYear = lesson?.year ?? units.find((u) => u.id === curUnit)?.year ?? 0;

    host.innerHTML = `
      <div class="card">
        <h2>${lesson ? 'Edit lesson' : 'New lesson'}</h2>
        <form data-form class="stack" novalidate>
          <label class="field"><span>Title</span><input name="title" maxlength="120" value="${esc(lesson?.title ?? '')}" placeholder="e.g. How a PID controller stops a robot on the line" /></label>
          <label class="field"><span>One-line summary (shown on the lesson card)</span><input name="summary" maxlength="200" value="${esc(lesson?.summary ?? '')}" /></label>
          <div class="grid-2">
            <label class="field"><span>Year</span><select name="year">
              ${[0, 1, 2, 3].map((y) => `<option value="${y}" ${curYear === y ? 'selected' : ''}>${y ? `STEM ${y}` : 'Every year'}</option>`).join('')}</select></label>
            <label class="field"><span>Curriculum unit</span><select name="unit">
              <option value="">No unit</option>
              ${units.map((u) => `<option value="${u.id}" data-y="${u.year}" ${curUnit === u.id ? 'selected' : ''}>STEM ${u.year}, ${esc(u.code)} ${esc(u.title)}</option>`).join('')}</select></label>
            <label class="field"><span>WASSCE practice topic</span><select name="topic">
              <option value="0">General (no topic)</option>
              ${topics.map((t) => `<option value="${t.id}" ${lesson?.topicId === t.id ? 'selected' : ''}>${t.id}. ${esc(t.short)}</option>`).join('')}</select></label>
          </div>
          ${audiencePickerHTML(lesson ? audienceOf(lesson) : [], classes)}
          <label class="switch"><input type="checkbox" name="published" ${lesson?.published ? 'checked' : ''} /> Published (learners can see it; leave off while you write)</label>
        </form>
      </div>
      <div class="card">
        <h2>Lesson content</h2>
        <p class="muted small" style="margin-top:-6px">Build the lesson from blocks, top to bottom. Text formatting: <code># Heading</code>, <code>**bold**</code>, <code>*italic*</code>, <code>- bullet</code>, <code>1. numbered</code>, <code>[link text](https://...)</code>, and code between two lines of <code>\`\`\`</code>.</p>
        <div data-blocks></div>
        <div class="row" style="margin-top:12px">
          ${(Object.keys(BLOCK_NAMES) as Block['type'][]).map((k) => `<button class="btn" data-add="${k}" type="button">+ ${BLOCK_NAMES[k]}</button>`).join('')}
        </div>
      </div>
      <div data-err></div>
      <div class="row">
        <button class="btn btn-primary btn-big" data-save type="button">Save lesson</button>
        <button class="btn" data-cancel type="button">Cancel</button>
        ${lesson ? '<span class="spacer"></span><button class="btn btn-danger" data-delete type="button">Delete lesson</button>' : ''}
      </div>`;

    const form = host.querySelector('[data-form]') as HTMLFormElement;
    const blocksHost = host.querySelector('[data-blocks]') as HTMLElement;
    form.querySelector('select[name=unit]')!.addEventListener('change', (e) => {
      const y = (e.target as HTMLSelectElement).selectedOptions[0]?.dataset.y;
      if (y) (form.querySelector('select[name=year]') as HTMLSelectElement).value = y;
    });
    wireAudiencePicker(form, classes);

    const activityOptions = (sel?: string) => topics.map((t) => `<optgroup label="${t.id}. ${esc(t.short)}">${t.activities.map((a) =>
      `<option value="${t.id}|${esc(a)}" ${sel === `${t.id}|${a}` ? 'selected' : ''}>${esc(ACTIVITIES[a]?.title ?? a)}</option>`).join('')}</optgroup>`).join('');

    const blockEditor = (b: Block, i: number): string => {
      const head = `<h4><span>${i + 1}. ${BLOCK_NAMES[b.type]}</span><span class="row" style="gap:4px">
        <button class="btn btn-sm" data-up type="button" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
        <button class="btn btn-sm" data-down type="button" ${i === blocks.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
        <button class="btn btn-sm btn-danger" data-del type="button">Remove</button></span></h4>`;
      let inner = '';
      switch (b.type) {
        case 'text':
          inner = `<label class="field"><span class="sr-only">Text</span><textarea data-f="md" rows="7" placeholder="Write the lesson text here.">${esc(b.md)}</textarea></label>`;
          break;
        case 'image':
          inner = `${b.url ? `<img src="${esc(b.url)}" alt="" style="max-width:100%;max-height:260px;border:1.5px solid var(--ink);border-radius:6px" />` : '<p class="muted" style="margin:0 0 8px">No image yet.</p>'}
            <div class="row" style="margin:8px 0"><label class="btn"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-img hidden />${b.url ? 'Replace image' : 'Choose image'}</label><span data-imgstatus class="muted small"></span></div>
            <div class="grid-2"><label class="field" style="margin:0"><span>Caption (optional)</span><input data-f="caption" value="${esc(b.caption ?? '')}" /></label>
            <label class="field" style="margin:0"><span>Description for screen readers</span><input data-f="alt" value="${esc(b.alt ?? '')}" placeholder="e.g. Diagram of an XOR gate" /></label></div>`;
          break;
        case 'video':
          inner = `<div class="grid-2"><label class="field" style="margin:0"><span>YouTube link</span><input data-f="yt" value="${b.youtubeId ? `https://youtu.be/${esc(b.youtubeId)}` : ''}" placeholder="https://youtu.be/..." /></label>
            <label class="field" style="margin:0"><span>Caption (optional)</span><input data-f="caption" value="${esc(b.caption ?? '')}" /></label></div>
            <p class="small ${b.youtubeId ? 'mark-ok' : 'muted'}" data-ytstatus style="margin:6px 0 0">${b.youtubeId ? 'Video found.' : 'Paste a YouTube link.'} Learners tap to play, so it only uses data when they choose.</p>`;
          break;
        case 'activity':
          inner = `<label class="field" style="margin:0"><span>Activity</span><select data-f="activity">${activityOptions(`${b.topicId}|${b.activityId}`)}</select></label>`;
          break;
        case 'check':
          inner = `<label class="field"><span>Question</span><input data-f="question" value="${esc(b.question)}" /></label>
            ${b.options.map((o, k) => `<div class="row" style="margin-bottom:6px;flex-wrap:nowrap">
              <label class="switch" style="min-width:64px"><input type="radio" name="c${i}" data-correct="${k}" ${b.correct === k ? 'checked' : ''} /> ${LETTERS[k]}</label>
              <input data-opt="${k}" value="${esc(o)}" placeholder="Option ${LETTERS[k]}" /></div>`).join('')}
            <p class="muted small" style="margin:0 0 8px">Tick the correct option.</p>
            <label class="field" style="margin:0"><span>Explanation (shown after answering)</span><input data-f="explanation" value="${esc(b.explanation ?? '')}" /></label>`;
          break;
        case 'link':
          inner = `<div class="grid-2"><label class="field" style="margin:0"><span>Button text</span><input data-f="label" value="${esc(b.label)}" /></label>
            <label class="field" style="margin:0"><span>Web address</span><input data-f="url" value="${esc(b.url)}" placeholder="https://..." /></label></div>`;
          break;
      }
      return `<div class="calc-step" data-i="${i}">${head}${inner}</div>`;
    };
    const draw = () => { blocksHost.innerHTML = blocks.length ? blocks.map(blockEditor).join('') : '<p class="muted">No content yet. Add a block below.</p>'; };
    draw();

    blocksHost.addEventListener('input', (e) => {
      const t = e.target as HTMLInputElement;
      const card = t.closest<HTMLElement>('[data-i]');
      if (!card) return;
      const b = blocks[Number(card.dataset.i)] as Record<string, unknown> & Block;
      const f = t.dataset.f;
      if (t.dataset.opt !== undefined && b.type === 'check') b.options[Number(t.dataset.opt)] = t.value;
      else if (f === 'yt' && b.type === 'video') {
        b.youtubeId = youtubeId(t.value) ?? '';
        const st = card.querySelector('[data-ytstatus]') as HTMLElement;
        st.className = `small ${b.youtubeId ? 'mark-ok' : 'mark-bad'}`;
        st.textContent = b.youtubeId ? 'Video found. Learners tap to play, so it only uses data when they choose.' : 'That does not look like a YouTube link.';
      } else if (f && f !== 'activity') (b as Record<string, unknown>)[f] = t.value;
    });
    blocksHost.addEventListener('change', async (e) => {
      const t = e.target as HTMLInputElement;
      const card = t.closest<HTMLElement>('[data-i]');
      if (!card) return;
      const i = Number(card.dataset.i);
      const b = blocks[i];
      if (t.dataset.correct !== undefined && b.type === 'check') b.correct = Number(t.dataset.correct);
      if (t.dataset.f === 'activity' && b.type === 'activity') {
        const [tid, aid] = (t as unknown as HTMLSelectElement).value.split('|');
        b.topicId = Number(tid); b.activityId = aid;
      }
      if (t.dataset.img !== undefined && b.type === 'image' && t.files?.[0]) {
        const st = card.querySelector('[data-imgstatus]') as HTMLElement;
        st.textContent = 'Uploading...';
        try {
          b.url = await uploadLessonImage(t.files[0]);
          draw();
        } catch (ex) {
          st.textContent = (ex as Error).message;
          st.className = 'mark-bad small';
        }
      }
    });

    host.onclick = async (e) => {
      const t = e.target as HTMLElement;
      const add = t.closest<HTMLElement>('[data-add]')?.dataset.add as Block['type'] | undefined;
      if (add) {
        const first = topics[0];
        const fresh: Record<Block['type'], Block> = {
          text: { type: 'text', md: '' },
          image: { type: 'image', url: '', caption: '', alt: '' },
          video: { type: 'video', youtubeId: '', caption: '' },
          activity: { type: 'activity', topicId: first.id, activityId: first.activities[0] },
          check: { type: 'check', question: '', options: ['', '', '', ''], correct: -1, explanation: '' },
          link: { type: 'link', label: '', url: '' },
        };
        blocks.push(fresh[add]);
        draw();
        blocksHost.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      const card = t.closest<HTMLElement>('[data-i]');
      if (card) {
        const i = Number(card.dataset.i);
        if (t.closest('[data-del]')) { blocks.splice(i, 1); draw(); }
        if (t.closest('[data-up]') && i > 0) { [blocks[i - 1], blocks[i]] = [blocks[i], blocks[i - 1]]; draw(); }
        if (t.closest('[data-down]') && i < blocks.length - 1) { [blocks[i + 1], blocks[i]] = [blocks[i], blocks[i + 1]]; draw(); }
        return;
      }
      if (t.closest('[data-cancel]')) return renderList();
      if (t.closest('[data-delete]') && lesson) {
        if (!(await confirmDialog(`Delete the lesson "${lesson.title}"?`, 'Delete', true))) return;
        await deleteLesson(lesson.id); await load(); return renderList();
      }
      if (t.closest('[data-save]')) {
        const fd = new FormData(form);
        const err = (m: string) => { (host.querySelector('[data-err]') as HTMLElement).innerHTML = feedbackHTML('bad', m); };
        const title = String(fd.get('title') ?? '').trim();
        const aud = readAudience(form, classes);
        if (!title) return err('Give the lesson a title.');
        // Drop empty blocks; check the rest.
        blocks = blocks.filter((b) => !(b.type === 'text' && !b.md.trim()) && !(b.type === 'image' && !b.url));
        for (const [i, b] of blocks.entries()) {
          if (b.type === 'video' && !b.youtubeId) return err(`Block ${i + 1}: paste a YouTube link, or remove the block.`);
          if (b.type === 'link' && !/^(https?:\/\/|\/)/.test(b.url)) return err(`Block ${i + 1}: the link must start with https:// (or / for a page on this site)`);
          if (b.type === 'check') {
            b.options = b.options.map((o) => o.trim());
            if (!b.question.trim()) return err(`Block ${i + 1}: the quick check needs a question.`);
            if (b.options.filter(Boolean).length < 2) return err(`Block ${i + 1}: give at least two options.`);
            if (b.correct < 0 || !b.options[b.correct]) return err(`Block ${i + 1}: tick the correct option.`);
          }
        }
        if (!blocks.length) { draw(); return err('Add some content: at least one block.'); }
        const btn = t.closest('[data-save]') as HTMLButtonElement;
        btn.disabled = true;
        try {
          await saveLesson({
            id: lesson?.id, createdAt: lesson?.createdAt, title, summary: String(fd.get('summary') ?? '').trim(),
            topicId: Number(fd.get('topic')) || 0, year: Number(fd.get('year')) || 0, unitId: String(fd.get('unit') ?? ''), classIds: aud, ...legacyClassFields(aud, classes), blocks,
            published: fd.get('published') === 'on',
          });
          toast('Lesson saved.');
          await load();
          renderList();
        } catch (ex) {
          console.error(ex);
          btn.disabled = false;
          err('Could not save. Check your internet connection, and that the latest rules are published in Firebase.');
        }
      }
    };
  };

  try {
    await load();
  } catch (ex) {
    console.error(ex);
    host.innerHTML = feedbackHTML('bad', 'Could not load lessons.', '<p>Check your internet connection, and that the latest security rules are published in Firebase.</p>');
    return;
  }
  let fromUnit = false;
  try { fromUnit = !!sessionStorage.getItem(NEW_LESSON_KEY); } catch { /* ignore */ }
  if (fromUnit) renderEditor(); else renderList();
}
