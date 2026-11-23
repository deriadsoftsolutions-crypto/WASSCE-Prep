import type { ActivityContext } from './types';
import { feedbackHTML } from '../lib/ui';
import { evaluate } from '../lib/mathparse';

const BIAS = 2.0;
const noise = () => Math.round((Math.random() - 0.5) * 2) / 10; // -0.1, 0 or +0.1
const r1 = (n: number) => Math.round(n * 10) / 10;

const PLACES = [
  { name: 'Fridge', icon: '🧊', base: 5 },
  { name: 'Classroom at noon', icon: '🏫', base: 31 },
  { name: 'Sunny window sill', icon: '☀️', base: 42 },
  { name: 'Cool morning', icon: '🌅', base: 22 },
];

export function mount(el: HTMLElement, ctx: ActivityContext) {
  let ref = 0, sensor = 0, readS = false, readR = false;
  let offset: number | null = null;
  let offsetOk = false;
  let verify: { place: typeof PLACES[number]; ref: number; raw: number; ok: boolean | null }[] = [];

  const reset = () => {
    ref = r1(24 + Math.random() * 5);
    sensor = r1(ref + BIAS + noise());
    readS = readR = false;
    offset = null; offsetOk = false;
    verify = [PLACES[0], PLACES[1], PLACES[2]].map((p) => {
      const t = r1(p.base + Math.random() * 2);
      return { place: p, ref: t, raw: r1(t + BIAS + noise()), ok: null };
    });
    render();
  };

  const big = (label: string, value: string, shown: boolean, act: string) => `
    <div class="stat center" style="padding:14px">
      <div style="font-weight:700">${label}</div>
      <b style="font-size:2rem;margin:6px 0">${shown ? value : '-- °C'}</b>
      <button class="btn ${shown ? '' : 'btn-primary'}" data-act="${act}" type="button">${shown ? 'Read again' : 'Take reading'}</button>
    </div>`;

  const render = () => {
    el.innerHTML = `
      <div class="feedback info" style="margin-top:0"><strong>The problem</strong>This robot's temperature sensor reads a little wrong. Use one-point calibration to fix it.</div>
      <h4 style="margin-top:14px">Step 1. Put the sensor and a reference thermometer side by side in the same stable place, and read both.</h4>
      <div class="grid-2">${big('🤖 Robot sensor', `${sensor.toFixed(1)} °C`, readS, 'readS')}${big('🌡️ Reference thermometer', `${ref.toFixed(1)} °C`, readR, 'readR')}</div>
      <h4 style="margin-top:16px">Step 2. Work out the offset = reference − sensor</h4>
      <div class="row">
        <label class="field" style="margin:0;flex:1;min-width:180px"><span>Offset (°C)</span><input data-offset inputmode="decimal" autocomplete="off" ${readS && readR ? '' : 'disabled'} value="${offset ?? ''}" placeholder="${readS && readR ? 'e.g. -1.5' : 'Take both readings first'}" /></label>
        <button class="btn btn-primary" data-act="offset" type="button" ${readS && readR ? '' : 'disabled'}>Apply offset</button>
      </div>
      <div data-fb="offset"></div>
      ${offsetOk ? `
        <pre class="mono" style="background:var(--surface-2);padding:12px;border-radius:10px;overflow-x:auto">const float OFFSET = ${offset!.toFixed(1)};   // from calibration
float tempC = readSensorC() + OFFSET;   // corrected reading</pre>
        <h4>Step 3. Verify: test at different temperatures. Enter the corrected reading (raw + offset).</h4>
        ${verify.map((v, i) => `
          <div class="calc-step ${v.ok === null ? '' : v.ok ? 'ok' : 'bad'}">
            <div class="row"><b style="font-size:1.1rem">${v.place.icon} ${v.place.name}</b><span class="spacer"></span><span>Raw sensor: <b>${v.raw.toFixed(1)} °C</b></span></div>
            <div class="row" style="margin-top:8px">
              <label class="field" style="margin:0;flex:1;min-width:160px"><span>Corrected reading (°C)</span><input inputmode="decimal" data-ver="${i}" autocomplete="off" /></label>
              <button class="btn" data-check="${i}" type="button">Check</button>
            </div>
            ${v.ok === null ? '' : `<p class="${v.ok ? 'mark-ok' : 'mark-bad'}" style="margin:8px 0 0">${v.ok ? '✓' : '✗'} Reference thermometer: ${v.ref.toFixed(1)} °C. Corrected = ${v.raw.toFixed(1)} + (${offset!.toFixed(1)}) = ${(v.raw + offset!).toFixed(1)} °C.</p>`}
          </div>`).join('')}` : ''}
      <div data-fb="all"></div>
      <div class="row"><button class="btn" data-act="reset" type="button">Try again with a new sensor</button></div>`;
  };

  const finishIfDone = () => {
    if (verify.some((v) => v.ok === null)) return;
    const score = 1 + verify.filter((v) => v.ok).length;
    (el.querySelector('[data-fb="all"]') as HTMLElement).innerHTML = feedbackHTML(score === 4 ? 'ok' : 'bad', `Calibration lab: ${score} / 4`,
      '<p>Verification means checking the corrected readings against a certified thermometer at several different temperatures, and over time. If they all agree within about half a degree, the calibration is good.</p>');
    void ctx.save(score, 4, { offset });
  };

  el.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'readS') { readS = true; sensor = r1(ref + BIAS + noise()); render(); }
    if (act === 'readR') { readR = true; render(); }
    if (act === 'reset') reset();
    if (act === 'offset') {
      const v = evaluate((el.querySelector('[data-offset]') as HTMLInputElement).value);
      const want = r1(ref - sensor);
      const fb = el.querySelector('[data-fb="offset"]') as HTMLElement;
      if (!isFinite(v)) { fb.innerHTML = feedbackHTML('bad', 'Enter a number, for example -1.8'); return; }
      offset = v;
      offsetOk = Math.abs(v - want) <= 0.25;
      if (offsetOk) {
        render();
        (el.querySelector('[data-fb="offset"]') as HTMLElement).innerHTML = feedbackHTML('ok', 'Correct offset!',
          `<p>${ref.toFixed(1)} − ${sensor.toFixed(1)} = ${want.toFixed(1)} °C. The sensor reads about 2 °C too high, so we subtract 2 from every reading.</p>`);
      } else {
        const sign = Math.abs(v + want) <= 0.25;
        fb.innerHTML = feedbackHTML('bad', 'Not quite.', sign
          ? '<p>Check the sign. Offset = reference − sensor. The sensor reads HIGHER than the reference, so the offset is negative.</p>'
          : `<p>Offset = reference − sensor = ${ref.toFixed(1)} − ${sensor.toFixed(1)}.</p>`);
      }
    }
    const ci = t.closest<HTMLElement>('[data-check]')?.dataset.check;
    if (ci !== undefined && offset !== null) {
      const i = Number(ci);
      const given = evaluate((el.querySelector(`[data-ver="${i}"]`) as HTMLInputElement).value);
      verify[i].ok = isFinite(given) && Math.abs(given - verify[i].ref) <= 0.35;
      const keep = Array.from(el.querySelectorAll<HTMLInputElement>('[data-ver]')).map((x) => x.value);
      render();
      el.querySelectorAll<HTMLInputElement>('[data-ver]').forEach((x, k) => (x.value = keep[k]));
      (el.querySelector('[data-offset]') as HTMLInputElement).value = String(offset);
      finishIfDone();
    }
  });
  reset();
}
