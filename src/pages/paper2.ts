import p2 from '../data/paper2.json';
import { esc } from '../lib/dom';
import { feedbackHTML } from '../lib/ui';
import { learner, saveResult } from '../lib/session';
import { storage } from '../storage';
import { mountActivity } from '../activities';

interface Part {
  id: string; label: string; topic: number; marks: number;
  type: 'written' | 'calc' | 'activity';
  calcId?: string; activity?: string;
  text: string; model: string;
  points: { text: string; marks: number }[];
}
interface Question { id: string; compulsory?: boolean; title: string; stem: string; parts: Part[] }

const QUESTIONS = (p2 as { questions: Question[] }).questions;
const totalMarks = (q: Question) => q.parts.reduce((s, p) => s + p.marks, 0);
const DRAFT_KEY = 'wassce.p2drafts.v1';

function drafts(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}'); } catch { return {}; }
}
function saveDraft(key: string, text: string) {
  try { const d = drafts(); d[key] = text; localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* ignore */ }
}

async function lastMarks(): Promise<Record<string, number>> {
  const l = learner();
  if (!l) return {};
  const prog = await storage.getProgress(l.id);
  const out: Record<string, number> = {};
  for (const [id, it] of Object.entries(prog.paper2)) out[id] = it.last;
  return out;
}

export async function paper2ListPage(el: HTMLElement) {
  const marks = await lastMarks();
  el.innerHTML = `
    <div class="page-head"><h1>Paper 2 Practice</h1></div>
    <p>${esc((p2 as { instructions: string }).instructions)}</p>
    <div class="qlist">
      ${QUESTIONS.map((q) => {
        const tot = totalMarks(q);
        const got = q.parts.reduce((s, p) => { const f = marks[`paper2:${q.id}:${p.id}`]; return s + (f !== undefined ? Math.round(f * p.marks) : 0); }, 0);
        const tried = q.parts.some((p) => marks[`paper2:${q.id}:${p.id}`] !== undefined);
        return `<a class="topic-card" href="/paper2/${q.id}" style="flex-direction:column;align-items:flex-start">
          <div class="row" style="width:100%"><b style="font-size:1.3rem">${q.id.replace('Q', 'Question ')}</b><span class="spacer"></span>
            ${q.compulsory ? '<span class="pill accent">Compulsory</span>' : ''}</div>
          <div class="ttitle">${esc(q.title)}</div>
          <div class="muted small">${q.parts.length} parts · ${tot} marks${tried ? ` · <span class="pill ok">your marks: ${got} / ${tot}</span>` : ''}</div>
        </a>`;
      }).join('')}
    </div>`;
}

