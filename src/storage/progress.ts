import type { Attempt, ItemProgress, Progress, Topic } from '../types';

/**
 * The components that make up a topic's score:
 *   quiz:{id}      the topic's Paper 1 questions answered on the topic page
 *   mock:{id}      the best Paper 1 mock result on this topic's questions
 *   activity:{x}   each interactive activity
 */
export function topicItemIds(topic: Topic): string[] {
  return [`quiz:${topic.id}`, `mock:${topic.id}`, ...topic.activities.map((a) => `activity:${a}`)];
}

function bump(map: Record<string, ItemProgress>, itemId: string, frac: number, at: number) {
  const cur = map[itemId];
  if (!cur) {
    map[itemId] = { itemId, best: frac, last: frac, attempts: 1, lastAt: at };
    return;
  }
  cur.attempts++;
  cur.best = Math.max(cur.best, frac);
  if (at >= cur.lastAt) {
    cur.last = frac;
    cur.lastAt = at;
  }
}

/**
 * Topic quiz answers, one entry per question answered.
 * Current format: one attempt per question (score 0 or 1, details.n = question number).
 * Older format (before per-question saving): one attempt per run with details.answers.
 */
function quizAnswers(a: Attempt): { n: number; correct: boolean }[] {
  const d = a.details ?? {};
  if (typeof d.n === 'number') return [{ n: d.n, correct: a.score >= 1 }];
  const list = (d.answers ?? []) as { n: number; chosen: string | null; correct: boolean }[];
  return list.filter((x) => x.chosen !== null).map((x) => ({ n: x.n, correct: x.correct }));
}

/**
 * Pure function shared by every adapter so that progress is calculated the
 * same way whether data lives in localStorage or Firebase.
 */
export function computeProgress(learnerId: string, attempts: Attempt[], topics: Topic[]): Progress {
  const mine = attempts.filter((a) => a.learnerId === learnerId).sort((a, b) => a.timestamp - b.timestamp);
  const items: Record<string, ItemProgress> = {};
  const paper2: Record<string, ItemProgress> = {};
  const mcq: Record<number, { c: number; t: number }> = {};
  const mocks: Progress['mocks'] = [];
  /** topicId -> question number -> { ever correct } */
  const quiz: Record<number, Map<number, boolean>> = {};
  const quizSeen: Record<number, { count: number; lastAt: number }> = {};

  for (const a of mine) {
    if (a.kind === 'paper2') bump(paper2, a.itemId, a.max > 0 ? a.score / a.max : 0, a.timestamp);
    else if (a.kind === 'activity') bump(items, a.itemId, a.max > 0 ? a.score / a.max : 0, a.timestamp);

    if (a.kind === 'topic-quiz' && a.topicId != null) {
      const qm = (quiz[a.topicId] ??= new Map());
      const seen = (quizSeen[a.topicId] ??= { count: 0, lastAt: 0 });
      seen.count++;
      seen.lastAt = a.timestamp;
      const m = (mcq[a.topicId] ??= { c: 0, t: 0 });
      for (const ans of quizAnswers(a)) {
        qm.set(ans.n, (qm.get(ans.n) ?? false) || ans.correct);
        m.t++;
        if (ans.correct) m.c++;
      }
    }
    if (a.kind === 'mock') {
      mocks.push({ score: a.score, max: a.max, timestamp: a.timestamp, durationSec: a.durationSec });
      const per = (a.details?.perTopic ?? {}) as Record<string, { correct: number; total: number }>;
      for (const [tid, v] of Object.entries(per)) {
        const m = (mcq[Number(tid)] ??= { c: 0, t: 0 });
        m.c += v.correct;
        m.t += v.total;
        if (v.total > 0) bump(items, `mock:${tid}`, v.correct / v.total, a.timestamp);
      }
    }
  }

  const topicMap: Progress['topics'] = {};
  for (const t of topics) {
    const qm = quiz[t.id];
    if (qm && qm.size) {
      const total = t.paper1.length;
      const correct = [...qm.values()].filter(Boolean).length;
      const frac = total ? correct / total : 0;
      items[`quiz:${t.id}`] = {
        itemId: `quiz:${t.id}`, best: frac, last: frac, attempts: quizSeen[t.id].count, lastAt: quizSeen[t.id].lastAt,
        answered: qm.size, correct, total,
      };
    }
    const ids = topicItemIds(t);
    const tItems: Record<string, ItemProgress> = {};
    let sum = 0;
    for (const id of ids) {
      if (items[id]) {
        tItems[id] = items[id];
        sum += items[id].best;
      }
    }
    topicMap[t.id] = {
      topicId: t.id,
      percent: Math.round((sum / ids.length) * 100),
      items: tItems,
      mcqCorrect: mcq[t.id]?.c ?? 0,
      mcqTotal: mcq[t.id]?.t ?? 0,
    };
  }

  mocks.sort((a, b) => b.timestamp - a.timestamp);
  return { learnerId, topics: topicMap, mocks, paper2, totalAttempts: mine.length };
}
