import { useEffect, useRef, useState } from 'react';
import { BookOpen, Library, Loader2, SendHorizonal, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { TutorMarkdown, type PickedEquation } from './TutorMarkdown';
import { ExamAPI, LimitError, QuotaError, quotaOut, type ChatMessage, type Quota, type Skill } from './examApi';
import { openPaywall } from '../billing/billing';

const SUGGESTIONS = ['Why is my answer wrong?', 'Walk me through the solution', 'What concept is this testing?', 'Give me a similar practice question'];

function resetIn(q: Quota | null): string {
  if (!q?.resets_at) return '';
  const mins = Math.max(1, Math.ceil((Date.parse(q.resets_at) - Date.now()) / 60000));
  return ` Next prompt in ~${mins} min.`;
}

// Skill list is the same for every question: fetch once per page load.
let skillsCache: Promise<{ skills: Skill[]; default: string }> | null = null;
const loadSkills = () => (skillsCache ??= ExamAPI.skills().catch(() => { skillsCache = null; return { skills: [], default: 'physics' }; }));

/** Guess the skill from the question's topic ("Quantum Mechanics" -> physics needs a hint, so fall back to default). */
function guessSkill(skills: Skill[], fallback: string, topic?: string): string {
  const t = (topic || '').toLowerCase();
  return skills.find((s) => t.includes(s.skill.replace(/-/g, ' ')))?.skill ?? fallback;
}

export function QuestionChat({ attemptId, questionId, topic, questionText, quota, onQuota }: {
  attemptId: string | null;
  questionId: string;
  topic?: string;
  questionText?: string;
  quota: Quota | null;
  onQuota: (q: Quota | null) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [chosen, setChosen] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!attemptId) { setLoading(false); return; }
    let live = true;
    ExamAPI.chat(attemptId, questionId).then((m) => live && setMessages(m)).catch(() => {}).finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [attemptId, questionId]);
  useEffect(() => {
    let live = true;
    loadSkills().then((d) => {
      if (!live) return;
      setSkills(d.skills);
      setChosen([guessSkill(d.skills, d.default, topic)]);
    });
    return () => { live = false; };
  }, [topic]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages, busy]);

  const out = quotaOut(quota);
  const toggleSkill = (s: string) =>
    setChosen((c) => (c.includes(s) ? (c.length > 1 ? c.filter((x) => x !== s) : c) : [...c, s].slice(-5)));

  const favourite = async (eq: PickedEquation) => {
    try {
      const fav = await ExamAPI.addFavorite({ ...eq, skill: chosen[0] ?? null, context: questionText?.slice(0, 300) ?? null,
        attempt_id: attemptId, question_id: questionId });
      toast.success('Equation saved to favourites', {
        action: { label: 'Undo', onClick: () => { ExamAPI.deleteFavorite(fav.id).catch(() => {}); } },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save the equation');
    }
  };

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || !attemptId || busy) return;
    if (out) { openPaywall({ code: 'ai_quota', message: `You've used all ${quota?.limit} AI prompts for this hour.${resetIn(quota)}` }); return; }
    setBusy(true); setError(null); setDraft(''); setStatus(null);
    const now = new Date().toISOString();
    setMessages((m) => [...m, { role: 'user', content: msg, datetime_sent: now }, { role: 'assistant', content: '', datetime_sent: now }]);
    const patchLast = (f: (m: ChatMessage) => ChatMessage) => setMessages((ms) => [...ms.slice(0, -1), f(ms[ms.length - 1])]);
    try {
      const r = await ExamAPI.askStream(attemptId, questionId, msg, chosen.length ? chosen : undefined, {
        onStatus: setStatus,
        onMeta: (meta) => { setStatus(null); patchLast((m) => ({ ...m, citations: meta.citations })); },
        onDelta: (t) => { setStatus(null); patchLast((m) => ({ ...m, content: m.content + t })); },
      });
      patchLast(() => r.message);
      onQuota(r.quota);
    } catch (e) {
      setMessages((m) => m.slice(0, -2));
      setDraft(msg);
      if (e instanceof QuotaError) { onQuota(e.quota); setError(e.message + resetIn(e.quota)); }
      else if (e instanceof LimitError) setError(e.message);
      else setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false); setStatus(null);
    }
  };

  if (!attemptId) {
    return <p className="p-4 text-sm text-muted-foreground">This attempt wasn't saved to your account, so the AI tutor isn't available for it.</p>;
  }

  const last = messages[messages.length - 1];
  return (
    <div className="flex flex-col min-h-0 flex-1">
      {skills.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto px-4 pb-2 shrink-0" aria-label="Books to search">
          <Library className="w-4 h-4 shrink-0 text-muted-foreground" />
          {skills.map((s) => {
            const on = chosen.includes(s.skill);
            return (
              <button key={s.skill} type="button" onClick={() => toggleSkill(s.skill)} aria-pressed={on}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${on ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground'}`}>
                {s.title}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 space-y-3 border-t border-border" aria-live="polite">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading conversation…</p>
        ) : messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground flex items-center gap-2"><Sparkles className="w-4 h-4 shrink-0 text-primary" />Ask anything about this question. Answers are grounded in the {chosen.map((c) => c.replace(/-/g, ' ')).join(' + ') || 'subject'} books. Long-press an equation to save it.</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" disabled={busy} onClick={() => send(s)}
                  className="rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-xs hover:bg-secondary disabled:opacity-50">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => {
          if (m.role === 'assistant' && !m.content && busy && m === last) return null;
          return (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
              <div className={m.role === 'user'
                ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-3 py-2 text-sm whitespace-pre-wrap break-words'
                : 'max-w-full rounded-2xl rounded-bl-sm bg-secondary px-3 py-2 text-sm leading-relaxed break-words'}>
                {m.role === 'user' ? m.content : <TutorMarkdown text={m.content} onPickEquation={favourite} />}
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
          );
        })}
        {busy && !last?.content && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{status || 'Thinking…'}</p>}
        <div ref={endRef} />
      </div>

      <div className="shrink-0 border-t border-border bg-background p-3 space-y-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
          <Textarea
            value={draft} onChange={(e) => setDraft(e.target.value)} rows={1} maxLength={2000}
            placeholder={out ? 'Hourly AI limit reached' : 'Ask the tutor…'}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(draft); } }}
            className="min-h-11 max-h-32 resize-none text-base"
          />
          <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={busy || !draft.trim()} aria-label="Send">
            <SendHorizonal className="w-5 h-5" />
          </Button>
        </form>
        {quota && (
          <button type="button" onClick={() => openPaywall({ code: out ? 'ai_quota' : 'manual', message: out ? `You've used all ${quota.limit} AI prompts for this hour.${resetIn(quota)}` : undefined })}
            className="text-[11px] text-muted-foreground underline-offset-2 hover:underline hover:text-foreground">
            {quota.unlimited ? 'Unlimited AI prompts · Contributor'
              : `${quota.remaining}/${quota.limit} AI prompts left this hour${quota.plan === 'pro' ? ' · Pro' : ' · Get more'}${out ? '.' + resetIn(quota) : ''}`}
          </button>
        )}
      </div>
    </div>
  );
}
