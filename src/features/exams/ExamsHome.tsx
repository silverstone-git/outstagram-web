import { useEffect, useState, type ReactNode } from 'react';
import { BookOpenCheck, ChevronRight, Clock, History, Loader2, MessagesSquare, Sparkles, Star, Users } from 'lucide-react';
import { openPaywall } from '../billing/billing';
import { SavedEquations, TutorHistory } from './TutorLibrary';
import type { FavoriteEquation } from './examApi';
import { PRESETS, SUBJECTS } from './engine';
import { ExamAPI, quotaOut, quotaShort, type AttemptSummary, type Quota } from './examApi';
import type { ServerExam } from './types';

export type StartRequest =
  | { kind: 'preset'; id: (typeof PRESETS)[number]['id'] }
  | { kind: 'practice'; subject: string }
  | { kind: 'community'; examId: string };

export function ExamsHome({ busy, quota, onStart, onOpenAttempt }: {
  busy: string | null;
  quota: Quota | null;
  onStart: (r: StartRequest, key: string) => void;
  onOpenAttempt: (id: string, questionId?: string, focus?: FavoriteEquation) => void;
}) {
  const [attempts, setAttempts] = useState<AttemptSummary[] | null>(null);
  const [community, setCommunity] = useState<ServerExam[] | null>(null);
  useEffect(() => {
    ExamAPI.attempts().then(setAttempts).catch(() => setAttempts([]));
    ExamAPI.communityExams().then(setCommunity).catch(() => setCommunity([]));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-8 space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-primary">Exams</h1>
          <p className="text-sm text-muted-foreground">Practice, review, then ask the AI tutor about any question.</p>
        </div>
        {quota && (
          <button type="button" onClick={() => openPaywall({ code: quotaOut(quota) ? 'ai_quota' : 'manual' })}
            className="shrink-0 inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs hover:bg-secondary/70"
            title="AI prompts left this hour" aria-label={quota.unlimited ? 'Unlimited AI prompts' : `${quota.remaining} of ${quota.limit} AI prompts left this hour. Upgrade`}>
            <Sparkles className="w-3.5 h-3.5 text-primary" />{quotaShort(quota)}
          </button>
        )}
      </header>

      <Section icon={<BookOpenCheck className="w-4 h-4" />} title="Quick practice" hint="10 questions · 30 min">
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((s) => {
            const key = `practice:${s}`;
            return (
              <button key={s} type="button" disabled={!!busy} onClick={() => onStart({ kind: 'practice', subject: s }, key)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-sm hover:border-primary disabled:opacity-60">
                {busy === key && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{s}
              </button>
            );
          })}
        </div>
      </Section>

      <Section icon={<Clock className="w-4 h-4" />} title="Full mock tests">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PRESETS.map((p) => {
            const key = `preset:${p.id}`;
            return (
              <button key={p.id} type="button" disabled={!!busy} onClick={() => onStart({ kind: 'preset', id: p.id }, key)}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left hover:border-primary disabled:opacity-60">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.blurb} · {p.minutes / 60}h</p>
                </div>
                {busy === key ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </button>
            );
          })}
        </div>
      </Section>

      <Section icon={<History className="w-4 h-4" />} title="Your attempts">
        {attempts === null ? <Skeleton /> : attempts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attempts yet. Your finished exams show up here for review.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {attempts.map((a) => (
              <li key={a.attempt_id}>
                <button type="button" onClick={() => onOpenAttempt(a.attempt_id)} className="w-full flex items-center gap-3 p-3 text-left">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{a.exam_title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(a.datetime_taken + (a.datetime_taken.endsWith('Z') ? '' : 'Z')).toLocaleDateString()} · {a.total_questions} Qs · {Math.round(a.accuracy)}% accuracy</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{Number(a.score.toFixed(2))}<span className="text-muted-foreground font-normal">/{Number(a.max_score.toFixed(2))}</span></span>
                  <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div id="tutor-history">
        <Section icon={<MessagesSquare className="w-4 h-4" />} title="Tutor history">
          <TutorHistory onOpen={(a, q) => onOpenAttempt(a, q)} />
        </Section>
      </div>

      <Section icon={<Star className="w-4 h-4" />} title="Saved equations">
        <SavedEquations onOpen={(f) => f.attempt_id && onOpenAttempt(f.attempt_id, f.question_id ?? undefined, f)} />
      </Section>

      <Section icon={<Users className="w-4 h-4" />} title="Community exams">
        {community === null ? <Skeleton /> : community.length === 0 ? (
          <p className="text-sm text-muted-foreground">No community exams yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {community.map((e) => {
              const key = `community:${e.exam_id}`;
              return (
                <li key={e.exam_id}>
                  <button type="button" disabled={!!busy} onClick={() => onStart({ kind: 'community', examId: e.exam_id }, key)} className="w-full flex items-center gap-3 p-3 text-left disabled:opacity-60">
                    <p className="min-w-0 flex-1 text-sm truncate">{e.exam_title}</p>
                    {busy === key ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({ icon, title, hint, children }: { icon: ReactNode; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold">{icon}{title}{hint && <span className="font-normal text-muted-foreground">· {hint}</span>}</h2>
      {children}
    </section>
  );
}

const Skeleton = () => <div className="h-16 rounded-xl bg-card animate-pulse" />;
