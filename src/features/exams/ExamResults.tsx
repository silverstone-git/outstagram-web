import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, Check, ChevronDown, Clock, MessageCircle, Minus, RotateCcw, Share2, X as XIcon } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../../components/ui/drawer';
import { Latex } from './Latex';
import { QuestionChat } from './QuestionChat';
import type { ExamResult, ShuffledQuestion, UserAnswer } from './types';
import { formatTime } from './engine';
import type { Quota } from './examApi';

type Filter = 'all' | 'wrong' | 'skipped' | 'flagged';
const attempted = (a?: UserAnswer) =>
  !!a && (a.selectedOptionLabel != null || (a.selectedOptionLabels?.length ?? 0) > 0 || (a.enteredAnswer ?? '') !== '');

function correctText(q: ShuffledQuestion): string {
  if ((q.type || 'MCQ') === 'NAT') return q.answer_range ? `${q.answer_range.min} – ${q.answer_range.max}` : String(q.answer_value ?? '');
  return '';
}

export function ExamResults({ result, maxScore, attemptId, quota, onQuota, onBack, onRetake, onShare, openChatFor }: {
  result: ExamResult;
  maxScore: number;
  attemptId: string | null;
  quota: Quota | null;
  onQuota: (q: Quota | null) => void;
  onBack: () => void;
  onRetake?: () => void;
  onShare?: () => void;
  openChatFor?: string; // question id: open its tutor chat right away (from tutor history)
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [chatFor, setChatFor] = useState<ShuffledQuestion | null>(null);
  const byId = useMemo(() => new Map(result.answers.map((a) => [a.questionId, a])), [result]);
  useEffect(() => {
    if (!openChatFor) return;
    const q = result.originalQuestions.find((x) => x.id === openChatFor);
    if (q) { setOpen(q.id); setChatFor(q); }
  }, [openChatFor, result]);
  const skipped = result.originalQuestions.filter((q) => !attempted(byId.get(q.id))).length;
  const wrong = result.originalQuestions.length - result.correctAnswers - skipped;
  const topics = Object.entries(result.accuracyPerTopic).sort((a, b) => a[1] - b[1]);
  const list = result.originalQuestions.map((q, i) => ({ q, i, a: byId.get(q.id) })).filter(({ a }) =>
    filter === 'all' ? true : filter === 'wrong' ? attempted(a) && !a!.isCorrect : filter === 'skipped' ? !attempted(a) : !!a?.isFlagged);
  const pct = maxScore > 0 ? Math.max(0, (result.score / maxScore) * 100) : result.accuracy;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto flex items-center gap-2 px-3 py-2">
          <Button variant="ghost" size="icon" aria-label="Back to exams" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
          <p className="min-w-0 flex-1 text-sm font-medium truncate">{result.examName}</p>
          {onShare && <Button size="sm" variant="secondary" onClick={onShare}><Share2 className="w-4 h-4" /> Share</Button>}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/15 to-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Score</p>
          <p className="text-4xl font-bold tabular-nums">
            {Number(result.score.toFixed(2))}<span className="text-lg text-muted-foreground font-normal"> / {Number(maxScore.toFixed(2))}</span>
          </p>
          <Progress value={pct} className="mt-3 h-2" />
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <Stat icon={<Check className="w-4 h-4 text-primary" />} label="Correct" value={result.correctAnswers} />
            <Stat icon={<XIcon className="w-4 h-4 text-destructive" />} label="Wrong" value={wrong} />
            <Stat icon={<Minus className="w-4 h-4 text-muted-foreground" />} label="Skipped" value={skipped} />
            <Stat icon={<Clock className="w-4 h-4 text-accent" />} label="Time" value={formatTime(result.totalTimeTaken)} />
          </div>
        </section>

        {topics.length > 1 && (
          <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold">By topic <span className="font-normal text-muted-foreground">(weakest first)</span></h2>
            {topics.map(([t, acc]) => (
              <div key={t} className="space-y-1">
                <div className="flex justify-between gap-2 text-xs"><span className="truncate">{t}</span><span className="tabular-nums text-muted-foreground">{Math.round(acc * 100)}%</span></div>
                <Progress value={acc * 100} className="h-1.5" />
              </div>
            ))}
          </section>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Review</h2>
            {onRetake && <Button size="sm" variant="ghost" onClick={onRetake}><RotateCcw className="w-4 h-4" /> Retake</Button>}
          </div>
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1" role="tablist">
            {([['all', 'All'], ['wrong', `Wrong (${wrong})`], ['skipped', `Skipped (${skipped})`], ['flagged', 'Flagged']] as [Filter, string][]).map(([f, label]) => (
              <button key={f} role="tab" aria-selected={filter === f} type="button" onClick={() => setFilter(f)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs border ${filter === f ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card'}`}>{label}</button>
            ))}
          </div>
          {list.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Nothing here.</p>}
          {list.map(({ q, i, a }) => {
            const status = !attempted(a) ? 'skipped' : a!.isCorrect ? 'correct' : 'wrong';
            const isOpen = open === q.id;
            return (
              <article key={q.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : q.id)} className="w-full flex items-start gap-3 p-3 text-left">
                  <span className={`shrink-0 mt-0.5 grid place-items-center w-7 h-7 rounded-full text-xs font-semibold ${status === 'correct' ? 'bg-primary/20 text-primary' : status === 'wrong' ? 'bg-destructive/20 text-destructive' : 'bg-secondary text-muted-foreground'}`}>{i + 1}</span>
                  <span className={`min-w-0 flex-1 text-sm ${isOpen ? '' : 'line-clamp-2'}`}><Latex>{q.question}</Latex></span>
                  <ChevronDown className={`w-4 h-4 shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 space-y-3 text-sm">
                    {(q.shuffledOptions?.length ? q.shuffledOptions : q.options || []).map((o) => {
                      const right = (q.type || 'MCQ') === 'MSQ' ? q.answer_labels?.includes(o.label) : q.answer_label === o.label;
                      const mine = (q.type || 'MCQ') === 'MSQ' ? a?.selectedOptionLabels?.includes(o.label) : a?.selectedOptionLabel === o.label;
                      return (
                        <div key={o.label} className={`flex items-start gap-2 rounded-lg border p-2 ${right ? 'border-primary/60 bg-primary/10' : mine ? 'border-destructive/60 bg-destructive/10' : 'border-border'}`}>
                          <span className="shrink-0 w-4 mt-0.5">{right ? <Check className="w-4 h-4 text-primary" /> : mine ? <XIcon className="w-4 h-4 text-destructive" /> : null}</span>
                          <span className="min-w-0 flex-1"><Latex>{o.value}</Latex></span>
                          {mine && <span className="shrink-0 text-[10px] uppercase text-muted-foreground">yours</span>}
                        </div>
                      );
                    })}
                    {(q.type || 'MCQ') === 'NAT' && (
                      <p className="text-xs"><span className="text-muted-foreground">Answer:</span> {correctText(q)} · <span className="text-muted-foreground">yours:</span> {a?.enteredAnswer || '—'}</p>
                    )}
                    {q.explanation && (
                      <div className="rounded-lg bg-secondary/50 p-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Explanation</p>
                        <Latex>{q.explanation}</Latex>
                      </div>
                    )}
                    <Button className="w-full h-11" variant={status === 'correct' ? 'secondary' : 'default'} onClick={() => setChatFor(q)}>
                      <MessageCircle className="w-4 h-4" /> Ask the AI tutor
                    </Button>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      </main>

      <Drawer open={!!chatFor} onOpenChange={(o) => !o && setChatFor(null)}>
        <DrawerContent className="h-[88dvh] max-w-3xl mx-auto flex flex-col overflow-hidden">
          <DrawerHeader className="text-left pb-2 shrink-0">
            <DrawerTitle>AI tutor</DrawerTitle>
            <DrawerDescription className="sr-only">Chat with the AI tutor about this question</DrawerDescription>
            {chatFor && (
              <details className="group text-sm text-muted-foreground">
                <summary className="cursor-pointer list-none">
                  <div className="max-h-[3.2rem] overflow-hidden group-open:max-h-none [mask-image:linear-gradient(to_bottom,black_60%,transparent)] group-open:[mask-image:none]">
                    <Latex>{chatFor.question}</Latex>
                  </div>
                  <span className="text-xs text-primary group-open:hidden">Show full question</span>
                </summary>
              </details>
            )}
          </DrawerHeader>
          {chatFor && <QuestionChat attemptId={attemptId} questionId={chatFor.id} topic={chatFor.topic}
            questionText={chatFor.question} quota={quota} onQuota={onQuota} />}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg bg-card/70 border border-border p-2">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}
