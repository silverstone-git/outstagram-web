import { useEffect, useRef, useState } from 'react';
import { BookOpen, Loader2, SendHorizonal, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Latex } from './Latex';
import { ExamAPI, QuotaError, type ChatMessage, type Quota } from './examApi';

const SUGGESTIONS = ['Why is my answer wrong?', 'Walk me through the solution', 'What concept is this testing?', 'Give me a similar practice question'];

function resetIn(q: Quota | null): string {
  if (!q?.resets_at) return '';
  const mins = Math.max(1, Math.ceil((Date.parse(q.resets_at) - Date.now()) / 60000));
  return ` Next prompt in ~${mins} min.`;
}

export function QuestionChat({ attemptId, questionId, quota, onQuota }: {
  attemptId: string | null;
  questionId: string;
  quota: Quota | null;
  onQuota: (q: Quota | null) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!attemptId) { setLoading(false); return; }
    let live = true;
    ExamAPI.chat(attemptId, questionId).then((m) => live && setMessages(m)).catch(() => {}).finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [attemptId, questionId]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages, busy]);

  const out = quota !== null && quota.remaining <= 0;
  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || !attemptId || busy || out) return;
    setBusy(true); setError(null); setDraft('');
    setMessages((m) => [...m, { role: 'user', content: msg, datetime_sent: new Date().toISOString() }]);
    try {
      const r = await ExamAPI.ask(attemptId, questionId, msg);
      setMessages((m) => [...m, r.message]);
      onQuota(r.quota);
    } catch (e) {
      setMessages((m) => m.slice(0, -1));
      setDraft(msg);
      if (e instanceof QuotaError) { onQuota(e.quota); setError(e.message + resetIn(e.quota)); }
      else setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  if (!attemptId) {
    return <p className="p-4 text-sm text-muted-foreground">This attempt wasn't saved to your account, so the AI tutor isn't available for it.</p>;
  }

  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3" aria-live="polite">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading conversation…</p>
        ) : messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />Ask anything about this question. Answers are grounded in the physics textbooks.</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" disabled={out} onClick={() => send(s)}
                  className="rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-xs hover:bg-secondary disabled:opacity-50">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
            <div className={m.role === 'user'
              ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-3 py-2 text-sm whitespace-pre-wrap break-words'
              : 'max-w-full rounded-2xl rounded-bl-sm bg-secondary px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words'}>
              {m.role === 'user' ? m.content : <Latex>{m.content}</Latex>}
              {!!m.citations?.length && (
                <div className="mt-2 pt-2 border-t border-border space-y-1">
                  {m.citations.map((c, j) => (
                    <p key={j} className="text-xs text-muted-foreground flex gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span className="min-w-0 break-words">[{c.n ?? j + 1}] {c.doc}{c.section ? ` › ${c.section}` : ''}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Thinking… checking the textbooks</p>}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border p-3 space-y-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
          <Textarea
            value={draft} onChange={(e) => setDraft(e.target.value)} rows={1} maxLength={2000}
            placeholder={out ? 'Hourly AI limit reached' : 'Ask the tutor…'} disabled={out}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(draft); } }}
            className="min-h-11 max-h-32 resize-none text-base"
          />
          <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={busy || out || !draft.trim()} aria-label="Send">
            <SendHorizonal className="w-5 h-5" />
          </Button>
        </form>
        {quota && <p className="text-[11px] text-muted-foreground">{quota.remaining}/{quota.limit} AI prompts left this hour.{out ? resetIn(quota) : ''}</p>}
      </div>
    </div>
  );
}
