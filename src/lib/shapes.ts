export type FlowShape = 'oval' | 'rect' | 'para' | 'diamond' | 'arrow';

/** Flowchart symbol drawn centred on (cx, cy) with width w and height h. */
export function shapeSVG(shape: FlowShape, cx: number, cy: number, w: number, h: number, cls = 'fc-shape'): string {
  const x = cx - w / 2, y = cy - h / 2;
  switch (shape) {
    case 'oval': return `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}"/>`;
    case 'rect': return `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/>`;
    case 'para': {
      const s = Math.min(22, w * 0.15);
      return `<polygon class="${cls}" points="${x + s},${y} ${x + w},${y} ${x + w - s},${y + h} ${x},${y + h}"/>`;
    }
    case 'diamond': return `<polygon class="${cls}" points="${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}"/>`;
    case 'arrow': return `<path class="${cls}" style="fill:none" d="M${x} ${cy} H${x + w - 4} M${x + w - 12} ${cy - 8} L${x + w - 2} ${cy} L${x + w - 12} ${cy + 8}"/>`;
  }
}

/** Small icon of a flowchart symbol for buttons and tray pieces. */
export function shapeIcon(shape: FlowShape): string {
  return `<svg class="shape-mini" viewBox="0 0 60 38" aria-hidden="true">${shapeSVG(shape, 30, 19, 54, 30, '')}</svg>`;
}
