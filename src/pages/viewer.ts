/**
 * Built-in file viewer (/view?src=...&name=...&page=...).
 *   PDF:    rendered in the page with PDF.js (works offline once the file has been opened).
 *   Slides: ready-made decks shown from slide pictures (works offline).
 *   Office: PowerPoint, Word and Excel uploads in Microsoft's online viewer (needs internet).
 * A Download button is always there.
 */
import { esc } from '../lib/dom';
import { icon } from '../lib/icons';
import { navigate } from '../router';
import { allowedSrc, viewKind } from '../lib/viewable';
import { SLIDE_DECKS, slideFile } from '../data/slideDecks';

const fileNameOf = (src: string) => decodeURIComponent(src.split('/').pop() ?? 'file').replace(/^[0-9a-f-]{36}-/, '');

export function viewerPage(el: HTMLElement): (() => void) | void {
  const q = new URLSearchParams(location.search);
  const src = q.get('src') ?? '';
  const name = q.get('name') || fileNameOf(src);
  const kind = viewKind(src, name);
  if (!allowedSrc(src) || !kind) {
    el.innerHTML = '<h1>File not found</h1><p><a href="/learn">Back to Learn</a></p>';
    return;
  }
  el.innerHTML = `
    <div class="viewer-head">
      <button class="back" type="button" data-back aria-label="Back">${icon('back', 22)}</button>
      <h1 class="viewer-title">${esc(q.get('title') || SLIDE_DECKS[src]?.title || name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '))}</h1>
      <div class="row viewer-tools" data-tools></div>
      <a class="btn btn-sm" href="${esc(src)}" download="${esc(name)}">Download</a>
    </div>
    <div class="viewer-body" data-body></div>`;
  el.querySelector('[data-back]')!.addEventListener('click', () => { if (history.length > 1) history.back(); else navigate('/learn'); });
  const body = el.querySelector('[data-body]') as HTMLElement;
  const tools = el.querySelector('[data-tools]') as HTMLElement;
  if (kind === 'slides') return slides(body, tools, src, Number(q.get('page')) || 1);
  if (kind === 'pdf') return pdf(body, tools, src, Number(q.get('page')) || 1);
  return office(body, src, name);
}

/* ---------------- Slide pictures ---------------- */
function slides(body: HTMLElement, tools: HTMLElement, src: string, start: number) {
  const deck = SLIDE_DECKS[src];
  let n = Math.min(Math.max(1, start), deck.count);
  body.innerHTML = `<div class="slide-stage" data-stage><img data-slide alt="" /></div>`;
  tools.innerHTML = `<button class="btn btn-sm" data-prev type="button" aria-label="Previous slide">${icon('back', 18)}</button>
    <span class="viewer-count" data-count aria-live="polite"></span>
    <button class="btn btn-sm" data-next type="button" aria-label="Next slide"><span style="display:inline-flex;transform:scaleX(-1)">${icon('back', 18)}</span></button>
    <button class="btn btn-sm" data-full type="button">Full screen</button>`;
  const img = body.querySelector('[data-slide]') as HTMLImageElement;
  const stage = body.querySelector('[data-stage]') as HTMLElement;
  const show = () => {
    img.src = slideFile(deck.dir, deck.count, n);
    img.alt = `Slide ${n} of ${deck.count}`;
    (tools.querySelector('[data-count]') as HTMLElement).textContent = `${n} / ${deck.count}`;
    (tools.querySelector('[data-prev]') as HTMLButtonElement).disabled = n === 1;
    (tools.querySelector('[data-next]') as HTMLButtonElement).disabled = n === deck.count;
    if (n < deck.count) new Image().src = slideFile(deck.dir, deck.count, n + 1);
  };
  const go = (d: number) => { const m = Math.min(Math.max(1, n + d), deck.count); if (m !== n) { n = m; show(); } };
  tools.querySelector('[data-prev]')!.addEventListener('click', () => go(-1));
  tools.querySelector('[data-next]')!.addEventListener('click', () => go(1));
  tools.querySelector('[data-full]')!.addEventListener('click', () => { void stage.requestFullscreen?.().catch(() => undefined); });
  stage.addEventListener('click', (e) => { go(e.offsetX < stage.clientWidth / 3 ? -1 : 1); });
  let x0: number | null = null;
  stage.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
  stage.addEventListener('pointerup', (e) => { if (x0 !== null && Math.abs(e.clientX - x0) > 50) { e.stopPropagation(); go(e.clientX < x0 ? 1 : -1); } x0 = null; });
  const key = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
  };
  document.addEventListener('keydown', key);
  show();
  return () => document.removeEventListener('keydown', key);
}

