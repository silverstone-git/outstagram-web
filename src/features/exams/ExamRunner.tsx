import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Flag, Grid3x3, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../../components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Latex } from './Latex';
import type { ExamConfig, ExamResult } from './types';
import {
  type DraftAnswer, examMinutes, formatTime, isAttempted, maxScore, normalizeExamConfig, prepareQuestions,
  resolveImagePath, scoreExam, sectionOf,
} from './engine';

const LETTERS = 'ABCDEFGH';

export function ExamRunner({ config: raw, onFinish, onQuit }: {
  config: ExamConfig;
  onFinish: (result: ExamResult, maxScore: number) => void;
  onQuit: () => void;
}) {
  const config = useMemo(() => normalizeExamConfig(raw), [raw]);
  const [questions] = useState(() => prepareQuestions(config));
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, DraftAnswer>>({});
  const [now, setNow] = useState(() => Date.now());
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [confirm, setConfirm] = useState<'submit' | 'quit' | null>(null);
  const startedAt = useRef(Date.now());
  const qStart = useRef(Date.now());
  const timers = useRef<Record<string, number>>({});
  const submitted = useRef(false);
  const total = examMinutes(config) * 60;
  const remaining = Math.max(0, total - (now - startedAt.current) / 1000);
  const q = questions[idx];
  const section = q ? sectionOf(config, q.id) : undefined;
  const answeredCount = questions.filter((x) => isAttempted(answers[x.id])).length;

  const commitTime = useCallback(() => {
    const cur = questions[idx];
    if (cur) timers.current[cur.id] = (timers.current[cur.id] || 0) + (Date.now() - qStart.current) / 1000;
    qStart.current = Date.now();
  }, [questions, idx]);

  const goTo = (i: number) => {
    if (i < 0 || i >= questions.length) return;
    commitTime();
    setIdx(i);
    setPaletteOpen(false);
    window.scrollTo({ top: 0 });
  };

  const submit = useCallback(() => {
    if (submitted.current) return;
    submitted.current = true;
    commitTime();
    onFinish(scoreExam(config, questions, answers, timers.current, startedAt.current), maxScore(config, questions));
  }, [commitTime, config, questions, answers, onFinish]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (remaining <= 0 && questions.length) submit(); }, [remaining, questions.length, submit]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  if (!questions.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-muted-foreground">No questions could be loaded for this exam. The question bank may be unreachable.</p>
        <Button onClick={onQuit}>Back to exams</Button>
      </div>
    );
  }

  const a = answers[q.id] || {};
  const setA = (patch: Partial<DraftAnswer>) => setAnswers((p) => ({ ...p, [q.id]: { ...p[q.id], ...patch } }));
  const type = q.type || 'MCQ';
  const pick = (label: number) => {
    if (type === 'MSQ') {
      const cur = a.labels || [];
      setA({ labels: cur.includes(label) ? cur.filter((l) => l !== label) : [...cur, label] });
    } else setA({ label: a.label === label ? null : label });
  };
  const lowTime = remaining < 300;

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* top bar */}
      <header className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto flex items-center gap-2 px-3 py-2">
          <Button variant="ghost" size="icon" aria-label="Quit exam" onClick={() => setConfirm('quit')}><X className="w-5 h-5" /></Button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{config.name}</p>
            <p className="text-xs text-muted-foreground">{answeredCount}/{questions.length} answered</p>
          </div>
          <span aria-label="Time remaining" className={`font-mono text-sm tabular-nums px-2 py-1 rounded-md ${lowTime ? 'bg-destructive/20 text-destructive' : 'bg-secondary'}`}>
            {formatTime(remaining)}
          </span>
          <Button size="sm" onClick={() => setConfirm('submit')}>Finish</Button>
        </div>
        <Progress value={(answeredCount / questions.length) * 100} className="h-1 rounded-none" />
      </header>

      {/* question */}
      <main className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-sm">Q{idx + 1}<span className="text-muted-foreground font-normal">/{questions.length}</span></span>
          {section && config.sections!.length > 1 && <Badge variant="secondary">{section.name}</Badge>}
          <Badge variant="outline">{type === 'MSQ' ? 'Multiple select' : type === 'NAT' ? 'Numerical' : 'Single choice'}</Badge>
          {section && <span className="text-muted-foreground">+{section.marking.positive}{section.marking.negative ? ` / −${section.marking.negative}` : ''}</span>}
          <button
            type="button" onClick={() => setA({ isFlagged: !a.isFlagged })} aria-pressed={!!a.isFlagged}
            className={`ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 ${a.isFlagged ? 'bg-accent/20 text-accent' : 'text-muted-foreground'}`}
          >
            <Flag className="w-4 h-4" /> {a.isFlagged ? 'Flagged' : 'Flag'}
          </button>
        </div>

        <div className="rounded-xl bg-card border border-border p-4 text-base leading-relaxed">
          <Latex>{q.question}</Latex>
          {q.image_path && <img src={resolveImagePath(q.image_path)} alt="" className="mt-3 max-h-72 w-auto mx-auto rounded-md bg-white" />}
        </div>

        {type === 'NAT' ? (
          <label className="block space-y-2">
            <span className="text-sm text-muted-foreground">Your numerical answer</span>
            <input
              inputMode="decimal" autoComplete="off" value={a.text ?? ''}
              onChange={(e) => setA({ text: e.target.value.replace(/[^0-9eE+\-.]/g, '') })}
              className="w-full h-12 rounded-lg bg-input-background border border-border px-4 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. 0.25"
            />
          </label>
        ) : (
          <div role={type === 'MSQ' ? 'group' : 'radiogroup'} className="space-y-2">
            {q.shuffledOptions.map((o, i) => {
              const on = type === 'MSQ' ? (a.labels || []).includes(o.label) : a.label === o.label;
              return (
                <button
                  key={o.label} type="button" role={type === 'MSQ' ? 'checkbox' : 'radio'} aria-checked={on}
                  onClick={() => pick(o.label)}
                  className={`w-full flex items-start gap-3 rounded-xl border p-3 text-left transition-colors min-h-12 ${on ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-secondary/50'}`}
                >
                  <span className={`shrink-0 grid place-items-center w-7 h-7 text-sm font-semibold ${type === 'MSQ' ? 'rounded-md' : 'rounded-full'} ${on ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                    {LETTERS[i]}
                  </span>
                  <span className="min-w-0 flex-1 pt-0.5"><Latex>{o.value}</Latex></span>
                </button>
              );
            })}
            {type === 'MSQ' && <p className="text-xs text-muted-foreground">Select all that apply.</p>}
          </div>
        )}
        {isAttempted(a) && (
          <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setA({ label: null, labels: [], text: '' })}>
            Clear response
          </button>
        )}
      </main>

      {/* bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-20 bg-card border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-2 p-2">
          <Button variant="secondary" className="h-12" disabled={idx === 0} onClick={() => goTo(idx - 1)}>
            <ChevronLeft className="w-5 h-5" /> Prev
          </Button>
          <Button variant="outline" className="h-12" onClick={() => setPaletteOpen(true)}>
            <Grid3x3 className="w-5 h-5" /> {idx + 1}/{questions.length}
          </Button>
          {idx < questions.length - 1 ? (
            <Button className="h-12" onClick={() => goTo(idx + 1)}>Next <ChevronRight className="w-5 h-5" /></Button>
          ) : (
            <Button className="h-12" onClick={() => setConfirm('submit')}>Finish</Button>
          )}
        </div>
      </nav>

      <Sheet open={paletteOpen} onOpenChange={setPaletteOpen}>
        <SheetContent side="bottom" className="max-h-[75vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Questions</SheetTitle>
            <SheetDescription>
              <span className="inline-flex flex-wrap gap-3 text-xs">
                <span><i className="inline-block w-3 h-3 rounded-sm bg-primary align-middle mr-1" />answered</span>
                <span><i className="inline-block w-3 h-3 rounded-sm bg-accent align-middle mr-1" />flagged</span>
                <span><i className="inline-block w-3 h-3 rounded-sm bg-secondary align-middle mr-1" />not answered</span>
              </span>
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6 space-y-4">
            {config.sections!.map((s) => {
              const items = questions.map((x, i) => ({ x, i })).filter(({ x }) => s.questions.some((sq) => sq.id === x.id));
              if (!items.length) return null;
              return (
                <div key={s.id}>
                  {config.sections!.length > 1 && <p className="text-xs text-muted-foreground mb-2">{s.name}{s.maxAttempts ? ` · best ${s.maxAttempts} count` : ''}</p>}
                  <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
                    {items.map(({ x, i }) => {
                      const st = answers[x.id];
                      const cls = st?.isFlagged ? 'bg-accent text-accent-foreground' : isAttempted(st) ? 'bg-primary text-primary-foreground' : 'bg-secondary';
                      return (
                        <button key={x.id} type="button" onClick={() => goTo(i)} aria-label={`Question ${i + 1}`}
                          className={`h-10 rounded-md text-sm font-medium ${cls} ${i === idx ? 'ring-2 ring-foreground' : ''}`}>
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === 'quit' ? 'Quit this exam?' : 'Submit exam?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === 'quit'
                ? 'Your answers will be discarded.'
                : `You answered ${answeredCount} of ${questions.length}.` + (questions.length - answeredCount ? ` ${questions.length - answeredCount} unanswered.` : '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep going</AlertDialogCancel>
            <AlertDialogAction onClick={confirm === 'quit' ? onQuit : submit}>{confirm === 'quit' ? 'Quit' : 'Submit'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
