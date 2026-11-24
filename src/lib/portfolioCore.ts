/**
 * Learner portfolio: turns results and learner items into the Ministry's portfolio sections
 * (Year 2 Robotics Teacher Manual, Appendix A). Pure: no Firebase, no JSON imports,
 * so the unit tests can run it directly with Node.
 */

export type SectionId = 'assignments' | 'projects' | 'tests' | 'reflections' | 'semester' | 'other';

export const SECTIONS: { id: SectionId; title: string; max: number; hint: string }[] = [
  { id: 'assignments', title: 'Assignments and exercises', max: 10, hint: 'Assignments you hand in appear here. Add photos of class exercises from your notebook.' },
  { id: 'projects', title: 'Projects and case studies', max: 10, hint: 'Add photos of things you build, with a short description of what they do.' },
  { id: 'tests', title: 'Quizzes and tests', max: 10, hint: 'Tests, mocks and practice from this site appear here. Add photos of paper quizzes.' },
  { id: 'reflections', title: 'Reflective pieces', max: 5, hint: 'Write what you learned, what was hard and what you would do differently.' },
  { id: 'semester', title: 'Mid-semester and end-of-semester papers', max: 5, hint: 'Semester papers set on this site appear here. Add photos of your marked scripts.' },
  { id: 'other', title: 'Certificates, awards and other documents', max: 0, hint: 'Certificates, awards, testimonials and anything else that shows your work.' },
];

export interface PFile { key: string; name: string; size: number; type: string }

export interface PItem {
  id: string;
  section: SectionId;
  title: string;
  date: number;
  result?: string;
  description: string;
  files: PFile[];
  /** true when the item comes from the site (a result), so its score cannot be edited */
  auto: boolean;
  hidden: boolean;
  isFinal?: boolean;
  /** For automatic items: a link to the source, e.g. "/assignments/abc" */
  source?: string;
}

export type PStatus = 'building' | 'handed-in' | 'returned' | 'marked';

export interface PMeta {
  hidden: string[];
  notes: Record<string, string>;
  finalReflection: string;
  status: PStatus;
  submittedAt: number | null;
  updatedAt: number;
}

export const emptyMeta = (): PMeta => ({ hidden: [], notes: {}, finalReflection: '', status: 'building', submittedAt: null, updatedAt: 0 });

export type Year = 1 | 2 | 3;

export interface BuildInput {
  year: Year;
  /** Which STEM year a site result (by its time) belongs to. */
  yearOf: (ts: number) => Year;
  attempts: { id: string; kind: string; itemId: string; score: number; max: number; timestamp: number }[];
  submissions: {
    assignmentId: string; title: string; portfolioSection?: 'assignments' | 'projects'; submittedAt: number;
    files: PFile[]; text: string; mark?: { mark: number; maxMarks: number; comment: string };
  }[];
  testResults: { assessmentId: string; title: string; portfolioSection?: 'tests' | 'semester'; total: number; max: number; comment: string; releasedAt: number }[];
  items: (Omit<PItem, 'auto' | 'hidden'> & { year: number })[];
  meta: PMeta;
}

export interface BuiltSection { id: SectionId; title: string; max: number; items: PItem[] }
export interface Built { sections: BuiltSection[]; hiddenItems: PItem[] }

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

export function buildPortfolio(input: BuildInput): Built {
  const { year, yearOf, meta } = input;
  const all: PItem[] = [];
  const auto = (p: Omit<PItem, 'auto' | 'hidden' | 'description'>) =>
    all.push({ ...p, auto: true, hidden: false, description: meta.notes[p.id] ?? '' });

  for (const s of input.submissions) {
    if (yearOf(s.submittedAt) !== year) continue;
    auto({
      id: `asg:${s.assignmentId}`, section: s.portfolioSection === 'projects' ? 'projects' : 'assignments', title: s.title,
      date: s.submittedAt, files: s.files, source: `/assignments/${s.assignmentId}`,
      result: s.mark ? `${s.mark.mark} / ${s.mark.maxMarks}` : 'Handed in, not marked yet',
    });
  }
  for (const r of input.testResults) {
    if (yearOf(r.releasedAt) !== year) continue;
    auto({
      id: `test:${r.assessmentId}`, section: r.portfolioSection === 'semester' ? 'semester' : 'tests', title: r.title,
      date: r.releasedAt, files: [], source: `/tests/${r.assessmentId}`, result: `${r.total} / ${r.max}`,
    });
  }
  const practice: BuildInput['attempts'] = [];
  for (const a of input.attempts) {
    if (yearOf(a.timestamp) !== year) continue;
    if (a.kind === 'mock') auto({ id: `mock:${a.id}`, section: 'tests', title: 'Paper 1 mock', date: a.timestamp, files: [], result: `${a.score} / ${a.max}` });
    else if (a.kind === 'paper2') {
      const q = a.itemId.replace(/^paper2:/, '');
      auto({ id: `p2:${a.id}`, section: 'tests', title: `Paper 2 practice, ${q}`, date: a.timestamp, files: [], result: `${a.score} / ${a.max} (self-marked)` });
    } else if (a.kind === 'topic-quiz' || a.kind === 'activity') practice.push(a);
  }
  if (practice.length) {
    const best = new Map<string, number>();
    for (const a of practice) best.set(a.itemId, Math.max(best.get(a.itemId) ?? 0, a.max ? a.score / a.max : 0));
    const avg = Math.round((100 * [...best.values()].reduce((x, y) => x + y, 0)) / best.size);
    auto({
      id: `practice:y${year}`, section: 'tests', title: 'Practice record: topic quizzes and activities',
      date: Math.max(...practice.map((a) => a.timestamp)), files: [], source: '/progress',
      result: `${practice.length} quizzes and activities, ${plural(best.size, 'different item')}, average best ${avg}%`,
    });
  }
  for (const it of input.items) {
    if (it.year !== year) continue;
    const { year: _y, ...rest } = it;
    all.push({ ...rest, auto: false, hidden: false });
  }

  const hiddenSet = new Set(meta.hidden);
  const hiddenItems: PItem[] = [];
  const sections: BuiltSection[] = SECTIONS.map((s) => ({ id: s.id, title: s.title, max: s.max, items: [] }));
  for (const it of all.sort((a, b) => a.date - b.date)) {
    if (hiddenSet.has(it.id)) hiddenItems.push({ ...it, hidden: true });
    else sections.find((s) => s.id === it.section)!.items.push(it);
  }
  return { sections, hiddenItems };
}

/** Numbers visible items "section.item" (1.1, 1.2, 4.1 ...) for the table of contents. */
export function numberItems(sections: BuiltSection[]): { num: string; item: PItem }[] {
  return sections.flatMap((s, si) => s.items.map((item, ii) => ({ num: `${si + 1}.${ii + 1}`, item })));
}

/** Total of the teacher's section marks, each clamped to its Ministry maximum (out of 40). */
export function markTotal(scores: Partial<Record<SectionId, number>>): number {
  return SECTIONS.reduce((t, s) => t + Math.min(s.max, Math.max(0, Number(scores[s.id]) || 0)), 0);
}
