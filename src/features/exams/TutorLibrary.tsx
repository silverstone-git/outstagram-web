import { useEffect, useMemo, useState } from 'react';
import katex from 'katex';
import { Copy, ExternalLink, MessageCircle, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '../../components/ui/progress';
import { ExamAPI, type ChatThread, type FavoriteEquation, type ThreadUsage } from './examApi';
import { openPaywall } from '../billing/billing';
import { Latex } from './Latex';
import { focusEquation, forgetSavedEquations, resetSavedEquations, savedEquations } from './EquationPicker';
import { openPost } from '../../lib/nav';

const kb = (b: number) => (b >= 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1000))} kB`);
const when = (iso: string) => new Date(iso + (iso.endsWith('Z') ? '' : 'Z')).toLocaleDateString();

/** Saved tutor conversations (one per exam question), with free-plan usage and delete. */
export function TutorHistory({ onOpen }: { onOpen: (attemptId: string, questionId: string) => void }) {
  const [data, setData] = useState<{ threads: ChatThread[]; usage: ThreadUsage } | null>(null);
  const load = () => ExamAPI.threads().then(setData).catch(() => setData({ threads: [], usage: { threads: 0, bytes: 0, max_threads: 10, max_bytes: 100_000, plan: 'free' } }));
  useEffect(() => {
    load();
    const on = () => load();
    window.addEventListener('planchange', on);
    return () => window.removeEventListener('planchange', on);
  }, []);

  const remove = async (t: ChatThread) => {
    if (!confirm('Delete this tutor chat? This cannot be undone.')) return;
    try {
      await ExamAPI.deleteThread(t.attempt_id, t.question_id);
      toast.success('Chat deleted');
      load();
    } catch {
      toast.error('Could not delete the chat');
    }
  };

  if (!data) return <div className="h-16 rounded-xl bg-card animate-pulse" />;
  const u = data.usage;
  const pct = Math.max(u.threads / u.max_threads, u.bytes / u.max_bytes) * 100;
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-border bg-card p-3 space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">{u.threads}/{u.max_threads} chats · {kb(u.bytes)} of {kb(u.max_bytes)}</span>
          {u.plan === 'free'
            ? <button type="button" className="shrink-0 font-medium text-primary" onClick={() => openPaywall({ code: 'manual' })}>Get more space</button>
            : <span className="shrink-0 font-medium text-primary">Pro</span>}
        </div>
        <Progress value={Math.min(100, pct)} className="h-1.5" />
      </div>
      {data.threads.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tutor chats yet. Open a finished exam and tap "Ask the AI tutor".</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {data.threads.map((t) => (
            <li key={`${t.attempt_id}:${t.question_id}`} className="flex items-start gap-2 p-3">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(t.attempt_id, t.question_id)}>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><MessageCircle className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{t.exam_title} · {t.messages} msgs · {when(t.last_at)}</span></p>
                <div className="mt-1 line-clamp-2 text-sm"><Latex>{t.question || '(question)'}</Latex></div>
              </button>
              <button type="button" aria-label="Delete chat" onClick={() => remove(t)}
                className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Tex({ latex, display }: { latex: string; display: boolean }) {
  const html = useMemo(() => katex.renderToString(latex, { displayMode: display, throwOnError: false, strict: false }), [latex, display]);
  return <div className="overflow-x-auto py-1" dangerouslySetInnerHTML={{ __html: html }} />;
}

const FROM: Record<string, string> = { tutor: 'AI tutor', explanation: 'Explanation', question: 'Question', option: 'Answer option', post: 'Post' };

/** Saved equations (long-press in tutor answers, exam reviews and posts). Tap one to go back to where
 *  it came from: the tutor reply, the reviewed question or the post, with the equation flashing. */
export function SavedEquations({ onOpen }: { onOpen?: (f: FavoriteEquation) => void }) {
  const [favs, setFavs] = useState<FavoriteEquation[] | null>(null);
  useEffect(() => {
    const load = () => { resetSavedEquations(); savedEquations().then(setFavs).catch(() => setFavs([])); };
    load();
    window.addEventListener('favoriteschange', load);
    return () => window.removeEventListener('favoriteschange', load);
  }, []);

  const remove = async (f: FavoriteEquation) => {
    setFavs((x) => x?.filter((y) => y.id !== f.id) ?? null);
    try { await ExamAPI.deleteFavorite(f.id); forgetSavedEquations(); } catch { toast.error('Could not remove it'); ExamAPI.favorites().then(setFavs).catch(() => {}); }
  };
  const copy = (f: FavoriteEquation) => navigator.clipboard?.writeText(f.latex).then(() => toast.success('LaTeX copied'), () => {});
  const go = (f: FavoriteEquation) => {
    if (f.source === 'post' && f.post_id) { openPost(f.post_id); focusEquation(f.latex, undefined, 8000); return; }
    if (f.attempt_id && onOpen) { onOpen(f); return; }
    toast.message("This one was saved before we kept track of where equations come from.");
  };

  if (!favs) return <div className="h-16 rounded-xl bg-card animate-pulse" />;
  if (favs.length === 0) {
    return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Star className="h-4 w-4 shrink-0" />Long-press any equation in a tutor answer, an exam review or a post to save it here.</p>;
  }
  return (
    <ul className="space-y-2">
      {favs.map((f) => {
        const where = f.source ? FROM[f.source] : f.attempt_id ? 'AI tutor' : null;
        const canGo = (f.source === 'post' && f.post_id) || f.attempt_id;
        return (
          <li key={f.id} className="rounded-xl border border-border bg-card">
            <button type="button" onClick={() => go(f)} className="block w-full rounded-t-xl p-3 pb-1 text-left hover:bg-secondary/40" title={canGo ? 'Open where you saved it' : undefined}>
              <Tex latex={f.latex} display={f.display} />
            </button>
            <div className="flex items-center gap-2 px-3 pb-2">
              <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {where && <span className="font-medium">{where}</span>}
                {f.skill ? <span className="capitalize">{where ? ' · ' : ''}{f.skill.replace(/-/g, ' ')}</span> : null}{f.context ? ` · ${f.context}` : ''}
              </p>
              {canGo && <button type="button" aria-label="Open where it was saved" onClick={() => go(f)} className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-secondary"><ExternalLink className="h-4 w-4" /></button>}
              <button type="button" aria-label="Copy LaTeX" onClick={() => copy(f)} className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-secondary"><Copy className="h-4 w-4" /></button>
              <button type="button" aria-label="Remove from favourites" onClick={() => remove(f)} className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
