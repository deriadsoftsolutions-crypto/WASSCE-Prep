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

/** Render an activity inside `host`, with a title bar showing the learner's best score. */
export async function mountActivity(host: HTMLElement, id: string, topicId?: number, opts: { heading?: boolean; param?: string } = {}): Promise<() => void> {
  const entry = ACTIVITIES[id];
  if (!entry) {
    host.innerHTML = `<p class="muted">Activity "${esc(id)}" not found.</p>`;
    return () => {};
  }
  host.classList.add('card', 'activity');
  host.innerHTML = `
    <div class="activity-head">
      ${opts.heading === false ? '<span></span>' : `<h3>${esc(entry.title)}</h3>`}
      <span class="best-badge" hidden></span>
    </div>
    <p class="instructions">${esc(entry.blurb)}</p>
    <div class="activity-body"><p class="muted">Loading...</p></div>`;
  const badge = host.querySelector('.best-badge') as HTMLElement;
  const showBest = async () => {
    const l = learner();
    if (!l) return;
    const list = await storage.getAttempts({ learnerId: l.id, itemId: `activity:${id}` });
    if (!list.length) return;
    const best = Math.max(...list.map((a) => (a.max ? a.score / a.max : 0)));
    badge.hidden = false;
    badge.textContent = `Best: ${Math.round(best * 100)}%`;
  };
  void showBest();

  const ctx: ActivityContext = {
    id,
    topicId,
    save: async (score, max, details) => {
      await saveResult({ kind: 'activity', itemId: `activity:${id}`, topicId, score, max, details });
      void showBest();
    },
  };
  const body = host.querySelector('.activity-body') as HTMLElement;
  try {
    const mod = await entry.load();
    body.innerHTML = '';
    const c = mod.mount(body, ctx, opts.param ?? entry.param);
    return typeof c === 'function' ? c : () => {};
  } catch (e) {
    console.error(e);
    body.innerHTML = '<p class="mark-bad">This activity could not load. Check your connection and refresh.</p>';
    return () => {};
  }
}
