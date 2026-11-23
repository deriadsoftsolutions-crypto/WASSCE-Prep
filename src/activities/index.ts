import type { ActivityContext, ActivityModule } from './types';
import { saveResult } from '../lib/session';
import { storage } from '../storage';
import { learner } from '../lib/session';
import { esc } from '../lib/dom';
import data from '../data/activities.json';

interface Entry {
  title: string;
  blurb: string;
  load: () => Promise<ActivityModule>;
  /** Extra argument passed to mount (e.g. which data set to use). */
  param?: string;
}

const matching = data.matching as Record<string, { title: string }>;
const sorting = data.sorting as Record<string, { title: string }>;

export const ACTIVITIES: Record<string, Entry> = {
  'logic-sim': { title: 'Logic gate simulator (Paper 2 Q4)', blurb: 'Tap X, Y and Z to switch them on and off. Watch the signals flow through the circuit.', load: () => import('./logicSim') },
  'truth-table': { title: 'Truth table builder', blurb: 'Fill the truth table by tapping cells, then check your answers.', load: () => import('./truthTable') },
  'gate-identifier': { title: 'Gate identifier', blurb: 'Name each gate symbol and pick its truth table.', load: () => import('./gateIdentifier') },
  'calc-checker': { title: 'Step-by-step calculation checker', blurb: 'Choose the formula, substitute, calculate and give the unit. Each step is marked.', load: () => import('./calcChecker') },
  'flowchart-builder': { title: 'Flowchart builder (Paper 2 Q3(c))', blurb: 'Build the delivery vehicle flowchart and label the Yes and No branches.', load: () => import('./flowchart') },
  'pid-tuner': { title: 'PID tuner playground', blurb: 'Tune Kp, Ki and Kd to stop the robot exactly on the line.', load: () => import('./pidTuner') },
  'sensor-calibration': { title: 'Sensor calibration lab', blurb: 'Find the offset of a faulty temperature sensor and verify your calibration.', load: () => import('./sensorLab') },
  'adc-slider': { title: 'ADC converter', blurb: 'See how the Arduino turns 0 to 5V into a number from 0 to 1023.', load: () => import('./adc') },
  'pot-wiring': { title: 'Potentiometer wiring puzzle', blurb: 'Connect the three pins of a potentiometer to the Arduino Uno.', load: () => import('./potWiring') },
};

for (const [id, m] of Object.entries(matching)) {
  ACTIVITIES[id] = { title: m.title, blurb: 'Match each item on the left with the right one on the right.', load: () => import('./matching'), param: id };
}
for (const [id, s] of Object.entries(sorting)) {
  ACTIVITIES[id] = { title: s.title, blurb: 'Sort each card into the correct bin.', load: () => import('./sorter'), param: id };
}

export interface MountOptions {
  heading?: boolean;
  param?: string;
  /** 'focus': the activity has the whole screen and the action bar is fixed to the bottom. */
  mode?: 'inline' | 'focus';
  /** Where "Next activity" goes (focus mode). */
  next?: { href: string; label: string };
}

/**
 * Render an activity inside the shared shell: optional step indicator, the activity itself,
 * and an action bar. Activities stay simple: they mark the buttons that belong in the bar with
 * `data-bar`, a status line with `data-bar-status`, and their stages with
 * `<span data-steps="A|B|C" data-step="1" hidden>`. The shell mirrors these and keeps them in sync.
 */
