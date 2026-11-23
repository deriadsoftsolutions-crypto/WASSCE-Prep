import type { ActivityContext } from './types';
import { feedbackHTML } from '../lib/ui';

const TARGET = 2; // metres
const T_END = 6; // seconds
const DT = 0.01;

interface SimResult { t: number[]; x: number[]; overshoot: number; settle: number | null; finalErr: number }

/**
 * Robot of mass 1 kg with rolling friction, driven by a motor force u (saturates at ±6 N).
 * With "slope" on, a constant force pushes it back, which P and D alone cannot fully cancel.
 */
export function simulate(kp: number, ki: number, kd: number, slope: boolean): SimResult {
  const U = 6, b = 1, dist = slope ? -0.8 : 0;
  let x = 0, v = 0, I = 0;
  const ts: number[] = [], xs: number[] = [];
  const n = Math.round(T_END / DT);
  for (let k = 0; k <= n; k++) {
    ts.push(k * DT);
    xs.push(x);
    const e = TARGET - x;
    let u = kp * e + ki * I - kd * v; // derivative on measurement (no kick)
    const sat = Math.abs(u) > U;
    u = Math.max(-U, Math.min(U, u));
    if (!sat) I += e * DT; // anti-windup
    v += (u - b * v + dist) * DT;
    x += v * DT;
  }
  let settle: number | null = 0;
  for (let i = xs.length - 1; i >= 0; i--) {
    if (Math.abs(xs[i] - TARGET) > 0.05) { settle = i === xs.length - 1 ? null : ts[i + 1]; break; }
  }
  return { t: ts, x: xs, overshoot: Math.max(...xs) - TARGET, settle, finalErr: TARGET - xs[xs.length - 1] };
}

