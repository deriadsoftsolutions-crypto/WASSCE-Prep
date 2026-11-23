export type GateType = 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR' | 'XNOR';
export type Bit = 0 | 1;
export interface Pt { x: number; y: number }

export const GATE_TYPES: GateType[] = ['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR', 'XNOR'];

export function evalGate(t: GateType, a: Bit, b: Bit = 0): Bit {
  switch (t) {
    case 'AND': return (a & b) as Bit;
    case 'OR': return (a | b) as Bit;
    case 'NOT': return (a ? 0 : 1) as Bit;
    case 'NAND': return (a & b ? 0 : 1) as Bit;
    case 'NOR': return (a | b ? 0 : 1) as Bit;
    case 'XOR': return (a ^ b) as Bit;
    case 'XNOR': return (a ^ b ? 0 : 1) as Bit;
  }
}

export const GATE_INFO: Record<GateType, string> = {
  AND: 'AND gives 1 only when ALL inputs are 1. Its symbol has a flat back and a round front.',
  OR: 'OR gives 1 when ANY input is 1. Its symbol has a curved back and a pointed front.',
  NOT: 'NOT (inverter) flips the input: 0 becomes 1 and 1 becomes 0. A triangle with a small circle (bubble).',
  NAND: 'NAND is AND followed by NOT: it gives 0 only when all inputs are 1. AND shape with a bubble.',
  NOR: 'NOR is OR followed by NOT: it gives 1 only when all inputs are 0. OR shape with a bubble.',
  XOR: 'XOR (exclusive OR) gives 1 when the inputs are DIFFERENT. OR shape with an extra curved line at the back.',
  XNOR: 'XNOR gives 1 when the inputs are the SAME. XOR shape with a bubble.',
};

/**
 * SVG markup for a gate whose body starts at x and is centred on cy (height 60).
 * Returns the input and output connection points.
 */
export function gateShape(t: GateType, x: number, cy: number, cls = 'gate'): { svg: string; ins: Pt[]; out: Pt } {
  const y0 = cy - 30, y1 = cy + 30;
  const bubble = (bx: number) => `<circle class="${cls}" cx="${bx}" cy="${cy}" r="6"/>`;
  const and = `<path class="${cls}" d="M${x} ${y0} h30 a30 30 0 0 1 0 60 h-30 Z"/>`;
  const orAt = (ox: number) => `<path class="${cls}" d="M${ox} ${y0} Q${ox + 15} ${cy} ${ox} ${y1} Q${ox + 45} ${y1} ${ox + 65} ${cy} Q${ox + 45} ${y0} ${ox} ${y0} Z"/>`;
  const xorBack = `<path class="${cls}" style="fill:none" d="M${x} ${y0} Q${x + 15} ${cy} ${x} ${y1}"/>`;
  const two = (dx: number) => [{ x: x + dx, y: cy - 15 }, { x: x + dx, y: cy + 15 }];
  switch (t) {
    case 'AND': return { svg: and, ins: two(0), out: { x: x + 60, y: cy } };
    case 'NAND': return { svg: and + bubble(x + 66), ins: two(0), out: { x: x + 72, y: cy } };
    case 'OR': return { svg: orAt(x), ins: two(6), out: { x: x + 65, y: cy } };
    case 'NOR': return { svg: orAt(x) + bubble(x + 71), ins: two(6), out: { x: x + 77, y: cy } };
    case 'XOR': return { svg: xorBack + orAt(x + 8), ins: two(6), out: { x: x + 73, y: cy } };
    case 'XNOR': return { svg: xorBack + orAt(x + 8) + bubble(x + 79), ins: two(6), out: { x: x + 85, y: cy } };
    case 'NOT': return {
      svg: `<path class="${cls}" d="M${x} ${cy - 22} L${x + 40} ${cy} L${x} ${cy + 22} Z"/>` + bubble(x + 46),
      ins: [{ x, y: cy }], out: { x: x + 52, y: cy },
    };
  }
}

/** A standalone gate symbol with short input and output leads, for quizzes. */
export function gateSymbolSVG(t: GateType, width = 260): string {
  const g = gateShape(t, 80, 60);
  const leads = g.ins.map((p) => `<path class="wire" d="M20 ${p.y} H${p.x}"/>`).join('') + `<path class="wire" d="M${g.out.x} ${g.out.y} H${g.out.x + 50}"/>`;
  return `<svg viewBox="0 0 ${g.out.x + 70} 120" width="${width}" role="img" aria-label="Logic gate symbol" style="min-width:0">${leads}${g.svg}</svg>`;
}
