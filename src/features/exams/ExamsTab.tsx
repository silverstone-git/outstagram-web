import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ExamsHome, type StartRequest } from './ExamsHome';
import { ExamRunner } from './ExamRunner';
import { ExamResults } from './ExamResults';
import { ExamAPI, type Quota } from './examApi';
import { generatePracticeExam, generatePresetExam } from './engine';
import type { ExamConfig, ExamResult } from './types';

type View =
  | { name: 'home' }
  | { name: 'running'; config: ExamConfig; examId: string | null; key: number }
  | { name: 'results'; result: ExamResult; maxScore: number; attemptId: string | null; retake?: () => void };

/** Exams tab: home → runner (full-screen) → results with the per-question AI tutor. */
export function ExamsTab({ onImmersive, onShareResult }: {
  onImmersive: (on: boolean) => void;
  onShareResult?: (result: ExamResult, maxScore: number) => void;
}) {
  const [view, setView] = useState<View>({ name: 'home' });
  const [busy, setBusy] = useState<string | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);

  useEffect(() => { ExamAPI.quota().then(setQuota).catch(() => {}); }, []);
  useEffect(() => { onImmersive(view.name !== 'home'); return () => onImmersive(false); }, [view.name, onImmersive]);

  const run = (config: ExamConfig, examId: string | null) => setView({ name: 'running', config, examId, key: Date.now() });

  const start = async (r: StartRequest, key: string) => {
    setBusy(key);
    try {
      const config = r.kind === 'preset' ? await generatePresetExam(r.id)
        : r.kind === 'practice' ? await generatePracticeExam(r.subject)
          : await ExamAPI.communityExam(r.examId);
      run(config, r.kind === 'community' ? r.examId : null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load the exam');
    } finally {
      setBusy(null);
    }
  };

  const finish = useCallback(async (result: ExamResult, maxScore: number, config: ExamConfig, examId: string | null) => {
    const retake = () => run(config, examId);
    setView({ name: 'results', result, maxScore, attemptId: null, retake });
    window.scrollTo({ top: 0 });
    try {
      const saved = await ExamAPI.saveAttempt(examId, result, maxScore);
      if (saved) setView((v) => (v.name === 'results' && v.result === result ? { ...v, attemptId: saved.attempt_id } : v));
    } catch {
      toast.error("Couldn't save this attempt. Review works, but the AI tutor needs a saved attempt.");
    }
  }, []);

  const openAttempt = async (id: string) => {
    setBusy(`attempt:${id}`);
    try {
      const a = await ExamAPI.attempt(id);
      setView({ name: 'results', result: a.result, maxScore: a.max_score, attemptId: a.attempt_id });
      window.scrollTo({ top: 0 });
    } catch {
      toast.error('Could not open that attempt');
    } finally {
      setBusy(null);
    }
  };

  if (view.name === 'running') {
    return <ExamRunner key={view.key} config={view.config}
      onFinish={(res, max) => finish(res, max, view.config, view.examId)}
      onQuit={() => setView({ name: 'home' })} />;
  }
  if (view.name === 'results') {
    return <ExamResults result={view.result} maxScore={view.maxScore} attemptId={view.attemptId}
      quota={quota} onQuota={setQuota} onBack={() => setView({ name: 'home' })} onRetake={view.retake}
      onShare={onShareResult ? () => onShareResult(view.result, view.maxScore) : undefined} />;
  }
  return <ExamsHome busy={busy} quota={quota} onStart={start} onOpenAttempt={openAttempt} />;
}
