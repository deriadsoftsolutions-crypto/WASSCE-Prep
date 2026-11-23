/**
 * Touch-friendly drag and drop built on Pointer Events (the HTML5 drag API
 * does not work on most Android tablets).
 *
 * Two ways to move a piece, so every learner can manage:
 *   1. Drag it with a finger and let go over a target.
 *   2. Tap it (it is highlighted), then tap a target.
 */
export interface DnDOptions {
  root: HTMLElement;
  pieceSelector: string;
  dropSelector: string;
  onDrop: (piece: HTMLElement, target: HTMLElement) => void;
  /** Called when a piece is tapped (selected or deselected). */
  onSelect?: (piece: HTMLElement | null) => void;
}

const THRESHOLD = 8;

export function enableDnD(o: DnDOptions): { clearSelection: () => void; destroy: () => void } {
  let selected: HTMLElement | null = null;
  let drag: {
    piece: HTMLElement;
    id: number;
    sx: number;
    sy: number;
    ghost?: HTMLElement;
    dx: number;
    dy: number;
    over?: HTMLElement | null;
  } | null = null;

  const select = (p: HTMLElement | null) => {
    selected?.classList.remove('selected');
    selected = p;
    selected?.classList.add('selected');
    o.root.classList.toggle('drop-ready', !!selected);
    o.onSelect?.(selected);
  };

  const targetAt = (x: number, y: number): HTMLElement | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const t = el?.closest(o.dropSelector) as HTMLElement | null;
    return t && o.root.contains(t) ? t : null;
  };

  const down = (e: PointerEvent) => {
    if (e.button > 0) return;
    const piece = (e.target as HTMLElement).closest(o.pieceSelector) as HTMLElement | null;
    if (!piece || !o.root.contains(piece) || piece.dataset.locked === '1') return;
    const r = piece.getBoundingClientRect();
    drag = { piece, id: e.pointerId, sx: e.clientX, sy: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top };
    try { piece.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  const move = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.ghost) {
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < THRESHOLD) return;
      const r = drag.piece.getBoundingClientRect();
      const g = drag.piece.cloneNode(true) as HTMLElement;
      g.classList.add('drag-ghost');
      g.classList.remove('selected');
      g.style.width = `${r.width}px`;
      document.body.appendChild(g);
      drag.ghost = g;
      drag.piece.style.opacity = '0.35';
      select(null);
    }
    e.preventDefault();
    drag.ghost.style.left = `${e.clientX - drag.dx}px`;
    drag.ghost.style.top = `${e.clientY - drag.dy}px`;
    const t = targetAt(e.clientX, e.clientY);
    if (t !== drag.over) {
      drag.over?.classList.remove('drop-hover');
      t?.classList.add('drop-hover');
      drag.over = t;
    }
  };

  const up = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (d.ghost) {
      d.ghost.remove();
      d.piece.style.opacity = '';
      d.over?.classList.remove('drop-hover');
      const t = targetAt(e.clientX, e.clientY);
      if (t) o.onDrop(d.piece, t);
    } else {
      select(selected === d.piece ? null : d.piece);
    }
  };

  const cancel = () => {
    if (!drag) return;
    drag.ghost?.remove();
    drag.piece.style.opacity = '';
    drag.over?.classList.remove('drop-hover');
    drag = null;
  };

  const click = (e: MouseEvent) => {
    if (!selected) return;
    const tgt = e.target as HTMLElement;
    if (tgt.closest(o.pieceSelector)) return;
    const t = tgt.closest(o.dropSelector) as HTMLElement | null;
    if (!t || !o.root.contains(t)) return;
    const p = selected;
    select(null);
    o.onDrop(p, t);
  };

  o.root.addEventListener('pointerdown', down);
  o.root.addEventListener('pointermove', move);
  o.root.addEventListener('pointerup', up);
  o.root.addEventListener('pointercancel', cancel);
  o.root.addEventListener('click', click);

  return {
    clearSelection: () => select(null),
    destroy: () => {
      o.root.removeEventListener('pointerdown', down);
      o.root.removeEventListener('pointermove', move);
      o.root.removeEventListener('pointerup', up);
      o.root.removeEventListener('pointercancel', cancel);
      o.root.removeEventListener('click', click);
    },
  };
}