export async function paper2QuestionPage(el: HTMLElement, params: Record<string, string>) {
  const q = QUESTIONS.find((x) => x.id.toLowerCase() === params.id.toLowerCase());
  if (!q) { el.innerHTML = '<h1>Question not found</h1><p><a href="/paper2">Back to Paper 2</a></p>'; return; }
  const idx = QUESTIONS.indexOf(q);
  const marks = await lastMarks();
  const d = drafts();
  const l = learner();
  const draftKey = (p: Part) => `${l?.id ?? ''}|${q.id}:${p.id}`;
  /** Ticked marking points are kept on the device too, so the checklist survives a reload. */
  const ticks = (p: Part): number[] => { try { return JSON.parse(d[`${draftKey(p)}#ticks`] ?? '[]') as number[]; } catch { return []; } };
  const tickTotal = (p: Part) => Math.min(p.marks, ticks(p).reduce((sum, k) => sum + (p.points[k]?.marks ?? 0), 0));

  el.innerHTML = `
    <a class="crumb" href="/paper2">← All Paper 2 questions</a>
    <div class="page-head"><h1>${q.id.replace('Q', 'Question ')}: ${esc(q.title)}</h1>
      <span class="pill ${q.compulsory ? 'accent' : ''}">${q.compulsory ? 'Compulsory' : 'Optional'} · ${totalMarks(q)} marks</span></div>
    <div class="card" style="background:var(--primary-soft)"><p style="margin:0;font-size:1.1rem">${esc(q.stem)}</p></div>
    ${q.parts.map((p) => {
      const prev = marks[`paper2:${q.id}:${p.id}`];
      return `
      <div class="card" data-part="${p.id}">
        <div class="part-head"><h3 style="margin:0">${esc(p.label)} ${esc(p.text)}</h3><span class="marks">[${p.marks}]</span></div>
        ${prev !== undefined ? `<p class="small" style="margin:6px 0 0"><span class="pill ok">Last self-mark: ${Math.round(prev * p.marks)} / ${p.marks}</span></p>` : ''}
        <label class="field" style="margin-top:12px"><span>Your answer</span>
          <textarea data-draft="${esc(draftKey(p))}" placeholder="Write your answer here before revealing the model answer.">${esc(d[draftKey(p)] ?? '')}</textarea></label>
        ${p.type === 'calc' ? `<button class="btn btn-accent" data-tool="calc-checker" data-param="${esc(p.calcId ?? '')}" type="button">🧮 Check my working step by step</button>` : ''}
        ${p.type === 'activity' ? `<button class="btn btn-accent" data-tool="${esc(p.activity ?? '')}" type="button">🧪 Open the interactive activity</button>` : ''}
        <div data-toolhost></div>
        <div class="row" style="margin-top:12px"><button class="btn btn-primary" data-reveal type="button">${ticks(p).length ? 'Hide model answer' : 'Reveal model answer'}</button></div>
        <div data-modelbox ${ticks(p).length ? '' : 'hidden'}>
          <div class="model"><b>Model answer</b><p style="white-space:pre-line;margin:6px 0 0">${esc(p.model)}</p></div>
          <p style="margin:14px 0 6px"><b>Self-mark: tick each marking point you got</b></p>
          ${p.points.map((pt, k) => `<label class="check"><input type="checkbox" data-pt="${k}" data-m="${pt.marks}" ${ticks(p).includes(k) ? 'checked' : ''} /><span>${esc(pt.text)} <b>(${pt.marks})</b></span></label>`).join('')}
          <div class="row" style="margin-top:8px"><b data-tally>${tickTotal(p)} / ${p.marks}</b><span class="spacer"></span>
            <button class="btn btn-primary" data-savemarks type="button">Save my marks</button></div>
          <p class="muted small" style="margin:6px 0 0">Your marks save automatically when you tick or untick a point.</p>
          <div data-fb></div>
        </div>
      </div>`;
    }).join('')}
    <div class="row" style="justify-content:space-between">
      ${idx > 0 ? `<a class="btn" href="/paper2/${QUESTIONS[idx - 1].id}">← ${QUESTIONS[idx - 1].id}</a>` : '<span></span>'}
      ${idx < QUESTIONS.length - 1 ? `<a class="btn btn-primary" href="/paper2/${QUESTIONS[idx + 1].id}">${QUESTIONS[idx + 1].id} →</a>` : '<a class="btn btn-primary" href="/progress">My progress →</a>'}
    </div>`;

  const cleanups: (() => void)[] = [];
  const timers = new Map<string, number>();
  const lastSaved = new Map<string, number>();
  /** Saves still waiting for their timer; run them at once if the learner leaves the page. */
  const pending = new Map<string, () => void>();
  const flushAll = () => { pending.forEach((flush) => flush()); pending.clear(); };
  window.addEventListener('pagehide', flushAll);
  cleanups.push(() => { flushAll(); window.removeEventListener('pagehide', flushAll); });

  const setSaveState = (card: HTMLElement, state: 'pending' | 'saved') => {
    const b = card.querySelector('[data-savemarks]') as HTMLButtonElement;
    b.textContent = state === 'saved' ? 'Saved ✓' : 'Save my marks';
    b.classList.toggle('btn-primary', state !== 'saved');
  };

  const saveMarks = async (card: HTMLElement, p: Part) => {
    clearTimeout(timers.get(p.id));
    pending.delete(p.id);
    const got = tally(card, p);
    if (lastSaved.get(p.id) !== got) {
      lastSaved.set(p.id, got);
      await saveResult({ kind: 'paper2', itemId: `paper2:${q.id}:${p.id}`, topicId: p.topic, score: got, max: p.marks });
    }
    setSaveState(card, 'saved');
    (card.querySelector('[data-fb]') as HTMLElement).innerHTML = feedbackHTML(got === p.marks ? 'ok' : 'info', `Saved: ${got} / ${p.marks}`,
      got === p.marks ? '<p>Full marks!</p>' : '<p>Compare your answer with the model answer and note the points you missed.</p>');
  };
  const tally = (card: HTMLElement, p: Part) => {
    const got = Array.from(card.querySelectorAll<HTMLInputElement>('[data-pt]:checked')).reduce((s, c) => s + Number(c.dataset.m), 0);
    return Math.min(got, p.marks);
  };

  el.addEventListener('input', (e) => {
    const t = e.target as HTMLTextAreaElement;
    if (t.dataset.draft) saveDraft(t.dataset.draft, t.value);
  });
  el.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.dataset.pt === undefined) return;
    const card = t.closest<HTMLElement>('[data-part]')!;
    const p = q.parts.find((x) => x.id === card.dataset.part)!;
    (card.querySelector('[data-tally]') as HTMLElement).textContent = `${tally(card, p)} / ${p.marks}`;
    const ticked = Array.from(card.querySelectorAll<HTMLInputElement>('[data-pt]:checked')).map((c) => Number(c.dataset.pt));
    saveDraft(`${draftKey(p)}#ticks`, JSON.stringify(ticked));
    setSaveState(card, 'pending');
    // Auto-save shortly after the last change (so ticking three boxes saves once, not three times).
    clearTimeout(timers.get(p.id));
    pending.set(p.id, () => void saveMarks(card, p));
    timers.set(p.id, window.setTimeout(() => void saveMarks(card, p), 900));
  });
  el.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    const card = t.closest<HTMLElement>('[data-part]');
    if (!card) return;
    const p = q.parts.find((x) => x.id === card.dataset.part)!;
    if (t.closest('[data-reveal]')) {
      const box = card.querySelector('[data-modelbox]') as HTMLElement;
      box.hidden = !box.hidden;
      (t.closest('[data-reveal]') as HTMLElement).textContent = box.hidden ? 'Reveal model answer' : 'Hide model answer';
    }
    const tool = t.closest<HTMLElement>('[data-tool]');
    if (tool) {
      const host = card.querySelector('[data-toolhost]') as HTMLElement;
      if (host.childElementCount) { host.innerHTML = ''; tool.textContent = tool.dataset.label!; return; }
      tool.dataset.label = tool.textContent ?? '';
      tool.textContent = 'Close the activity';
      const div = document.createElement('div');
      div.style.marginTop = '12px';
      host.appendChild(div);
      cleanups.push(await mountActivity(div, tool.dataset.tool!, p.topic, { param: tool.dataset.param || undefined }));
    }
    if (t.closest('[data-savemarks]')) await saveMarks(card, p);
  });
  return () => cleanups.forEach((c) => c());
}