export async function mountActivity(host: HTMLElement, id: string, topicId?: number, opts: MountOptions = {}): Promise<() => void> {
  const entry = ACTIVITIES[id];
  if (!entry) {
    host.innerHTML = `<p class="muted">Activity "${esc(id)}" not found.</p>`;
    return () => {};
  }
  const focus = opts.mode === 'focus';
  host.classList.add('act-shell', focus ? 'act-focus' : 'card');
  host.innerHTML = `
    ${focus ? '' : `<div class="activity-head">${opts.heading === false ? '<span></span>' : `<h3>${esc(entry.title)}</h3>`}<span class="best-badge" hidden></span></div>`}
    <ol class="act-steps" aria-label="Steps" hidden></ol>
    <p class="instructions">${esc(entry.blurb)}</p>
    <div class="activity-body"><div class="skel"><span class="tall"></span><span></span></div></div>
    <div class="act-bar ${focus ? 'fixed' : ''}" role="group" aria-label="Activity actions">
      <div class="act-status" aria-live="polite"></div>
      <div class="act-actions"></div>
    </div>`;
  const badge = host.querySelector('.best-badge') as HTMLElement | null;
  const body = host.querySelector('.activity-body') as HTMLElement;
  const stepsEl = host.querySelector('.act-steps') as HTMLOListElement;
  const statusEl = host.querySelector('.act-status') as HTMLElement;
  const actionsEl = host.querySelector('.act-actions') as HTMLElement;
  let lastResult = '';
  let best: number | null = null;

  const showBest = async () => {
    const l = learner();
    if (!l) return;
    const list = await storage.getAttempts({ learnerId: l.id, itemId: `activity:${id}` });
    if (!list.length) return;
    best = Math.max(...list.map((a) => (a.max ? a.score / a.max : 0)));
    if (badge) { badge.hidden = false; badge.textContent = `Best: ${Math.round(best * 100)}%`; }
    sync();
  };

  /* Mirror the activity's own controls into the shell. */
  let queued = false;
  const visible = (e: Element) => !e.closest('[hidden]:not([data-bar-status])') && !(e.parentElement?.closest('[hidden]'));
  const sync = () => {
    queued = false;
    // Steps
    const st = body.querySelector<HTMLElement>('[data-steps]');
    if (st) {
      const labels = (st.dataset.steps ?? '').split('|');
      const cur = Number(st.dataset.step ?? 0);
      stepsEl.hidden = false;
      stepsEl.innerHTML = labels.map((l, i) => `<li class="${i < cur ? 'done' : i === cur ? 'current' : ''}" ${i === cur ? 'aria-current="step"' : ''}><span></span>${esc(l)}</li>`).join('');
    } else stepsEl.hidden = true;
    // Status
    const status = [...body.querySelectorAll<HTMLElement>('[data-bar-status]')].find(visible);
    const text = status?.textContent?.trim() || lastResult || (best !== null ? `Your best: ${Math.round(best * 100)}%` : '');
    if (statusEl.textContent !== text) statusEl.textContent = text;
    // Actions: one proxy per visible [data-bar] button, in order
    const srcs = [...body.querySelectorAll<HTMLButtonElement>('[data-bar]')].filter((b) => !b.hidden && visible(b));
    srcs.forEach((b) => b.classList.add('bar-src'));
    const proxies = srcs.map((b, i) => {
      const primary = b.classList.contains('btn-primary') || b.classList.contains('btn-accent');
      return `<button type="button" class="btn ${primary ? 'btn-primary' : ''}" data-proxy="${i}" ${b.disabled ? 'disabled' : ''}>${esc(b.textContent?.trim() ?? '')}</button>`;
    });
    if (opts.next) proxies.push(`<a class="btn ${lastResult && !srcs.some((b) => b.classList.contains('btn-primary')) ? 'btn-primary' : ''}" href="${opts.next.href}">${esc(opts.next.label)}</a>`);
    const html = proxies.join('');
    if (actionsEl.dataset.html !== html) {
      actionsEl.dataset.html = html;
      actionsEl.innerHTML = html;
      actionsEl.querySelectorAll<HTMLButtonElement>('[data-proxy]').forEach((p) => {
        p.addEventListener('click', () => srcs[Number(p.dataset.proxy)]?.click());
      });
    }
    host.classList.toggle('has-bar', !!html || !!text);
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(sync); } };
  const observer = new MutationObserver(queue);
  observer.observe(body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'hidden', 'data-step', 'class'], characterData: true });

  const ctx: ActivityContext = {
    id,
    topicId,
    save: async (score, max, details) => {
      lastResult = `Saved: ${score} / ${max} (${max ? Math.round((score / max) * 100) : 0}%)`;
      queue();
      await saveResult({ kind: 'activity', itemId: `activity:${id}`, topicId, score, max, details });
      void showBest();
    },
  };
  void showBest();
  try {
    const mod = await entry.load();
    body.innerHTML = '';
    const c = mod.mount(body, ctx, opts.param ?? entry.param);
    queue();
    return () => { observer.disconnect(); if (typeof c === 'function') c(); };
  } catch (e) {
    console.error(e);
    body.innerHTML = '<p class="mark-bad">This activity could not load. Check your connection and refresh.</p>';
    return () => observer.disconnect();
  }
}
