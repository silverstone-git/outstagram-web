// Exam engine ported from pariksha (src/utils.ts + ExamScreen scoring) so scores match exactly.
import { API_BASE_URL } from '../../services/api';
import type {
  Question, ExamConfig, ExamPreset, ExamSection, ExamSettings, ExamResult, ShuffledQuestion,
  UserAnswer, SWOTAnalysis,
} from './types';

export interface DraftAnswer {
  label?: number | null; // MCQ
  labels?: number[]; // MSQ
  text?: string; // NAT
  isFlagged?: boolean;
}

/** Unbiased Fisher-Yates (pariksha used sort(random), which skews orderings). */
export const shuffleArray = <T,>(array: T[]): T[] => {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((v) => v.toString().padStart(2, '0')).join(':');
};

export const resolveImagePath = (path: string | undefined): string => {
  if (!path) return '';
  if (/^(https?:|data:)/.test(path)) return path;
  const publicUrl = import.meta.env.VITE_API_R2_PUBLIC_ENDPOINT || 'https://pub-682f1a94c94443278f61ec7ca3dadaec.r2.dev';
  return `${publicUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
};

/** Legacy flat-question exams become a single section; ids and types are filled in. */
export const normalizeExamConfig = (config: ExamConfig): ExamConfig => {
  if (config.sections && config.sections.length > 0) {
    return {
      ...config,
      sections: config.sections.map((section, sIdx) => {
        const sectionId = section.id || `section-${sIdx}`;
        return {
          ...section,
          id: sectionId,
          questions: section.questions.map((q, qIdx) => ({ ...q, id: q.id || `${sectionId}-q-${qIdx}`, type: q.type || 'MCQ' })),
        };
      }),
    };
  }
  const normalizedSection: ExamSection = {
    id: 'default-section',
    name: 'General',
    questions: (config.questions || []).map((q, idx) => ({ ...q, id: q.id || `q-${idx}`, type: q.type || 'MCQ' })),
    marking: { positive: config.settings?.positiveMarking ?? 1, negative: config.settings?.negativeMarking ?? 0 },
  };
  return { ...config, sections: [normalizedSection] };
};

export const isQuestionCorrect = (
  question: Question,
  answer: { selectedOptionLabel?: number | null; selectedOptionLabels?: number[]; enteredAnswer?: string },
): boolean => {
  switch (question.type || 'MCQ') {
    case 'MCQ':
      return answer.selectedOptionLabel === question.answer_label;
    case 'MSQ': {
      if (!answer.selectedOptionLabels || !question.answer_labels) return false;
      const u = [...answer.selectedOptionLabels].sort();
      const c = [...question.answer_labels].sort();
      return u.length === c.length && u.every((v, i) => v === c[i]);
    }
    case 'NAT': {
      if (!answer.enteredAnswer) return false;
      const n = parseFloat(answer.enteredAnswer);
      if (isNaN(n)) return false;
      if (question.answer_range) return n >= question.answer_range.min && n <= question.answer_range.max;
      if (question.answer_value) return parseFloat(question.answer_value) === n;
      return false;
    }
    default:
      return false;
  }
};

export const isAttempted = (a?: DraftAnswer): boolean =>
  !!a && (a.label != null || (!!a.labels && a.labels.length > 0) || (a.text !== undefined && a.text !== ''));

/** Builds the shuffled question list the runner shows (same rules as pariksha). */
export const prepareQuestions = (config: ExamConfig): ShuffledQuestion[] => {
  let all: ShuffledQuestion[] = [];
  config.sections?.forEach((section) => {
    const qs = config.settings?.shuffleQuestions ? shuffleArray(section.questions) : [...section.questions];
    all.push(...qs.map((q, idx) => ({
      ...q,
      id: q.id || `${section.id}-q-${idx}`,
      shuffledOptions: q.options && config.settings?.shuffleOptions ? shuffleArray(q.options) : [...(q.options || [])],
    }) as ShuffledQuestion));
  });
  if (config.settings?.questionCount && config.settings.questionCount < all.length) all = all.slice(0, config.settings.questionCount);
  return all;
};

export const sectionOf = (config: ExamConfig, questionId: string): ExamSection | undefined =>
  config.sections?.find((s) => s.questions.some((q) => q.id === questionId));

export const maxScore = (config: ExamConfig, questions: ShuffledQuestion[]): number =>
  questions.reduce((sum, q) => sum + (sectionOf(config, q.id)?.marking.positive ?? 1), 0);

const generateSwot = (r: ExamResult): SWOTAnalysis => {
  const swot: SWOTAnalysis = { strengths: [], weaknesses: [], opportunities: [], threats: [] };
  const topics = Object.keys(r.timePerTopic);
  if (topics.length === 0) return swot;
  const avg = r.totalQuestions > 0 ? r.totalTimeTaken / r.totalQuestions : 0;
  topics.forEach((topic) => {
    const acc = (r.accuracyPerTopic[topic] || 0) * 100;
    const n = r.originalQuestions.filter((q) => q.topic === topic).length;
    const perQ = n > 0 ? (r.timePerTopic[topic] || 0) / n : 0;
    const high = acc >= 80, low = acc <= 50, fast = perQ < avg, slow = perQ > avg * 1.5;
    if (high && fast) swot.strengths.push(`${topic}: Mastered. High accuracy with excellent pace.`);
    else if (low && slow) swot.weaknesses.push(`${topic}: Conceptual gaps. Low accuracy and slow speed need fundamental review.`);
    else if (high && slow) swot.opportunities.push(`${topic}: Speed practice. Good accuracy, but reduce time per question.`);
    else if (low && fast) swot.threats.push(`${topic}: Accuracy risk. Low accuracy at speed suggests guessing.`);
  });
  if (!swot.strengths.length) swot.strengths.push('No standout strengths identified yet. Keep practicing!');
  if (!swot.weaknesses.length) swot.weaknesses.push('No major conceptual weaknesses identified. Maintain consistency.');
  if (!swot.opportunities.length) swot.opportunities.push('Focus on increasing speed in topics where you have good accuracy.');
  if (!swot.threats.length) swot.threats.push("Avoid guessing when you're moving quickly through questions.");
  return swot;
};

/** Pariksha's scoring: per-section marking, negative marks, and maxAttempts caps. */
export const scoreExam = (
  config: ExamConfig, questions: ShuffledQuestion[], answers: Record<string, DraftAnswer>,
  questionTimers: Record<string, number>, startedAt: number,
): ExamResult => {
  const processed: UserAnswer[] = questions.map((q) => {
    const a = answers[q.id] || {};
    return {
      questionId: q.id, type: q.type || 'MCQ',
      selectedOptionLabel: a.label ?? null, selectedOptionLabels: a.labels, enteredAnswer: a.text,
      isCorrect: isQuestionCorrect(q, { selectedOptionLabel: a.label, selectedOptionLabels: a.labels, enteredAnswer: a.text }),
      timeSpent: Math.round(questionTimers[q.id] || 0), isFlagged: a.isFlagged,
    };
  });
  let totalScore = 0, totalCorrect = 0;
  const sectionScores: Record<string, number> = {};
  config.sections?.forEach((section) => {
    let score = 0, correct = 0, attempted = 0;
    const ids = new Set(section.questions.map((q) => q.id));
    processed.filter((p) => ids.has(p.questionId)).forEach((p) => {
      const tried = p.selectedOptionLabel != null || (p.selectedOptionLabels?.length ?? 0) > 0 || (p.enteredAnswer !== undefined && p.enteredAnswer !== '');
      if (!tried) return;
      if (section.maxAttempts && attempted >= section.maxAttempts) return;
      attempted++;
      if (p.isCorrect) { correct++; score += section.marking.positive; } else score -= section.marking.negative;
    });
    sectionScores[section.id] = score;
    totalScore += score;
    totalCorrect += correct;
  });
  const perTopic: Record<string, number> = {}, accuracyPerTopic: Record<string, number> = {}, timePerTopic: Record<string, number> = {};
  questions.forEach((q) => {
    const p = processed.find((x) => x.questionId === q.id);
    perTopic[q.topic] = (perTopic[q.topic] || 0) + 1;
    accuracyPerTopic[q.topic] = (accuracyPerTopic[q.topic] || 0) + (p?.isCorrect ? 1 : 0);
    timePerTopic[q.topic] = (timePerTopic[q.topic] || 0) + (questionTimers[q.id] || 0);
  });
  Object.keys(accuracyPerTopic).forEach((t) => { accuracyPerTopic[t] = perTopic[t] ? accuracyPerTopic[t] / perTopic[t] : 0; });
  const result: ExamResult = {
    id: `res-${Date.now()}`, examName: config.name, date: Date.now(), score: totalScore,
    totalQuestions: questions.length, correctAnswers: totalCorrect, incorrectAnswers: questions.length - totalCorrect,
    accuracy: questions.length ? (totalCorrect / questions.length) * 100 : 0,
    totalTimeTaken: (Date.now() - startedAt) / 1000, timePerTopic, accuracyPerTopic, answers: processed,
    originalQuestions: questions, sectionScores, originalConfig: config,
    swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
  };
  result.swot = generateSwot(result);
  return result;
};

// --- presets (question bank sampling), from pariksha -------------------------------------

export const SUBJECT_GROUPS: Record<string, string[]> = {
  'Quantum Mechanics': ['Foundations of Quantum Mechanics', 'Schrödinger Equation', 'Angular Momentum', 'Hydrogen Atom', 'Approximation Methods', 'Scattering Theory'],
  'Electromagnetic Theory': ['Magnetostatics', 'Electrodynamics', 'Electromagnetic Waves', 'Waveguides and Cavities', 'Radiation'],
  'Thermodynamics & Statistical': ['Laws of Thermodynamics', 'Statistical Ensembles', 'Quantum Statistics', 'Random Walks & Ising Model'],
  'Mathematical Physics': ['Complex Analysis', 'Linear Algebra', 'Differential Equations', 'Fourier & Laplace Transforms', 'Numerical Methods'],
  'Classical Mechanics': ['Constraints', 'Lagrangian Dynamics', 'Hamiltonian Dynamics', 'Symmetry and Conservation Laws', 'Central Force Motion', 'Scattering', 'Small Oscillations', 'Rigid Body Dynamics', 'Canonical Transformations', 'Poisson Brackets', 'Kepler Problems', 'Special Theory of Relativity', 'Phase Space Dynamics', 'Action-Angle Variables', 'Non-Inertial Frames', 'Hamilton-Jacobi Theory'],
  'Solid State Physics': ['Condensed Matter'],
  'Atomic & Molecular': ['Atomic Physics', 'Molecular Physics'],
  'Nuclear & Particle': ['Nuclear Physics', 'Particle Physics'],
  Electronics: ['Analog Electronics', 'Digital Electronics'],
};

type StdPreset = Exclude<ExamPreset, 'CUSTOM'>;
const PATTERNS: Record<StdPreset, Record<string, number>> = {
  GATE: { 'Quantum Mechanics': 10, 'Electromagnetic Theory': 9, 'Thermodynamics & Statistical': 9, 'Mathematical Physics': 6, 'Classical Mechanics': 6, 'Solid State Physics': 6, 'Atomic & Molecular': 5, 'Nuclear & Particle': 5, Electronics: 5 },
  CSIR_NET: { 'Mathematical Physics': 10, 'Quantum Mechanics': 10, 'Electromagnetic Theory': 9, 'Classical Mechanics': 8, 'Thermodynamics & Statistical': 7, 'Solid State Physics': 5, Electronics: 5, 'Nuclear & Particle': 5, 'Atomic & Molecular': 4 },
  TIFR_GS: { 'Quantum Mechanics': 9, 'Classical Mechanics': 7, 'Electromagnetic Theory': 7, 'Thermodynamics & Statistical': 7, 'Mathematical Physics': 6, Electronics: 4 },
  BARC_OCES: { 'Quantum Mechanics': 18, 'Electromagnetic Theory': 18, 'Thermodynamics & Statistical': 18, 'Classical Mechanics': 11, 'Nuclear & Particle': 11, 'Solid State Physics': 11, 'Mathematical Physics': 6, Electronics: 4, 'Atomic & Molecular': 3 },
};

export const PRESETS: { id: StdPreset; name: string; blurb: string; minutes: number }[] = [
  { id: 'GATE', name: 'GATE Physics', blurb: '65 Qs · 1 & 2 mark · −⅓ negative', minutes: 180 },
  { id: 'CSIR_NET', name: 'CSIR NET', blurb: 'Part B + C · Part C best 20', minutes: 180 },
  { id: 'TIFR_GS', name: 'TIFR GS', blurb: '40 Qs · +3 / −1', minutes: 180 },
  { id: 'BARC_OCES', name: 'BARC OCES', blurb: '100 Qs · +3 / −1', minutes: 120 },
];

/** Quick practice: n questions from one subject group, +1/0. */
export const SUBJECTS = Object.keys(SUBJECT_GROUPS);

const sampleTopic = async (topic: string, count: number): Promise<Question[]> => {
  const slug = topic.replace(/ /g, '_').toLowerCase();
  try {
    const r = await fetch(`${API_BASE_URL}/api/question_bank/sample?topic=${encodeURIComponent(slug)}&count=${count}`);
    return r.ok ? ((await r.json()) as Question[]) : [];
  } catch {
    return [];
  }
};

const sampleGroups = async (pattern: Record<string, number>): Promise<Question[]> => {
  const jobs: Promise<Question[]>[] = [];
  for (const [group, count] of Object.entries(pattern)) {
    const topics = SUBJECT_GROUPS[group] || [];
    if (!topics.length) continue;
    const per = Math.ceil(count / topics.length);
    topics.forEach((t) => jobs.push(sampleTopic(t, per)));
  }
  return (await Promise.all(jobs)).flat();
};

export const generatePresetExam = async (preset: StdPreset): Promise<ExamConfig> => {
  const pattern = PATTERNS[preset];
  const total = Object.values(pattern).reduce((a, b) => a + b, 0);
  const pool = shuffleArray(await sampleGroups(pattern)).slice(0, total);
  const settings = (extra: Partial<ExamSettings> = {}): ExamSettings =>
    ({ timerHours: 3, timerMinutes: 0, shuffleQuestions: true, shuffleOptions: true, ...extra });
  if (preset === 'GATE') {
    return { name: 'GATE Physics Mock', settings: settings(), sections: [
      { id: 'gate-physics-1m', name: '1 Mark', questions: pool.slice(0, 25), marking: { positive: 1, negative: 0.33 } },
      { id: 'gate-physics-2m', name: '2 Mark', questions: pool.slice(25, 65), marking: { positive: 2, negative: 0.66 } },
    ] };
  }
  if (preset === 'CSIR_NET') {
    return { name: 'CSIR NET Physical Sciences Mock', settings: settings(), sections: [
      { id: 'net-part-b', name: 'Part B', questions: pool.slice(0, 20), marking: { positive: 3.5, negative: 0.875 } },
      { id: 'net-part-c', name: 'Part C', questions: pool.slice(20, 50), marking: { positive: 5, negative: 1.25 }, maxAttempts: 20 },
    ] };
  }
  const extra = preset === 'BARC_OCES'
    ? { timerHours: 2, positiveMarking: 3, negativeMarking: 1, questionCount: 100 }
    : { positiveMarking: 3, negativeMarking: 1, questionCount: 40 };
  return { name: `${preset.replace('_', ' ')} Mock`, questions: pool, settings: settings(extra) };
};

export const generatePracticeExam = async (subject: string, count = 10): Promise<ExamConfig> => {
  const pool = shuffleArray(await sampleGroups({ [subject]: count })).slice(0, count);
  return {
    name: `${subject} · quick practice`,
    sections: [{ id: 'practice', name: subject, questions: pool, marking: { positive: 1, negative: 0 } }],
    settings: { timerHours: 0, timerMinutes: Math.max(10, count * 3), shuffleQuestions: true, shuffleOptions: true },
  };
};

export const examMinutes = (c: ExamConfig): number =>
  (c.settings?.timerHours ?? 0) * 60 + (c.settings?.timerMinutes ?? 0) || 60;
