import topicsData from '../data/topics.json';
import type { Topic } from '../types';
import { esc } from '../lib/dom';
import { icon } from '../lib/icons';
import { ACTIVITIES, mountActivity } from '../activities';

const topics = topicsData as Topic[];

/** One activity on its own screen: back button, steps, the activity and a fixed action bar. */
export async function activityPage(el: HTMLElement, params: Record<string, string>) {
  const t = topics.find((x) => x.id === Number(params.id));
  const id = params.activity;
  if (!t || !t.activities.includes(id) || !ACTIVITIES[id]) {
    el.innerHTML = `<h1>Activity not found</h1><p><a href="/topic/${t?.id ?? ''}">Back to the topic</a></p>`;
    return;
  }
  const idx = t.activities.indexOf(id);
  const nextId = t.activities[idx + 1];
  const next = nextId
    ? { href: `/topic/${t.id}/${nextId}`, label: 'Next activity' }
    : { href: `/topic/${t.id}#questions`, label: 'Topic questions' };

  document.body.classList.add('focus-mode');
  el.innerHTML = `
    <div class="act-header">
      <a class="back" href="/topic/${t.id}" aria-label="Back to topic ${t.id}">${icon('back', 22)}</a>
      <div style="min-width:0">
        <div class="crumb-line">Topic ${t.id}, ${esc(t.short)}. Activity ${idx + 1} of ${t.activities.length}</div>
        <h1>${esc(ACTIVITIES[id].title)}</h1>
      </div>
    </div>
    <div data-act-host></div>`;
  const cleanup = await mountActivity(el.querySelector('[data-act-host]') as HTMLElement, id, t.id, { mode: 'focus', next });
  return () => {
    cleanup();
    document.body.classList.remove('focus-mode');
  };
}
