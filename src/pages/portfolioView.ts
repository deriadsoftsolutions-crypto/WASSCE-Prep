/** Portfolio sections and item cards, shared by the learner page, the teacher view and the print layout. */
import { esc } from '../lib/dom';
import { icon } from '../lib/icons';
import { SECTIONS, type Built, type PFile, type PItem } from '../lib/portfolioCore';
import { auth } from '../firebase/app';
import { openFile } from '../firebase/assignments';

export const fmtDay = (ts: number) => new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const isImage = (f: PFile) => /^image\//.test(f.type);

export function thumbsHTML(files: PFile[], big = false): string {
  if (!files.length) return '';
  return `<div class="p-thumbs${big ? ' big' : ''}">${files.map((f) => isImage(f)
    ? `<button type="button" class="p-thumb" data-thumb="${esc(f.key)}" data-name="${esc(f.name)}" data-type="${esc(f.type)}" aria-label="Open ${esc(f.name)}"><img alt="${esc(f.name)}" data-src-key="${esc(f.key)}" /></button>`
    : `<button type="button" class="p-thumb p-doc" data-thumb="${esc(f.key)}" data-name="${esc(f.name)}" data-type="${esc(f.type)}">${icon('file', 26)}<span>${esc(f.name)}</span></button>`).join('')}</div>`;
}

export function itemHTML(it: PItem, opts: { editable: boolean; locked: boolean; hiddenList?: boolean }): string {
  const can = opts.editable && !opts.locked;
  const actions = !can ? '' : opts.hiddenList
    ? '<button class="btn btn-sm" data-pshow type="button">Show again</button>'
    : it.auto
      ? `<button class="btn btn-sm" data-pedit type="button">${it.description ? 'Edit note' : 'Add a note'}</button><button class="btn btn-sm" data-phide type="button">Hide</button>`
      : '<button class="btn btn-sm" data-pedit type="button">Edit</button><button class="btn btn-sm btn-danger" data-pdel type="button">Delete</button>';
  return `<article class="p-item" data-pid="${esc(it.id)}">
    <div class="p-head">
      ${it.auto ? `<span data-lock title="Added by the site. The score cannot be changed.">${icon('lock', 18, 'From the site')}</span>` : ''}
      <b class="p-title">${esc(it.title)}</b>
      <span class="muted small">${fmtDay(it.date)}</span>
      ${it.result ? `<span class="pill">${esc(it.result)}</span>` : ''}
    </div>
    ${it.description ? `<p class="p-desc">${esc(it.description)}</p>` : can && !opts.hiddenList ? '<p class="p-desc muted small">No description yet. Say what this is and why it matters.</p>' : ''}
    ${thumbsHTML(it.files)}
    ${actions ? `<div class="row p-actions">${actions}</div>` : ''}
    <div data-slot></div>
  </article>`;
}

export function portfolioSectionsHTML(built: Built, opts: { editable: boolean; locked: boolean }): string {
  return built.sections.map((s, i) => {
    const meta = SECTIONS.find((x) => x.id === s.id)!;
    return `<section class="card p-sec" data-sec="${s.id}" aria-labelledby="ps-${s.id}">
      <div class="section-head"><h2 id="ps-${s.id}">${i + 1}. ${esc(s.title)}</h2><span class="muted small">${s.max ? `${s.max} marks` : 'Not marked'}</span></div>
      ${s.items.length ? s.items.map((it) => itemHTML(it, opts)).join('') : `<p class="p-empty muted">${esc(meta.hint)}</p>`}
    </section>`;
  }).join('');
}

/** Load private photos (they need the sign-in token) and make every attachment open on tap. */
export async function loadThumbs(root: HTMLElement): Promise<void> {
  if (!root.dataset.thumbsWired) {
    root.dataset.thumbsWired = '1';
    root.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-thumb]');
      if (!b) return;
      void openFile({ key: b.dataset.thumb!, name: b.dataset.name ?? 'file', type: b.dataset.type ?? '', size: 0 }).catch(() => undefined);
    });
  }
  const imgs = [...root.querySelectorAll<HTMLImageElement>('img[data-src-key]:not([src])')];
  if (!imgs.length) return;
  const t = await auth.currentUser?.getIdToken().catch(() => null);
  if (!t) return;
  await Promise.all(imgs.map(async (img) => {
    try {
      const res = await fetch(`/api/file?key=${encodeURIComponent(img.dataset.srcKey!)}`, { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) return;
      img.src = URL.createObjectURL(await res.blob());
      await img.decode().catch(() => undefined);
    } catch { /* offline: the photo shows when back online */ }
  }));
}
