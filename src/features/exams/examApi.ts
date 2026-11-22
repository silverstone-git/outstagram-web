import { API_BASE_URL, OutstagramAPI } from '../../services/api';
import { fetchWithHandling, handleResponse } from '../../services/handle-response';
import type { ExamConfig, ExamResult, ServerExam } from './types';
import { normalizeExamConfig } from './engine';
import { paywallFrom } from '../billing/billing';

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
export interface Quota { limit: number; used: number; remaining: number; window_seconds: number; resets_at: string | null; plan?: 'free' | 'pro' }
export interface Skill { skill: string; title: string; documents: number }
export interface ChatThread {
  attempt_id: string; question_id: string; exam_title: string; question: string; topic?: string | null;
  messages: number; bytes: number; last_at: string; last_preview: string;
}
export interface ThreadUsage { threads: number; bytes: number; max_threads: number; max_bytes: number; plan: 'free' | 'pro' }
export interface FavoriteEquation {
  id: number; latex: string; display: boolean; skill?: string | null; context?: string | null;
  attempt_id?: string | null; question_id?: string | null; datetime_created: string;
}
export interface StreamHandlers {
  onStatus?: (text: string) => void;
  onMeta?: (meta: { citations: Citation[]; skills: string[] }) => void;
  onDelta: (text: string) => void;
}

/** A limit was hit; the paywall sheet has already been opened when `upgrade` is true. */
export class LimitError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}

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

  async ask(attemptId: string, questionId: string, message: string, skills?: string[]): Promise<{ message: ChatMessage; quota: Quota }> {
    const r = await fetchWithHandling(`${API_BASE_URL}/exam-attempts/${attemptId}/chat`, {
      method: 'POST', headers: auth(), body: JSON.stringify({ question_id: questionId, message, skills }),
    });
    await limitCheck(r);
    if (r.status === 429) {
      const body = await r.json().catch(() => ({}));
      throw new QuotaError(body?.detail?.quota ?? null, body?.detail?.message ?? 'AI prompt limit reached');
    }
    if (r.status === 502) throw new Error('The AI tutor is unavailable right now. Your prompt was not counted.');
    const d = await handleResponse<{ message: ChatMessage; quota: Quota }>(r);
    if (!d) throw new Error('Empty response');
    return d;
  },

  /** Streams the reply (SSE). Resolves with the saved message and the new quota. */
  async askStream(attemptId: string, questionId: string, message: string, skills: string[] | undefined,
                  h: StreamHandlers): Promise<{ message: ChatMessage; quota: Quota }> {
    const r = await fetchWithHandling(`${API_BASE_URL}/exam-attempts/${attemptId}/chat/stream`, {
      method: 'POST', headers: { ...auth(), Accept: 'text/event-stream' }, body: JSON.stringify({ question_id: questionId, message, skills }),
    });
    await limitCheck(r);
    if (r.status === 429) {
      const body = await r.json().catch(() => ({}));
      throw new QuotaError(body?.detail?.quota ?? null, body?.detail?.message ?? 'AI prompt limit reached');
    }
    if (!r.ok || !r.body) {
      await handleResponse(r);
      throw new Error('The AI tutor is unavailable right now.');
    }
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let done: { message: ChatMessage; quota: Quota } | null = null;
    for (;;) {
      const { value, done: end } = await reader.read();
      if (value) buf += dec.decode(value, { stream: true });
      let i: number;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const block = buf.slice(0, i);
        buf = buf.slice(i + 2);
        const ev = /^event: (.*)$/m.exec(block)?.[1];
        const raw = /^data: (.*)$/m.exec(block)?.[1];
        if (!ev || raw == null) continue;
        const data = JSON.parse(raw);
        if (ev === 'delta') h.onDelta(data.text);
        else if (ev === 'status') h.onStatus?.(data.text);
        else if (ev === 'meta') h.onMeta?.(data);
        else if (ev === 'done') done = data;
        else if (ev === 'error') {
          throw new Error(data.status === 502 ? 'The AI tutor is unavailable right now. Your prompt was not counted.' : (data.detail || 'Something went wrong'));
        }
      }
      if (end) break;
    }
    if (!done) throw new Error('The answer was cut off. Please try again.');
    return done;
  },

  async skills(): Promise<{ skills: Skill[]; default: string }> {
    const r = await fetchWithHandling(`${API_BASE_URL}/ai/skills`, { headers: auth() });
    return (await handleResponse<{ skills: Skill[]; default: string }>(r)) ?? { skills: [], default: 'physics' };
  },

  async threads(): Promise<{ threads: ChatThread[]; usage: ThreadUsage }> {
    const r = await fetchWithHandling(`${API_BASE_URL}/ai/chats`, { headers: auth() });
    const d = await handleResponse<{ threads: ChatThread[]; usage: ThreadUsage }>(r);
    if (!d) throw new Error('Could not load tutor history');
    return d;
  },

  async deleteThread(attemptId: string, questionId: string): Promise<void> {
    const q = new URLSearchParams({ attempt_id: attemptId, question_id: questionId });
    const r = await fetchWithHandling(`${API_BASE_URL}/ai/chats?${q}`, { method: 'DELETE', headers: auth() });
    await handleResponse(r);
  },

  async favorites(): Promise<FavoriteEquation[]> {
    const r = await fetchWithHandling(`${API_BASE_URL}/favorites/equations`, { headers: auth() });
    return (await handleResponse<FavoriteEquation[]>(r)) ?? [];
  },

  async addFavorite(f: Omit<FavoriteEquation, 'id' | 'datetime_created'>): Promise<FavoriteEquation> {
    const r = await fetchWithHandling(`${API_BASE_URL}/favorites/equations`, { method: 'POST', headers: auth(), body: JSON.stringify(f) });
    const d = await handleResponse<FavoriteEquation>(r);
    if (!d) throw new Error('Could not save');
    return d;
  },

  async deleteFavorite(id: number): Promise<void> {
    const r = await fetchWithHandling(`${API_BASE_URL}/favorites/equations/${id}`, { method: 'DELETE', headers: auth() });
    await handleResponse(r);
  },

  async quota(): Promise<Quota | null> {
    const r = await fetchWithHandling(`${API_BASE_URL}/ai/quota`, { headers: auth() });
    return handleResponse<Quota>(r);
  },
};

/** 402/413/429 paywall responses open the upgrade sheet; 402 becomes a LimitError. */
async function limitCheck(r: Response): Promise<void> {
  const pw = await paywallFrom(r);
  if (r.status === 402) {
    const body = pw ?? (await r.json().catch(() => ({})))?.detail ?? {};
    throw new LimitError(String(body.code ?? 'limit'), String(body.message ?? 'Free plan limit reached'));
  }
}