export function mount(el: HTMLElement, ctx: ActivityContext) {
  const g = { kp: 2, ki: 0, kd: 0, slope: true };
  let res = simulate(g.kp, g.ki, g.kd, g.slope);
  let anim = 0;
  let animIdx = -1;
  let lastSaved = '';

  el.innerHTML = `
    <div class="feedback info" style="margin-top:0"><strong>Challenge</strong>Stop on the line within 3 seconds with no overshoot. (Settled means within 5 cm of the line and staying there.)</div>
    <div class="svg-wrap pid-track" style="margin-top:12px">
      <svg viewBox="0 0 640 120" data-track role="img" aria-label="Robot driving toward a target line">
        <rect x="0" y="92" width="640" height="6" style="fill:var(--border)"/>
        ${[0, 0.5, 1, 1.5, 2, 2.5].map((m) => `<text class="svg-muted" x="${40 + m * 200}" y="116" font-size="13" text-anchor="middle">${m} m</text>`).join('')}
        <line x1="440" y1="10" x2="440" y2="98" style="stroke:var(--bad);stroke-width:4;stroke-dasharray:8 5"/>
        <text x="448" y="22" font-size="14" font-weight="800" style="fill:var(--bad)">TARGET</text>
        <g data-robot>
          <rect x="-34" y="52" width="68" height="34" rx="8" style="fill:var(--primary)"/>
          <rect x="-18" y="40" width="30" height="14" rx="4" style="fill:var(--accent)"/>
          <circle cx="-20" cy="88" r="9" style="fill:var(--text)"/><circle cx="20" cy="88" r="9" style="fill:var(--text)"/>
          <line x1="0" y1="10" x2="0" y2="98" style="stroke:var(--text);stroke-width:2;stroke-dasharray:3 3;opacity:.6"/>
        </g>
      </svg>
    </div>
    <div class="grid-2" style="margin-top:12px">
      <div class="stack">
        ${(['kp', 'ki', 'kd'] as const).map((k) => `
          <div class="slider-row">
            <label for="pid-${k}" style="font-weight:800">${k === 'kp' ? 'Kp' : k === 'ki' ? 'Ki' : 'Kd'}</label>
            <input id="pid-${k}" type="range" min="0" max="${k === 'kp' ? 20 : k === 'ki' ? 5 : 10}" step="0.5" value="${g[k]}" data-k="${k}" />
            <output data-out="${k}">${g[k]}</output>
          </div>`).join('')}
        <label class="switch"><input type="checkbox" data-slope checked /> Slope pushes the robot back (causes drift)</label>
        <div class="row">
          <button class="btn btn-primary btn-big" data-act="run" type="button">▶ Run robot</button>
          <button class="btn" data-act="reset" type="button">Try again</button>
        </div>
        <div class="row small">
          <span class="muted">Try:</span>
          <button class="btn btn-sm" data-preset="16,0,0" type="button">High Kp</button>
          <button class="btn btn-sm" data-preset="16,0,6" type="button">Add Kd</button>
          <button class="btn btn-sm" data-preset="6,0,3" type="button">No Ki</button>
        </div>
      </div>
      <div>
        <canvas data-graph height="300" aria-label="Graph of position against time"></canvas>
        <div class="stats" style="margin-top:10px">
          <div class="stat">Overshoot<b data-stat="over"></b></div>
          <div class="stat">Settling time<b data-stat="settle"></b></div>
          <div class="stat">Final error<b data-stat="err"></b></div>
        </div>
      </div>
    </div>
    <div data-fb></div>`;

  const canvas = el.querySelector('[data-graph]') as HTMLCanvasElement;
  const robot = el.querySelector('[data-robot]') as SVGGElement;
  const fb = el.querySelector('[data-fb]') as HTMLElement;
  const mToX = (m: number) => 40 + Math.max(-0.15, Math.min(2.95, m)) * 200;

  const drawGraph = (upto = res.t.length - 1) => {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 400, h = 300;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const c = canvas.getContext('2d')!;
    c.scale(dpr, dpr);
    const cs = getComputedStyle(el);
    const col = (v: string) => cs.getPropertyValue(v).trim() || '#000';
    const L = 44, R = 12, Tp = 14, B = 36;
    const px = (t: number) => L + (t / T_END) * (w - L - R);
    const py = (x: number) => Tp + (1 - x / 3) * (h - Tp - B);
    c.clearRect(0, 0, w, h);
    c.font = '13px system-ui, sans-serif';
    c.fillStyle = col('--muted'); c.strokeStyle = col('--border'); c.lineWidth = 1;
    for (let x = 0; x <= 3; x += 0.5) { c.beginPath(); c.moveTo(L, py(x)); c.lineTo(w - R, py(x)); c.stroke(); c.fillText(`${x}`, 8, py(x) + 4); }
    for (let t = 0; t <= T_END; t++) c.fillText(`${t}s`, px(t) - 8, h - 14);
    c.fillText('position (m)', L + 4, Tp + 10);
    // 3 s deadline and target band
    c.fillStyle = col('--ok-soft');
    c.fillRect(px(0), py(TARGET + 0.05), px(T_END) - px(0), py(TARGET - 0.05) - py(TARGET + 0.05));
    c.setLineDash([6, 5]); c.strokeStyle = col('--bad'); c.lineWidth = 2;
    c.beginPath(); c.moveTo(L, py(TARGET)); c.lineTo(w - R, py(TARGET)); c.stroke();
    c.strokeStyle = col('--warn');
    c.beginPath(); c.moveTo(px(3), Tp); c.lineTo(px(3), h - B); c.stroke();
    c.setLineDash([]);
    c.fillStyle = col('--warn'); c.fillText('3 s', px(3) + 4, h - B - 6);
    c.strokeStyle = col('--primary'); c.lineWidth = 3;
    c.beginPath();
    for (let i = 0; i <= upto; i += 2) { const X = px(res.t[i]), Y = py(Math.max(-0.2, Math.min(3.2, res.x[i]))); i ? c.lineTo(X, Y) : c.moveTo(X, Y); }
    c.stroke();
  };

  const passed = () => res.overshoot <= 0.02 && res.settle !== null && res.settle <= 3;

  const update = () => {
    res = simulate(g.kp, g.ki, g.kd, g.slope);
    (['kp', 'ki', 'kd'] as const).forEach((k) => ((el.querySelector(`[data-out="${k}"]`) as HTMLElement).textContent = String(g[k])));
    (el.querySelector('[data-stat="over"]') as HTMLElement).textContent = res.overshoot > 0.005 ? `${Math.round(res.overshoot * 100)} cm` : 'none';
    (el.querySelector('[data-stat="settle"]') as HTMLElement).textContent = res.settle === null ? 'not settled' : `${res.settle.toFixed(2)} s`;
    (el.querySelector('[data-stat="err"]') as HTMLElement).textContent = `${Math.round(Math.abs(res.finalErr) * 100)} cm`;
    robot.setAttribute('transform', `translate(${mToX(0)} 0)`);
    drawGraph();
    fb.innerHTML = '';
  };

  const advice = (): string => {
    const tips: string[] = [];
    if (res.overshoot > 0.1) tips.push('The robot overshoots and rolls past the line. Kp is too strong for the damping. Increase Kd to damp it, or lower Kp.');
    else if (res.overshoot > 0.02) tips.push('A small overshoot. A little more Kd (or a little less Ki) should remove it.');
    if (Math.abs(res.finalErr) > 0.05 && g.ki === 0 && g.slope) tips.push('The robot stops short of the line: the slope causes a steady-state error. Only the integral term (Ki) removes it. Add a little Ki.');
    else if (res.settle === null || (res.settle > 3 && res.overshoot <= 0.02)) tips.push('Too slow. Increase Kp so it moves faster, with Kd to stop overshoot.');
    if (g.kd > 0 && res.settle !== null && res.overshoot <= 0.02 && res.settle > 3) tips.push('Too much Kd makes the robot sluggish.');
    return tips.length ? `<ul>${tips.map((t) => `<li>${t}</li>`).join('')}</ul>` : '';
  };

  const run = () => {
    cancelAnimationFrame(anim);
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(T_END, (now - start) / 1000);
      animIdx = Math.min(res.x.length - 1, Math.round(t / DT));
      robot.setAttribute('transform', `translate(${mToX(res.x[animIdx])} 0)`);
      drawGraph(animIdx);
      if (t < T_END) anim = requestAnimationFrame(step);
      else finish();
    };
    anim = requestAnimationFrame(step);
  };

  const finish = () => {
    const ok = passed();
    const key = `${g.kp},${g.ki},${g.kd},${g.slope}`;
    fb.innerHTML = feedbackHTML(ok ? 'ok' : 'bad', ok ? `Challenge complete! Kp = ${g.kp}, Ki = ${g.ki}, Kd = ${g.kd}` : 'Not yet. Adjust the gains and run again.',
      ok ? '<p>P drives the robot toward the line, D damps the motion so it does not overshoot, and I removes the small error caused by the slope.</p>' : advice());
    if (key !== lastSaved) {
      lastSaved = key;
      const score = (res.overshoot <= 0.02 ? 1 : 0) + (res.settle !== null && res.settle <= 3 ? 1 : 0);
      void ctx.save(score, 2, { kp: g.kp, ki: g.ki, kd: g.kd, slope: g.slope, overshoot: res.overshoot, settle: res.settle });
    }
  };

  el.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.dataset.k) { g[t.dataset.k as 'kp' | 'ki' | 'kd'] = Number(t.value); cancelAnimationFrame(anim); update(); }
    if (t.dataset.slope !== undefined) { g.slope = t.checked; cancelAnimationFrame(anim); update(); }
  });
  el.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
    const preset = t.closest<HTMLElement>('[data-preset]')?.dataset.preset;
    if (preset) {
      const [kp, ki, kd] = preset.split(',').map(Number);
      Object.assign(g, { kp, ki, kd });
      (['kp', 'ki', 'kd'] as const).forEach((k) => ((el.querySelector(`[data-k="${k}"]`) as HTMLInputElement).value = String(g[k])));
      update();
      run();
    }
    if (act === 'run') run();
    if (act === 'reset') {
      Object.assign(g, { kp: 2, ki: 0, kd: 0 });
      (['kp', 'ki', 'kd'] as const).forEach((k) => ((el.querySelector(`[data-k="${k}"]`) as HTMLInputElement).value = String(g[k])));
      cancelAnimationFrame(anim);
      update();
    }
  });
  const onResize = () => drawGraph(animIdx >= 0 ? animIdx : undefined);
  window.addEventListener('resize', onResize);
  requestAnimationFrame(update);
  return () => { cancelAnimationFrame(anim); window.removeEventListener('resize', onResize); };
}
