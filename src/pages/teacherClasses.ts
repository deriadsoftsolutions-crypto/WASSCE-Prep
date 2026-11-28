/**
 * Teacher page, Classes: the school's fixed classes (each in a STEM year), the learners in each,
 * and older accounts whose typed class needs matching to a fixed class.
 */
import { esc } from '../lib/dom';
import { confirmDialog, toast } from '../lib/ui';
import { avatarHTML } from '../lib/avatar';
import { listLearners, type LearnerInfo } from '../firebase/assignments';
import { addClass, listClasses, moveLearner, setRetired, unmatched, updateClass, type SchoolClass } from '../firebase/classes';

const yearSelect = (name: string, value: number) =>
  `<select name="${name}">${[1, 2, 3].map((y) => `<option value="${y}" ${y === value ? 'selected' : ''}>STEM ${y}</option>`).join('')}</select>`;

const classSelect = (classes: SchoolClass[], selected = '', attrs = '') =>
  `<select ${attrs}><option value="">Choose a class</option>${[1, 2, 3].map((y) => {
    const inY = classes.filter((c) => c.year === y && !c.retired);
    return inY.length ? `<optgroup label="STEM ${y}">${inY.map((c) => `<option value="${esc(c.id)}" ${c.id === selected ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</optgroup>` : '';
  }).join('')}</select>`;

export async function mountTeacherClasses(host: HTMLElement, onChange: () => void = () => undefined) {
  host.innerHTML = '<p class="muted">Loading classes...</p>';
  let classes: SchoolClass[] = [];
  let learners: LearnerInfo[] = [];
  let editing = '';
  const load = async () => { [classes, learners] = await Promise.all([listClasses(true), listLearners()]); };
  try { await load(); } catch {
    host.innerHTML = '<p class="mark-bad">Could not load classes. Check your internet connection.</p>';
    return;
  }

  const render = () => {
    const todo = unmatched(learners, classes);
    const members = (c: SchoolClass) => learners.filter((l) => l.classId === c.id);
    host.innerHTML = `
      <div class="page-head"><h2 style="margin:0">Classes</h2><span class="muted">${classes.filter((c) => !c.retired).length} class${classes.filter((c) => !c.retired).length === 1 ? '' : 'es'} · ${learners.length} learner${learners.length === 1 ? '' : 's'}</span></div>
      <p class="muted" style="margin-top:-6px">Learners choose their class from this list when they sign up, and their STEM year comes from the class.
        Lessons, tests and assignments are set for classes. At the start of a new school year, rename a class and change its year (for example 2 Sci A in STEM 2 becomes 3 Sci A in STEM 3): its learners move with it and still sign in as before.</p>

      ${todo.length ? `<section class="card" data-todo>
        <h3 style="margin-top:0">Learners to place in a class <span class="pill" style="background:var(--bad-soft);color:var(--bad)">${todo.length}</span></h3>
        <p class="muted small" style="margin-top:-6px">These learners signed up before classes were fixed, so they typed their class. Choose the right class for each. They keep their name and PIN, and from now on sign in by choosing that class.</p>
        ${classes.some((c) => !c.retired) ? `${todo.some((x) => x.guess) ? `<button class="btn btn-primary btn-sm" data-placeall type="button">Place all ${todo.filter((x) => x.guess).length} with a suggestion</button>` : ''}
        <table class="data" style="margin-top:10px"><thead><tr><th>Learner</th><th>Typed class</th><th>Put in</th><th></th></tr></thead><tbody>
          ${todo.map(({ l, guess }) => `<tr data-lid="${esc(l.id)}"><td><span class="row" style="gap:8px;flex-wrap:nowrap">${avatarHTML(l.name, null, 28)}<b>${esc(l.name)}</b></span></td>
            <td>${esc(l.className || '-')}${l.year ? ` <span class="muted small">STEM ${l.year}</span>` : ''}</td>
            <td>${classSelect(classes, guess?.id ?? '', 'data-target aria-label="Class"')}</td>
            <td><button class="btn btn-sm" data-place type="button">Place</button></td></tr>`).join('')}
        </tbody></table>` : '<p style="margin:0"><b>Add your classes below first.</b></p>'}
      </section>` : ''}

      <section class="card">
        <h3 style="margin-top:0">Add classes</h3>
        <form data-add class="grid-2" style="align-items:end">
          <label class="field" style="margin:0"><span>Class names, one per line</span><textarea name="names" rows="3" placeholder="2 Sci A&#10;2 Sci B&#10;2 Gen Arts" required></textarea></label>
          <div><label class="field"><span>STEM year</span>${yearSelect('year', 1)}</label>
            <button class="btn btn-primary" type="submit">Add</button></div>
        </form>
        <div data-adderr></div>
      </section>

      ${[1, 2, 3].map((y) => {
        const inY = classes.filter((c) => c.year === y);
        if (!inY.length) return '';
        return `<h3 style="margin:20px 0 8px">STEM ${y}</h3>
          <div class="class-list">${inY.map((c) => {
            const m = members(c);
            if (editing === c.id) {
              return `<form class="card class-card" data-edit="${esc(c.id)}">
                <div class="grid-2" style="align-items:end">
                  <label class="field" style="margin:0"><span>Class name</span><input name="name" value="${esc(c.name)}" required maxlength="30" /></label>
                  <label class="field" style="margin:0"><span>STEM year</span>${yearSelect('year', c.year)}</label>
                </div>
                <p class="muted small">The ${m.length} learner${m.length === 1 ? '' : 's'} in this class move with it. Their logins do not change.</p>
                <div class="row"><button class="btn btn-primary btn-sm" type="submit">Save</button><button class="btn btn-sm" type="button" data-cancel>Cancel</button></div>
              </form>`;
            }
            return `<div class="card class-card ${c.retired ? 'retired' : ''}" data-cid="${esc(c.id)}">
              <div class="row"><b style="font-size:1.1rem">${esc(c.name)}</b>${c.retired ? '<span class="pill">Old class, hidden from sign-up</span>' : ''}<span class="spacer"></span>
                <span class="muted small">${m.length} learner${m.length === 1 ? '' : 's'}</span>
                <button class="btn btn-sm" data-editc type="button">Rename or change year</button>
                <button class="btn btn-sm" data-retire type="button">${c.retired ? 'Bring back' : 'Retire'}</button></div>
              ${m.length ? `<details style="margin-top:6px"><summary class="small">Learners in ${esc(c.name)}</summary>
                <table class="data" data-nocards style="margin-top:8px"><tbody>${m.map((l) => `<tr data-lid="${esc(l.id)}"><td>${esc(l.name)}</td>
                  <td style="width:1%;white-space:nowrap">${classSelect(classes, '', 'data-target aria-label="Move to"')} <button class="btn btn-sm" data-place type="button">Move</button></td></tr>`).join('')}</tbody></table></details>` : ''}
            </div>`;
          }).join('')}</div>`;
      }).join('')}
      ${classes.length ? '' : '<div class="card"><p style="margin:0">No classes yet. Add your classes above, for example <b>1 Sci A</b> in STEM 1. Until you do, learners type their class when they sign up.</p></div>'}`;
  };
  render();

  const refresh = async () => { await load(); render(); onChange(); };
  const place = async (row: HTMLElement) => {
    const l = learners.find((x) => x.id === row.dataset.lid)!;
    const c = classes.find((x) => x.id === (row.querySelector('[data-target]') as HTMLSelectElement).value);
    if (!c) { toast('Choose a class first.'); return false; }
    await moveLearner(l, c);
    return true;
  };

  host.onclick = async (e) => {
    const t = e.target as HTMLElement;
    const cid = t.closest<HTMLElement>('[data-cid]')?.dataset.cid;
    const c = classes.find((x) => x.id === cid);
    try {
      if (t.closest('[data-place]')) {
        const row = t.closest<HTMLElement>('[data-lid]')!;
        (t as HTMLButtonElement).disabled = true;
        if (await place(row)) { toast('Done.'); await refresh(); } else (t as HTMLButtonElement).disabled = false;
      } else if (t.closest('[data-placeall]')) {
        (t as HTMLButtonElement).disabled = true;
        const rows = [...host.querySelectorAll<HTMLElement>('[data-todo] [data-lid]')].filter((r) => (r.querySelector('[data-target]') as HTMLSelectElement).value);
        for (const r of rows) await place(r);
        toast(`Placed ${rows.length} learner${rows.length === 1 ? '' : 's'}.`);
        await refresh();
      } else if (t.closest('[data-editc]') && c) { editing = c.id; render(); host.querySelector<HTMLInputElement>('[data-edit] input')?.focus(); }
      else if (t.closest('[data-cancel]')) { editing = ''; render(); }
      else if (t.closest('[data-retire]') && c) {
        if (!c.retired && !(await confirmDialog(`Retire ${c.name}? It disappears from the sign-up list. Its learners can still sign in, and nothing is deleted.`, 'Retire'))) return;
        await setRetired(c, !c.retired); await refresh();
      }
    } catch (ex) { toast((ex as Error).message || 'Could not save. Check your internet connection.'); await refresh(); }
  };

  host.onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target as HTMLFormElement;
    const fd = new FormData(f);
    const year = Number(fd.get('year')) as 1 | 2 | 3;
    try {
      if (f.matches('[data-add]')) {
        const names = String(fd.get('names') ?? '').split('\n').map((n) => n.trim()).filter(Boolean);
        const errs: string[] = [];
        for (const n of names) { try { await addClass(n, year); } catch (ex) { errs.push((ex as Error).message); } }
        await refresh();
        if (errs.length) host.querySelector('[data-adderr]')!.innerHTML = errs.map((x) => `<p class="mark-bad small" style="margin:6px 0 0">${esc(x)}</p>`).join('');
        else toast(`Added ${names.length} class${names.length === 1 ? '' : 'es'}.`);
      } else if (f.matches('[data-edit]')) {
        const c = classes.find((x) => x.id === f.dataset.edit)!;
        await updateClass(c, String(fd.get('name') ?? ''), year, learners);
        editing = ''; toast('Saved.'); await refresh();
      }
    } catch (ex) { toast((ex as Error).message || 'Could not save.'); }
  };
}