/* ---------------- PDF ---------------- */
function pdf(body: HTMLElement, tools: HTMLElement, src: string, start: number) {
  body.innerHTML = '<p class="muted" data-pdfmsg>Opening the PDF...</p><div class="pdf-pages" data-pages></div>';
  tools.innerHTML = `<label class="viewer-count">Page <input data-goto type="number" min="1" inputmode="numeric" aria-label="Go to page" /> <span data-total></span></label>
    <button class="btn btn-sm" data-zoomout type="button" aria-label="Zoom out">-</button>
    <button class="btn btn-sm" data-zoomin type="button" aria-label="Zoom in">+</button>`;
  const pagesEl = body.querySelector('[data-pages]') as HTMLElement;
  const msg = body.querySelector('[data-pdfmsg]') as HTMLElement;
  const goto = tools.querySelector('[data-goto]') as HTMLInputElement;
  let cancelled = false;
  let cleanup: (() => void) | null = null;
  void (async () => {
    try {
      const [pdfjs, worker] = await Promise.all([import('pdfjs-dist/legacy/build/pdf.mjs'), import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')]);
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      const task = pdfjs.getDocument({ url: src, disableRange: true, disableStream: true });
      task.onProgress = (p: { loaded: number; total: number }) => { if (p.total) msg.textContent = `Opening the PDF... ${Math.round((100 * p.loaded) / p.total)}%`; };
      const doc = await task.promise;
      if (cancelled) { void doc.destroy(); return; }
      msg.remove();
      const first = await doc.getPage(1);
      const base = first.getViewport({ scale: 1 });
      let zoom = 1;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      (tools.querySelector('[data-total]') as HTMLElement).textContent = `of ${doc.numPages}`;
      goto.max = String(doc.numPages);
      const width = () => Math.min(pagesEl.clientWidth, 1100) * zoom;
      pagesEl.innerHTML = Array.from({ length: doc.numPages }, (_, i) => `<div class="pdf-page" data-p="${i + 1}"><span class="pdf-num">${i + 1}</span></div>`).join('');
      const slots = [...pagesEl.querySelectorAll<HTMLElement>('.pdf-page')];
      const size = () => { const w = width(); for (const s of slots) { s.style.width = `${w}px`; s.style.height = `${(w * base.height) / base.width}px`; } };
      size();
      const rendered = new Map<number, { w: number; task: { cancel(): void } | null }>();
      const render = async (n: number) => {
        const w = width();
        if (rendered.get(n)?.w === w) return;
        const slot = slots[n - 1];
        const page = await doc.getPage(n);
        const vp = page.getViewport({ scale: (w / page.getViewport({ scale: 1 }).width) * dpr });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(vp.width); canvas.height = Math.floor(vp.height);
        canvas.style.width = '100%'; canvas.style.height = '100%';
        const t = page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport: vp });
        rendered.set(n, { w, task: t });
        try { await t.promise; } catch { return; }
        slot.querySelector('canvas')?.remove();
        slot.appendChild(canvas);
      };
      const drop = (n: number) => { const r = rendered.get(n); if (!r) return; r.task?.cancel(); rendered.delete(n); slots[n - 1].querySelector('canvas')?.remove(); };
      // Render pages near the screen; free pages far away (big books on small tablets).
      const near = new IntersectionObserver((es) => {
        for (const e of es) { const n = Number((e.target as HTMLElement).dataset.p); if (e.isIntersecting) void render(n); else drop(n); }
      }, { rootMargin: '1200px 0px' });
      // The page counter shows the first page whose bottom is below the top bar.
      const top = () => (document.querySelector('.topbar') as HTMLElement | null)?.getBoundingClientRect().bottom ?? 0;
      let raf = 0;
      const onScroll = () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          if (document.activeElement === goto) return;
          const t = top() + 8;
          const s = slots.find((x) => x.getBoundingClientRect().bottom > t);
          if (s) goto.value = s.dataset.p!;
        });
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      slots.forEach((s) => near.observe(s));
      const jump = (n: number) => {
        const s = slots[Math.min(Math.max(1, n), doc.numPages) - 1];
        window.scrollTo({ top: window.scrollY + s.getBoundingClientRect().top - top() - 8 });
        goto.value = s.dataset.p!;
      };
      goto.value = String(start);
      if (start > 1) requestAnimationFrame(() => jump(start));
      goto.addEventListener('change', () => { jump(Number(goto.value) || 1); goto.blur(); });
      const rezoom = (z: number) => {
        const p = Number(goto.value) || 1;
        zoom = Math.min(3, Math.max(0.5, z));
        size();
        [...rendered.keys()].forEach(drop);
        near.disconnect(); slots.forEach((s) => near.observe(s));
        jump(p);
      };
      tools.querySelector('[data-zoomin]')!.addEventListener('click', () => rezoom(zoom * 1.25));
      tools.querySelector('[data-zoomout]')!.addEventListener('click', () => rezoom(zoom / 1.25));
      cleanup = () => { near.disconnect(); window.removeEventListener('scroll', onScroll); void doc.destroy(); };
    } catch (ex) {
      console.error(ex);
      msg.innerHTML = navigator.onLine
        ? 'This PDF could not be opened here. Use <b>Download</b> to open it on your device.'
        : 'This PDF has not been opened on this device before, so it needs the internet the first time.';
    }
  })();
  return () => { cancelled = true; cleanup?.(); };
}

/* ---------------- PowerPoint, Word, Excel ---------------- */
function office(body: HTMLElement, src: string, name: string) {
  const draw = () => {
    if (!navigator.onLine) {
      body.innerHTML = `<div class="card"><p style="margin-top:0"><b>You are offline.</b> ${esc(name)} opens in Microsoft's online viewer, which needs the internet.</p>
        <p style="margin:0">Use <b>Download</b> to open it in an app on this device, or come back when you are online.</p></div>`;
      return;
    }
    const abs = new URL(src, location.origin).href;
    body.innerHTML = `<iframe class="office-frame" title="${esc(name)}" src="https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(abs)}" allowfullscreen></iframe>
      <p class="muted small" style="margin:6px 0 0">Shown with Microsoft's free online viewer. If it stays blank, use Download.</p>`;
  };
  draw();
  window.addEventListener('online', draw);
  return () => window.removeEventListener('online', draw);
}
