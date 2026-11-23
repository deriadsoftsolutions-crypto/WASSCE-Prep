import topicsData from '../data/topics.json';
import type { Topic } from '../types';
import { esc } from '../lib/dom';
import { ring } from '../lib/ui';
import { learner } from '../lib/session';
import { storage } from '../storage';

const topics = topicsData as Topic[];

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export async function homePage(el: HTMLElement) {
  const l = learner();
  const prog = l ? await storage.getProgress(l.id) : null;
  el.innerHTML = `
    <div class="hero">
      <div>
        <h1>${greeting()}${l ? `, ${esc(l.name.split(' ')[0])}` : ''}!</h1>
        <p>WASSCE Robotics mock practice. Pick a topic or try a full paper.</p>
      </div>
      <div class="hero-actions">
        <a class="btn btn-accent btn-big" href="/mock">Full Paper 1 Mock</a>
        <a class="btn btn-big" href="/paper2">Paper 2 Practice</a>
      </div>
    </div>
    <section>
      <div class="page-head"><h2 style="margin:0">Topics</h2><a href="/progress" class="crumb">My progress →</a></div>
      <div class="grid">
        ${topics.map((t) => `
          <a class="topic-card" href="/topic/${t.id}">
            ${ring(prog?.topics[t.id]?.percent ?? 0, 66, 8)}
            <div>
              <div class="tnum">${t.icon} Topic ${t.id}</div>
              <div class="ttitle">${esc(t.short)}</div>
              <div class="muted small">${t.paper1.length} objective${t.paper1.length === 1 ? '' : 's'} · ${t.activities.length} activit${t.activities.length === 1 ? 'y' : 'ies'}</div>
            </div>
          </a>`).join('')}
      </div>
    </section>`;
}
