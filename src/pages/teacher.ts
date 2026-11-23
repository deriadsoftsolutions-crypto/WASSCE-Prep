import topicsData from '../data/topics.json';
import type { Attempt, Topic } from '../types';
import { CONFIG } from '../config';
import { esc, fmtDate } from '../lib/dom';
import { confirmDialog, downloadText, toast } from '../lib/ui';
import { getSettings, saveSettings } from '../lib/settings';
import { storage } from '../storage';

const topics = topicsData as Topic[];
const UNLOCK_KEY = 'wassce.teacher.unlocked';

function csvCell(v: unknown): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const csv = (rows: unknown[][]) => rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');

export function teacherPage(el: HTMLElement) {
  let unlocked = false;
  try { unlocked = sessionStorage.getItem(UNLOCK_KEY) === '1'; } catch { /* ignore */ }
  if (!unlocked) return renderLock(el);
  void renderDashboard(el);
}

function renderLock(el: HTMLElement) {
  el.innerHTML = `
    <div class="card" style="max-width:420px;margin:40px auto">
      <h1>Teacher</h1>
      <form data-pin class="stack">
        <label class="field"><span>Enter PIN</span><input type="password" inputmode="numeric" autocomplete="off" name="pin" maxlength="12" /></label>
        <button class="btn btn-primary btn-block" type="submit">Unlock</button>
        <div data-err></div>
      </form>
    </div>`;
  const form = el.querySelector('form')!;
  (form.querySelector('input') as HTMLInputElement).focus();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const pin = String(new FormData(form).get('pin') ?? '');
    if (pin === CONFIG.TEACHER_PIN) {
      try { sessionStorage.setItem(UNLOCK_KEY, '1'); } catch { /* ignore */ }
      void renderDashboard(el);
    } else {
      (el.querySelector('[data-err]') as HTMLElement).innerHTML = '<p class="mark-bad">Wrong PIN.</p>';
    }
  });
}

async function renderDashboard(el: HTMLElement) {
  const s = getSettings();
  const attempts = await storage.getAttempts();
  const learners = new Map<string, { name: string; cls: string; list: Attempt[] }>();
  for (const a of attempts) {
    const e = learners.get(a.learnerId) ?? { name: a.learnerName, cls: a.className, list: [] };
    e.list.push(a);
    learners.set(a.learnerId, e);
  }
  const progs = await Promise.all([...learners.keys()].map((id) => storage.getProgress(id)));
  const rows = [...learners.entries()].map(([id, e], k) => ({ id, ...e, prog: progs[k] }))
    .sort((a, b) => a.cls.localeCompare(b.cls) || a.name.localeCompare(b.name));

  el.innerHTML = `
    <div class="page-head"><h1>Teacher page</h1><button class="btn" data-act="lock" type="button">Lock</button></div>
    <div class="card">
      <h2>Mock settings for this tablet</h2>
      <div class="grid-2">
        <label class="field"><span>Paper 1 mock timer (minutes, 0 = no timer)</span><input type="number" min="0" max="180" step="1" data-minutes value="${s.mockMinutes}" /></label>
        <label class="switch" style="align-self:end"><input type="checkbox" data-shuffle ${s.shuffle ? 'checked' : ''} /> Shuffle question order</label>
      </div>
      <button class="btn btn-primary" data-act="save" type="button">Save settings</button>
      <p class="muted small">These settings are stored on this tablet only. Set them on each tablet before the session.</p>
    </div>
    <div class="card">
      <div class="row" style="justify-content:space-between"><h2 style="margin:0">Progress stored on this tablet</h2>
        <div class="row">
          <button class="btn btn-accent" data-act="csv-summary" type="button" ${rows.length ? '' : 'disabled'}>Export summary CSV</button>
          <button class="btn" data-act="csv-all" type="button" ${attempts.length ? '' : 'disabled'}>Export all attempts CSV</button>
        </div></div>
      <p class="muted small">${rows.length} learner(s), ${attempts.length} attempt(s). Topic columns show each learner's topic score (%).</p>
      ${rows.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th class="left">Learner</th><th>Class</th><th>Best mock</th>${topics.map((t) => `<th title="${esc(t.title)}">T${t.id}</th>`).join('')}<th>Last active</th></tr></thead>
        <tbody>${rows.map((r) => {
          const best = r.prog.mocks.reduce((m, x) => Math.max(m, x.score), -1);
          return `<tr><td class="left"><b>${esc(r.name)}</b></td><td>${esc(r.cls)}</td><td>${best >= 0 ? `${best}/${r.prog.mocks[0].max}` : '-'}</td>
            ${topics.map((t) => { const p = r.prog.topics[t.id].percent; return `<td style="${p < 50 ? 'color:var(--bad);font-weight:700' : ''}">${p}</td>`; }).join('')}
            <td class="small">${fmtDate(r.list[0].timestamp)}</td></tr>`;
        }).join('')}</tbody></table></div>` : '<p class="muted">No learner data on this tablet yet.</p>'}
    </div>
    <div class="card">
      <h2>Danger zone</h2>
      <button class="btn btn-danger" data-act="clear" type="button">Delete ALL learner data on this tablet</button>
    </div>`;

  el.onclick = async (e) => {
    const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'lock') { try { sessionStorage.removeItem(UNLOCK_KEY); } catch { /* ignore */ } renderLock(el); }
    if (act === 'save') {
      const minutes = Math.max(0, Math.min(180, Math.round(Number((el.querySelector('[data-minutes]') as HTMLInputElement).value) || 0)));
      saveSettings({ mockMinutes: minutes, shuffle: (el.querySelector('[data-shuffle]') as HTMLInputElement).checked });
      toast(`Saved: ${minutes ? `${minutes} minute timer` : 'no timer'}, ${(el.querySelector('[data-shuffle]') as HTMLInputElement).checked ? 'shuffled' : 'not shuffled'}.`);
    }
    if (act === 'csv-all') {
      downloadText(`wassce-attempts-${stamp()}.csv`, csv([
        ['learner', 'class', 'type', 'item', 'topic', 'score', 'max', 'percent', 'duration_sec', 'date_time'],
        ...attempts.map((a) => [a.learnerName, a.className, a.kind, a.itemId, a.topicId ?? '', a.score, a.max,
          a.max ? Math.round((a.score / a.max) * 100) : '', a.durationSec ?? '', new Date(a.timestamp).toISOString()]),
      ]));
    }
    if (act === 'csv-summary') {
      downloadText(`wassce-summary-${stamp()}.csv`, csv([
        ['learner', 'class', 'attempts', 'mocks_taken', 'best_mock', ...topics.map((t) => `T${t.id} ${t.short} (%)`)],
        ...rows.map((r) => [r.name, r.cls, r.list.length, r.prog.mocks.length, r.prog.mocks.length ? Math.max(...r.prog.mocks.map((m) => m.score)) : '',
          ...topics.map((t) => r.prog.topics[t.id].percent)]),
      ]));
    }
    if (act === 'clear' && (await confirmDialog('Delete every learner\'s saved progress on this tablet? Export a CSV first if you need it.', 'Delete everything', true))) {
      await storage.clearProgress();
      toast('All learner data deleted.');
      void renderDashboard(el);
    }
  };
}
