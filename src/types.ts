export type Letter = 'A' | 'B' | 'C' | 'D';

export interface Topic {
  id: number;
  title: string;
  short: string;
  icon: string;
  summary: string;
  keyIdeas: string[];
  paper1: number[];
  paper2: string[];
  activities: string[];
}

export interface Paper1Question {
  n: number;
  topic: number;
  question: string;
  options: Record<Letter, string>;
  answer: Letter;
  explanation: string;
}

export interface Learner {
  id: string;
  name: string;
  className: string;
  createdAt: number;
}

export type AttemptKind = 'topic-quiz' | 'mock' | 'activity' | 'paper2' | 'lesson';

/** One finished attempt at a quiz, mock, activity or Paper 2 question. */
export interface Attempt {
  id: string;
  learnerId: string;
  learnerName: string;
  className: string;
  kind: AttemptKind;
  /** Stable id for the thing attempted, e.g. "quiz:7", "activity:logic-sim", "mock:paper1", "paper2:Q4". */
  itemId: string;
  topicId?: number;
  score: number;
  max: number;
  timestamp: number;
  durationSec?: number;
  /** Optional extra info. For mocks: { perTopic: { [topicId]: { correct, total } } }. */
  details?: Record<string, unknown>;
}

export interface ItemProgress {
  itemId: string;
  /** Best score as a fraction 0..1 */
  best: number;
  /** Most recent score as a fraction 0..1 */
  last: number;
  attempts: number;
  lastAt: number;
  /** Topic quizzes only: questions answered at least once, answered correctly at least once, and total in the topic. */
  answered?: number;
  correct?: number;
  total?: number;
}

export interface TopicProgress {
  topicId: number;
  /**
   * 0..100, average over the topic's components (unattempted ones count as 0):
   * the topic quiz, the best Paper 1 mock score on this topic's questions, and each activity.
   */
  percent: number;
  items: Record<string, ItemProgress>;
  /** Paper 1 objective questions answered for this topic (topic quizzes and mocks combined) */
  mcqCorrect: number;
  mcqTotal: number;
}

export interface Progress {
  learnerId: string;
  topics: Record<number, TopicProgress>;
  mocks: { score: number; max: number; timestamp: number; durationSec?: number }[];
  paper2: Record<string, ItemProgress>;
  totalAttempts: number;
}

export interface AttemptFilter {
  learnerId?: string;
  kind?: AttemptKind;
  itemId?: string;
}
