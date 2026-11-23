import type { ActivityContext } from './types';
import { feedbackHTML } from '../lib/ui';
import { esc } from '../lib/dom';

type PinId = 'L' | 'W' | 'R';
const PINS: { id: PinId; x: number; name: string }[] = [
  { id: 'L', x: 110, name: 'Outer pin 1' },
  { id: 'W', x: 170, name: 'Middle pin (wiper)' },
  { id: 'R', x: 230, name: 'Outer pin 2' },
];
const PIN_Y = 300;
/** Arduino header targets. */
const TARGETS = [
  { id: 'D8', x: 470, y: 78 }, { id: 'D7', x: 530, y: 78 },
  { id: '3.3V', x: 400, y: 342 }, { id: '5V', x: 456, y: 342 }, { id: 'GND', x: 512, y: 342 },
  { id: 'A0', x: 590, y: 342 }, { id: 'A1', x: 646, y: 342 },
];
const WIRE_COL: Record<PinId, string> = { L: '#c22a2a', W: '#e8a100', R: '#1d1d1d' };

export function mount(el: HTMLElement, ctx: ActivityContext) {
  let conn: Record<PinId, string | null> = { L: null, W: null, R: null };
  let sel: PinId | null = null;
  let drag: { pin: PinId; x: number; y: number } | null = null;
  let checked: Record<PinId, boolean> | null = null;
  let knob = 50;

  el.innerHTML = `
    <p class="instructions small">Tap a pin of the potentiometer, then tap a pin on the Arduino (or drag from one to the other). Tap a pin again to remove its wire.</p>
    <div class="svg-wrap"><svg viewBox="0 0 700 440" data-svg role="img" aria-label="Potentiometer and Arduino Uno wiring"></svg></div>
    <div class="row" style="margin-top:12px">
      <button class="btn btn-primary btn-big" data-act="check" data-bar type="button">Check wiring</button>
      <button class="btn" data-act="reset" data-bar type="button">Try again</button>
    </div>
    <div data-fb></div>
    <div data-live></div>`;
  const svg = el.querySelector('[data-svg]') as SVGSVGElement;

  const toSvg = (cx: number, cy: number) => {
    const pt = svg.createSVGPoint();
    pt.x = cx; pt.y = cy;
    const m = svg.getScreenCTM();
    return m ? pt.matrixTransform(m.inverse()) : pt;
  };
  const wirePath = (x1: number, y1: number, x2: number, y2: number) => `M${x1} ${y1} C${x1} ${y1 + 70}, ${x2} ${y2 + (y2 > 200 ? 60 : -60)}, ${x2} ${y2}`;

  const draw = () => {
    const wires = PINS.filter((p) => conn[p.id]).map((p) => {
      const t = TARGETS.find((x) => x.id === conn[p.id])!;
      return `<path d="${wirePath(p.x, PIN_Y + 22, t.x, t.y > 200 ? t.y + 25 : t.y - 25)}" style="fill:none;stroke:${WIRE_COL[p.id]};stroke-width:6;stroke-linecap:round;opacity:.9"/>`;
    }).join('');
    const temp = drag ? (() => { const p = PINS.find((x) => x.id === drag!.pin)!; return `<path d="M${p.x} ${PIN_Y + 22} L${drag!.x} ${drag!.y}" style="fill:none;stroke:${WIRE_COL[p.id]};stroke-width:5;stroke-dasharray:8 6"/>`; })() : '';
    svg.innerHTML = `
      <!-- Arduino Uno board -->
      <rect x="350" y="40" width="335" height="335" rx="18" style="fill:#0f6c8c"/>
      <text x="517" y="200" text-anchor="middle" font-size="30" font-weight="800" style="fill:#fff">ARDUINO</text>
      <text x="517" y="232" text-anchor="middle" font-size="20" font-weight="700" style="fill:#cfe8f1">UNO</text>
      <rect x="360" y="150" width="60" height="40" rx="4" style="fill:#c0c0c0"/><text x="390" y="212" font-size="11" text-anchor="middle" style="fill:#cfe8f1">USB</text>
      <text x="500" y="122" font-size="13" text-anchor="middle" style="fill:#cfe8f1">DIGITAL</text>
      <text x="428" y="298" font-size="13" text-anchor="middle" style="fill:#cfe8f1">POWER</text>
      <text x="618" y="298" font-size="13" text-anchor="middle" style="fill:#cfe8f1">ANALOG IN</text>
      ${TARGETS.map((t) => `
        <g data-target="${t.id}" role="button" aria-label="Arduino pin ${t.id}" style="cursor:pointer">
          <rect x="${t.x - 25}" y="${t.y - 25}" width="50" height="50" rx="10" style="fill:${Object.values(conn).includes(t.id) ? '#ffe08a' : '#1c2b30'};stroke:#fff;stroke-width:2"/>
          <text x="${t.x}" y="${t.y}" text-anchor="middle" dominant-baseline="central" font-size="${t.id.length > 2 ? 13 : 15}" font-weight="800" style="fill:${Object.values(conn).includes(t.id) ? '#1c2b30' : '#fff'}">${t.id}</text>
        </g>`).join('')}
      <!-- Potentiometer -->
      <rect x="80" y="150" width="180" height="140" rx="16" style="fill:#2d6fb0"/>
      <circle cx="170" cy="210" r="48" style="fill:#d8dde0;stroke:#6b7a80;stroke-width:4"/>
      <line x1="170" y1="210" x2="${170 + 40 * Math.cos(((knob / 100) * 270 - 225) * Math.PI / 180)}" y2="${210 + 40 * Math.sin(((knob / 100) * 270 - 225) * Math.PI / 180)}" style="stroke:#1d1d1d;stroke-width:8;stroke-linecap:round"/>
      <text x="170" y="135" text-anchor="middle" font-size="17" font-weight="800" class="svg-text">Potentiometer</text>
      ${PINS.map((p) => {
        const st = checked ? (checked[p.id] ? 'var(--ok)' : 'var(--bad)') : sel === p.id ? 'var(--accent)' : '#9aa3a6';
        return `<g data-pin="${p.id}" role="button" aria-label="${p.name}" style="cursor:pointer">
          <rect x="${p.x - 26}" y="${PIN_Y - 10}" width="52" height="64" rx="10" style="fill:transparent"/>
          <rect x="${p.x - 7}" y="${PIN_Y - 10}" width="14" height="36" style="fill:${st};stroke:#555;stroke-width:1"/>
          <circle cx="${p.x}" cy="${PIN_Y + 22}" r="11" style="fill:${st};stroke:${sel === p.id ? 'var(--accent)' : '#555'};stroke-width:${sel === p.id ? 5 : 2}"/>
          <text x="${p.x}" y="${PIN_Y - 20}" text-anchor="middle" font-size="13" font-weight="700" style="fill:#fff">${p.id === 'W' ? 'wiper' : 'outer'}</text>
        </g>`;
      }).join('')}
      ${wires}${temp}`;
  };

  const connect = (pin: PinId, target: string) => {
    for (const k of Object.keys(conn) as PinId[]) if (conn[k] === target && k !== pin) conn[k] = null;
    conn[pin] = target;
    checked = null;
    sel = null;
    (el.querySelector('[data-live]') as HTMLElement).innerHTML = '';
  };

  svg.addEventListener('pointerdown', (e) => {
    const pin = (e.target as Element).closest<SVGGElement>('[data-pin]')?.dataset.pin as PinId | undefined;
    if (!pin) return;
    const p = toSvg(e.clientX, e.clientY);
    drag = { pin, x: p.x, y: p.y };
    svg.setPointerCapture(e.pointerId);
    (drag as { moved?: boolean }).moved = false;
  });
  svg.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = toSvg(e.clientX, e.clientY);
    const pin = PINS.find((x) => x.id === drag!.pin)!;
    if (Math.hypot(p.x - pin.x, p.y - (PIN_Y + 22)) > 20) (drag as { moved?: boolean }).moved = true;
    drag.x = p.x; drag.y = p.y;
    if ((drag as { moved?: boolean }).moved) draw();
  });
  svg.addEventListener('pointerup', (e) => {
    if (!drag) return;
    const d = drag as { pin: PinId; moved?: boolean };
    drag = null;
    if (d.moved) {
      const p = toSvg(e.clientX, e.clientY);
      const t = TARGETS.find((x) => Math.abs(x.x - p.x) <= 28 && Math.abs(x.y - p.y) <= 28);
      if (t) connect(d.pin, t.id);
    } else if (conn[d.pin] && sel !== d.pin) {
      conn[d.pin] = null; checked = null; sel = null;
    } else {
      sel = sel === d.pin ? null : d.pin;
    }
    draw();
  });
  svg.addEventListener('click', (e) => {
    const t = (e.target as Element).closest<SVGGElement>('[data-target]')?.dataset.target;
    if (t && sel) { connect(sel, t); draw(); }
  });

  el.addEventListener('click', (e) => {
    const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
    const fb = el.querySelector('[data-fb]') as HTMLElement;
    if (act === 'reset') { conn = { L: null, W: null, R: null }; sel = null; checked = null; fb.innerHTML = ''; (el.querySelector('[data-live]') as HTMLElement).innerHTML = ''; draw(); }
    if (act === 'check') {
      checked = {
        L: (conn.L === '5V' || conn.L === 'GND') && conn.L !== conn.R,
        W: conn.W === 'A0',
        R: (conn.R === '5V' || conn.R === 'GND') && conn.L !== conn.R,
      };
      const score = Number(checked.L) + Number(checked.W) + Number(checked.R);
      const tips: string[] = [];
      if (!conn.L || !conn.W || !conn.R) tips.push('Connect all three pins.');
      if (conn.W && conn.W.startsWith('D')) tips.push('The wiper gives a voltage that varies smoothly. A digital pin only reads HIGH or LOW, so use an analogue pin such as A0.');
      if (conn.W === '5V' || conn.W === 'GND') tips.push('The middle pin is the output. It must go to an analogue input, not to the supply.');
      if ([conn.L, conn.R].some((x) => x === 'A0' || x === 'A1')) tips.push('The outer pins are the two ends of the resistive track. They go across the supply: one to 5V and one to GND.');
      if (conn.L && conn.L === conn.R) tips.push('Both outer pins on the same pin means no voltage across the track.');
      if ([conn.L, conn.R].includes('3.3V')) tips.push('Use the 5V pin so the reading covers the full 0 to 1023 range.');
      fb.innerHTML = feedbackHTML(score === 3 ? 'ok' : 'bad', score === 3 ? 'Wired correctly! 3 / 3' : `${score} / 3 pins correct`,
        `${tips.length ? `<ul>${tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}<p>The potentiometer is a voltage divider. With its ends across 5V and GND, the wiper gives any voltage from 0 to 5V depending on the knob position, and analogRead(A0) turns it into 0 to 1023.</p>`);
      draw();
      void ctx.save(score, 3, { wiring: conn });
      if (score === 3) {
        const live = el.querySelector('[data-live]') as HTMLElement;
        live.innerHTML = `<div class="card" style="background:var(--surface-2)"><label class="field"><span>Turn the knob: <b data-kv></b></span><input type="range" min="0" max="100" value="${knob}" data-knob /></label></div>`;
        const upd = () => {
          const reversed = conn.L === '5V';
          const frac = reversed ? 1 - knob / 100 : knob / 100;
          (live.querySelector('[data-kv]') as HTMLElement).textContent = `A0 = ${(frac * 5).toFixed(2)} V, analogRead(A0) = ${Math.round(frac * 1023)}`;
        };
        live.querySelector('[data-knob]')!.addEventListener('input', (ev) => { knob = Number((ev.target as HTMLInputElement).value); upd(); draw(); });
        upd();
      }
    }
  });
  draw();
}
