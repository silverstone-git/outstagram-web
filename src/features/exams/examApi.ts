import { API_BASE_URL, OutstagramAPI } from '../../services/api';
import { fetchWithHandling, handleResponse } from '../../services/handle-response';
import type { ExamConfig, ExamResult, ServerExam } from './types';
import { normalizeExamConfig } from './engine';

export interface AttemptSummary {
  attempt_id: string;
  exam_id: string | null;
  exam_title: string;
  score: number;
  max_score: number;
  accuracy: number;
  total_questions: number;
  total_time_seconds: number;
  datetime_taken: string;
}
export interface Attempt extends AttemptSummary { result: ExamResult }
export interface Citation { n?: number; doc?: string; section?: string; path?: string[]; url?: string; preview?: string }
export interface ChatMessage { role: 'user' | 'assistant'; content: string; citations?: Citation[] | null; datetime_sent: string }
export interface Quota { limit: number; used: number; remaining: number; window_seconds: number; resets_at: string | null }

export class QuotaError extends Error {
  quota: Quota | null;
  constructor(quota: Quota | null, message: string) {
    super(message);
    this.quota = quota;
  }
}

const auth = () => OutstagramAPI.getAuthHeaders();

export const ExamAPI = {
  async communityExams(page = 1): Promise<ServerExam[]> {
    const r = await fetchWithHandling(`${API_BASE_URL}/pariksha?page=${page}`);
    return (await handleResponse<ServerExam[]>(r)) ?? [];
  },

  async communityExam(examId: string): Promise<ExamConfig> {
    const r = await fetchWithHandling(`${API_BASE_URL}/pariksha/${examId}`);
    const d = await handleResponse<{ exam_title: string; exam_json_str: string; sections?: ExamConfig['sections'] }>(r);
    if (!d) throw new Error('Exam not found');
    if (d.sections && d.sections.length) return normalizeExamConfig({ name: d.exam_title, sections: d.sections });
    const parsed = JSON.parse(d.exam_json_str);
    const cfg: ExamConfig = Array.isArray(parsed) ? { name: d.exam_title, questions: parsed } : { name: d.exam_title, ...parsed };
    return normalizeExamConfig(cfg);
  },

  async saveAttempt(examId: string | null, result: ExamResult, maxScore: number): Promise<AttemptSummary | null> {
    const r = await fetchWithHandling(`${API_BASE_URL}/exam-attempts`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({
        exam_id: examId, exam_title: result.examName, score: result.score, max_score: maxScore,
        accuracy: result.accuracy, total_questions: result.totalQuestions,
        total_time_seconds: Math.round(result.totalTimeTaken),
        result: { ...result, originalConfig: undefined }, // the config duplicates the questions
      }),
    });
    return handleResponse<AttemptSummary>(r);
  },

  async attempts(page = 1): Promise<AttemptSummary[]> {
    const r = await fetchWithHandling(`${API_BASE_URL}/exam-attempts?page=${page}`, { headers: auth() });
    return (await handleResponse<AttemptSummary[]>(r)) ?? [];
  },

  async attempt(id: string): Promise<Attempt> {
    const r = await fetchWithHandling(`${API_BASE_URL}/exam-attempts/${id}`, { headers: auth() });
    const d = await handleResponse<Attempt>(r);
    if (!d) throw new Error('Attempt not found');
    return d;
  },

  async chat(attemptId: string, questionId: string): Promise<ChatMessage[]> {
    const r = await fetchWithHandling(
      `${API_BASE_URL}/exam-attempts/${attemptId}/chat?question_id=${encodeURIComponent(questionId)}`, { headers: auth() });
    return (await handleResponse<ChatMessage[]>(r)) ?? [];
  },

  async ask(attemptId: string, questionId: string, message: string): Promise<{ message: ChatMessage; quota: Quota }> {
    const r = await fetchWithHandling(`${API_BASE_URL}/exam-attempts/${attemptId}/chat`, {
      method: 'POST', headers: auth(), body: JSON.stringify({ question_id: questionId, message }),
    });
    if (r.status === 429) {
      const body = await r.json().catch(() => ({}));
      throw new QuotaError(body?.detail?.quota ?? null, body?.detail?.message ?? 'AI prompt limit reached');
    }
    if (r.status === 502) throw new Error('The AI tutor is unavailable right now. Your prompt was not counted.');
    const d = await handleResponse<{ message: ChatMessage; quota: Quota }>(r);
    if (!d) throw new Error('Empty response');
    return d;
  },

  async quota(): Promise<Quota | null> {
    const r = await fetchWithHandling(`${API_BASE_URL}/ai/quota`, { headers: auth() });
    return handleResponse<Quota>(r);
  },
};
