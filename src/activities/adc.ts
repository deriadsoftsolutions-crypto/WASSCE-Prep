import type { ActivityContext } from './types';
import { feedbackHTML } from '../lib/ui';
import { pick, randInt } from '../lib/dom';
import { evaluate } from '../lib/mathparse';

const toADC = (v: number) => Math.round((v / 5) * 1023);
const toV = (a: number) => (a / 1023) * 5;

interface Q { kind: 'v2a' | 'a2v'; v: number; a: number }

export function mount(el: HTMLElement, ctx: ActivityContext) {
  let volts = 2.5;
  let qs: Q[] = [];
  let qi = 0, score = 0;

  const newQuiz = () => {
    qs = Array.from({ length: 3 }, (_, k) => {
      if (k % 2 === 0) { const v = pick([1, 1.25, 2, 2.5, 3, 3.3, 4, 4.5]); return { kind: 'v2a' as const, v, a: toADC(v) }; }
      const a = pick([0, 205, 307, 512, 614, 818, randInt(100, 1000)]); return { kind: 'a2v' as const, v: toV(a), a };
    });
    qi = 0; score = 0;
    renderQuiz();
  };

  el.innerHTML = `
    <p>The Arduino Uno has a <b>10-bit</b> analogue-to-digital converter (ADC). It turns 0V to 5V on pins A0 to A5 into a whole number from <b>0 to 1023</b> (that is 2¹⁰ = 1024 steps).</p>
    <p class="expr">value = V ÷ 5 × 1023 &nbsp; and &nbsp; V = value ÷ 1023 × 5</p>
    <div class="card" style="background:var(--surface-2);margin-top:12px">
      <label class="field"><span>Input voltage: <b data-v></b></span><input type="range" min="0" max="5" step="0.01" data-volts /></label>
      <label class="field"><span>ADC value (analogRead): <b data-a></b></span><input type="range" min="0" max="1023" step="1" data-adc /></label>
      <div class="bar" style="height:22px"><span data-bar></span></div>
      <p class="mono" style="margin:10px 0 0">binary: <b data-bin></b></p>
      <p class="muted small" style="margin:4px 0 0">Each step is 5 ÷ 1024 ≈ 4.9 mV. A temperature sensor such as the LM35 gives 10 mV per °C, so the code converts the ADC value to volts and then to °C.</p>
    </div>
    <h4>Quick quiz</h4>
    <div data-quiz></div>`;

  const sync = () => {
    const a = toADC(volts);
    (el.querySelector('[data-v]') as HTMLElement).textContent = `${volts.toFixed(2)} V`;
    (el.querySelector('[data-a]') as HTMLElement).textContent = String(a);
    (el.querySelector('[data-volts]') as HTMLInputElement).value = String(volts);
    (el.querySelector('[data-adc]') as HTMLInputElement).value = String(a);
    (el.querySelector('[data-bar]') as HTMLElement).style.width = `${(a / 1023) * 100}%`;
    (el.querySelector('[data-bin]') as HTMLElement).textContent = a.toString(2).padStart(10, '0');
  };

  const quizEl = el.querySelector('[data-quiz]') as HTMLElement;
  const renderQuiz = (fb = '') => {
    if (qi >= qs.length) {
      quizEl.innerHTML = feedbackHTML(score === qs.length ? 'ok' : 'bad', `Quiz score: ${score} / ${qs.length}`) +
        '<div class="row" style="margin-top:10px"><button class="btn btn-primary" data-act="again" type="button">Try again</button></div>';
      return;
    }
    const q = qs[qi];
    quizEl.innerHTML = `
      <p><b>Question ${qi + 1} of ${qs.length}.</b> ${q.kind === 'v2a' ? `What ADC value does the Arduino give for <b>${q.v} V</b>?` : `analogRead gives <b>${q.a}</b>. What is the voltage (V)?`}</p>
      <div class="row"><input data-qans inputmode="decimal" style="max-width:220px" autocomplete="off" /><button class="btn btn-primary" data-act="answer" type="button">Check</button></div>${fb}`;
  };

  el.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.dataset.volts !== undefined) { volts = Number(t.value); sync(); }
    if (t.dataset.adc !== undefined) { volts = toV(Number(t.value)); sync(); }
  });
  el.addEventListener('click', (e) => {
    const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'again') newQuiz();
    if (act === 'answer') {
      const q = qs[qi];
      const g = evaluate((el.querySelector('[data-qans]') as HTMLInputElement).value);
      const ok = q.kind === 'v2a' ? Math.abs(g - q.a) <= 2 : Math.abs(g - q.v) <= 0.03;
      if (ok) score++;
      const why = q.kind === 'v2a' ? `${q.v} ÷ 5 × 1023 = ${((q.v / 5) * 1023).toFixed(1)} ≈ ${q.a}` : `${q.a} ÷ 1023 × 5 = ${q.v.toFixed(2)} V`;
      qi++;
      if (qi >= qs.length) void ctx.save(score, qs.length);
      const fb = feedbackHTML(ok ? 'ok' : 'bad', ok ? 'Correct!' : 'Not quite.', `<p>${why}</p>`);
      if (qi >= qs.length) { renderQuiz(); quizEl.insertAdjacentHTML('afterbegin', fb); }
      else renderQuiz(fb);
    }
  });
  sync();
  newQuiz();
}
