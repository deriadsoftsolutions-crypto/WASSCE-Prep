import topicsData from '../data/topics.json';
import type { Topic } from '../types';
import { esc, fmtDate, fmtTime } from '../lib/dom';
import { confirmDialog, ring, toast } from '../lib/ui';
import { askLearner, learner } from '../lib/session';
import { storage } from '../storage';
import { ACTIVITIES } from '../activities';

const topics = topicsData as Topic[];

export async function progressPage(el: HTMLElement) {
  const l = learner();
  if (!l) { el.innerHTML = '<h1>My Progress</h1><p>Enter your name first.</p>'; return; }
  const prog = await storage.getProgress(l.id);
  const overall = Math.round(topics.reduce((s, t) => s + (prog.topics[t.id]?.percent ?? 0), 0) / topics.length);
  // Weakness uses topic activity scores and Paper 1 accuracy (topic quizzes and mocks), only for topics with some data.
  const strength = (id: number) => {
    const tp = prog.topics[id];
    return tp.mcqTotal ? (tp.percent + (tp.mcqCorrect / tp.mcqTotal) * 100) / 2 : tp.percent;
  };
  const tried = topics.filter((t) => prog.topics[t.id].mcqTotal > 0 || Object.keys(prog.topics[t.id].items).length > 0);
  const weakIds = new Set(tried.map((t) => ({ id: t.id, s: strength(t.id) })).filter((x) => x.s < 60).sort((a, b) => a.s - b.s).slice(0, 3).map((x) => x.id));
  const p2Count = Object.keys(prog.paper2).length;
  const p2Avg = p2Count ? Math.round((Object.values(prog.paper2).reduce((s, i) => s + i.best, 0) / p2Count) * 100) : 0;

  el.innerHTML = `
    <div class="page-head">
      <div><h1>My Progress</h1><p class="muted" style="margin:0">${esc(l.name)} · ${esc(l.className)} · ${prog.totalAttempts} attempt${prog.totalAttempts === 1 ? '' : 's'} saved on this tablet</p></div>
      ${ring(overall, 90, 10)}
    </div>
    ${weakIds.size ? `<div class="feedback bad" style="margin-bottom:16px"><strong>Focus on these topics next</strong>
      ${[...weakIds].map((id) => { const t = topics.find((x) => x.id === id)!; return `<a class="btn btn-sm" style="margin:4px 6px 0 0" href="/topic/${id}">${t.icon} ${esc(t.short)}</a>`; }).join('')}</div>`
      : prog.totalAttempts ? '<div class="feedback ok" style="margin-bottom:16px"><strong>Great work!</strong>No topic is below 60%. Try a full mock to test yourself.</div>' : ''}
    <div class="card">
      <h2>Scores per topic</h2>
      <p class="muted small">Each topic score is the average of your best scores on its quiz and activities. Paper 1 shows how many objective questions you have answered correctly for that topic.</p>
      ${topics.map((t) => {
        const tp = prog.topics[t.id];
        const weak = weakIds.has(t.id);
        const items = [`quiz:${t.id}`, ...t.activities.map((a) => `activity:${a}`)].map((id) => {
          const it = tp.items[id];
          const name = id.startsWith('quiz:') ? 'Topic quiz' : ACTIVITIES[id.slice(9)]?.title.replace(/\s*\(.*\)$/, '') ?? id;
          return `<span class="pill ${it ? (it.best >= 0.8 ? 'ok' : '') : ''}" style="margin:2px 4px 2px 0">${esc(name)}: ${it ? `${Math.round(it.best * 100)}%` : 'not tried'}</span>`;
        }).join('');
        return `<div class="prog-row ${weak ? 'weak' : ''}">
          <div><a href="/topic/${t.id}" style="font-weight:700">${t.icon} ${t.id}. ${esc(t.short)}</a>
            <div class="muted small">Paper 1: ${tp.mcqTotal ? `${tp.mcqCorrect} / ${tp.mcqTotal} correct` : 'none yet'}</div></div>
          <div><div class="bar ${weak ? 'weak' : ''}"><span style="width:${tp.percent}%"></span></div><div style="margin-top:6px">${items}</div></div>
          <div style="font-weight:800;font-size:1.2rem;text-align:right">${tp.percent}%</div>
        </div>`;
      }).join('')}
    </div>
    <div class="grid-2">
      <div class="card">
        <h2>Paper 1 mocks</h2>
        ${prog.mocks.length ? `<div class="table-wrap"><table class="data"><thead><tr><th class="left">Date</th><th>Score</th><th>Time</th></tr></thead><tbody>
          ${prog.mocks.slice(0, 10).map((m) => `<tr><td class="left">${fmtDate(m.timestamp)}</td><td><b>${m.score} / ${m.max}</b> (${Math.round((m.score / m.max) * 100)}%)</td><td>${m.durationSec ? fmtTime(m.durationSec) : '-'}</td></tr>`).join('')}
        </tbody></table></div>` : '<p class="muted">No mocks yet.</p>'}
        <a class="btn btn-primary" href="/mock" style="margin-top:12px">Take a mock</a>
      </div>
      <div class="card">
        <h2>Paper 2 self-marking</h2>
        <p>${p2Count ? `You have self-marked <b>${p2Count}</b> parts with an average best score of <b>${p2Avg}%</b>.` : 'No Paper 2 parts self-marked yet.'}</p>
        <a class="btn btn-primary" href="/paper2">Practise Paper 2</a>
      </div>
    </div>
    <div class="card">
      <h2>Settings</h2>
      <div class="row">
        <button class="btn" data-act="switch" type="button">Switch learner</button>
        <button class="btn btn-danger" data-act="reset" type="button">Reset my progress</button>
      </div>
    </div>`;

  el.querySelector('[data-act="switch"]')!.addEventListener('click', () => void askLearner(true));
  el.querySelector('[data-act="reset"]')!.addEventListener('click', async () => {
    if (await confirmDialog(`Delete all saved progress for ${l.name} on this tablet? This cannot be undone.`, 'Delete progress', true)) {
      await storage.clearProgress(l.id);
      toast('Progress reset.');
      void progressPage(el);
    }
  });
}
