import type { Attempt, ItemProgress, Progress, Topic } from '../types';

/** The progress "items" that make up a topic's ring: its quiz plus each activity. */
export function topicItemIds(topic: Topic): string[] {
  return [`quiz:${topic.id}`, ...topic.activities.map((a) => `activity:${a}`)];
}

function bump(map: Record<string, ItemProgress>, a: Attempt) {
  const frac = a.max > 0 ? a.score / a.max : 0;
  const cur = map[a.itemId];
  if (!cur) {
    map[a.itemId] = { itemId: a.itemId, best: frac, last: frac, attempts: 1, lastAt: a.timestamp };
    return;
  }
  cur.attempts++;
  cur.best = Math.max(cur.best, frac);
  if (a.timestamp >= cur.lastAt) {
    cur.last = frac;
    cur.lastAt = a.timestamp;
  }
}

/**
 * Pure function shared by every adapter so that progress is calculated the
 * same way whether data lives in localStorage or Firebase.
 */
export function computeProgress(learnerId: string, attempts: Attempt[], topics: Topic[]): Progress {
  const mine = attempts.filter((a) => a.learnerId === learnerId);
  const items: Record<string, ItemProgress> = {};
  const paper2: Record<string, ItemProgress> = {};
  const mcq: Record<number, { c: number; t: number }> = {};
  const mocks: Progress['mocks'] = [];

  for (const a of mine) {
    if (a.kind === 'paper2') bump(paper2, a);
    else if (a.kind !== 'mock') bump(items, a);

    if (a.kind === 'topic-quiz' && a.topicId != null) {
      const m = (mcq[a.topicId] ??= { c: 0, t: 0 });
      m.c += a.score;
      m.t += a.max;
    }
    if (a.kind === 'mock') {
      mocks.push({ score: a.score, max: a.max, timestamp: a.timestamp, durationSec: a.durationSec });
      const per = (a.details?.perTopic ?? {}) as Record<string, { correct: number; total: number }>;
      for (const [tid, v] of Object.entries(per)) {
        const m = (mcq[Number(tid)] ??= { c: 0, t: 0 });
        m.c += v.correct;
        m.t += v.total;
      }
    }
  }

  const topicMap: Progress['topics'] = {};
  for (const t of topics) {
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
