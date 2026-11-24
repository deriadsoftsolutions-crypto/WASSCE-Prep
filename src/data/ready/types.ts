/** Shapes of ready-made content, and small helpers for writing questions. */
import type { Block } from '../../firebase/lessons';
import type { Material } from '../../firebase/units';
import type { KeyEntry, Question, ShowResults } from '../../firebase/assessments';

/** Where an item belongs: STEM year and curriculum unit (units/{id}, e.g. u3-3-2). */
interface Placed { key: string; title: string; year: 1 | 2 | 3; unitId: string }

export interface ReadyLesson extends Placed {
  summary: string;
  topicId: number;
  blocks: Block[];
  /** Added to the unit's materials (skipped if one with the same title already exists). */
  materials: Omit<Material, 'id' | 'createdAt' | 'order'>[];
}

export interface ReadyTest extends Placed {
  /** When to use it, shown to the teacher in the picker */
  when: string;
  instructions: string;
  timeLimitMin: number;
  showResults: ShowResults;
  portfolioSection: 'tests' | 'semester';
  questions: Question[];
  answers: Record<string, KeyEntry>;
}

export interface ReadyAssignment extends Placed {
  when: string;
  instructions: string;
  maxMarks: number;
  allowText: boolean;
  allowFiles: boolean;
  portfolioSection: 'assignments' | 'projects';
}

/** Build question + answer-key pairs with ids q1, q2 ... */
export function build(items: { q: Omit<Question, 'id'>; k: KeyEntry }[]) {
  const questions: Question[] = [];
  const answers: Record<string, KeyEntry> = {};
  items.forEach((it, i) => { const id = `q${i + 1}`; questions.push({ id, ...it.q }); answers[id] = it.k; });
  return { questions, answers };
}
export const mcq = (text: string, options: string[], correct: number, explanation: string, marks = 1) => ({ q: { type: 'mcq' as const, text, options, marks }, k: { correct, explanation } });
export const num = (text: string, value: number, explanation: string, unit?: string, marks = 1) => ({ q: { type: 'number' as const, text, unit, marks }, k: { value, tolerance: 0.001, explanation } });
export const short = (text: string, model: string, marks: number) => ({ q: { type: 'short' as const, text, marks }, k: { model } });
