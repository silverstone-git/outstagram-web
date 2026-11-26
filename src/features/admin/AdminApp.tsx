// Outsie admin panel (/admin/). Every number comes from the API; every write is audit-logged server side.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle, Ban, Check, ExternalLink, Eye, FileText, Flag as FlagIcon, Inbox, Loader2, LogOut, Mail,
  RefreshCw, ScanSearch, Search, Shield, ShieldCheck, Trash2, UserRound, Users, Video,
} from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { BrandMark } from '../../components/Brand';
import { ThemeToggle } from '../../lib/theme';
import { postHref, profileHref } from '../public/routes';
import {
  call, completeGoogle, session, signOut, startGoogle,
  type AdminPost, type AuditEntry, type Flag, type MailResult, type Overview, type QueueItem, type Risk,
  type Session, type UserDetail, type UserRow,
} from './api';

// ---- small helpers ---------------------------------------------------------------------------------

function ago(iso: string | null | undefined): string {
  if (!iso) return '—';
  const t = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`).getTime();
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(t).toLocaleDateString();
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

function mailToast(m: MailResult, what: string) {
  if (!m) toast.success(what);
  else if (m.sent) toast.success(`${what} · email sent`);
  else toast.warning(`${what} · email NOT sent: ${m.error}`);
}

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const cls = score >= 0.8 ? 'bg-red-600 text-white' : score >= 0.6 ? 'bg-orange-500 text-white'
    : score >= 0.3 ? 'bg-yellow-400 text-black' : 'bg-muted text-muted-foreground';
  return <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums ${cls}`}>{pct}%</span>;
}

function RiskBadge({ risk }: { risk: Risk }) {
  if (!risk.score) return <span className="text-xs text-muted-foreground">—</span>;
  const cls = risk.score >= 6 ? 'bg-red-600 text-white' : risk.score >= 3 ? 'bg-orange-500 text-white' : 'bg-yellow-400 text-black';
  return (
    <span title={risk.reasons.join('\n')} className={`inline-flex cursor-help rounded px-1.5 py-0.5 text-xs font-semibold ${cls}`}>
      risk {risk.score}
    </span>
  );
}

function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    setLoading(true);
    fn().then((d) => { setData(d); setError(null); }).catch((e) => setError(errMsg(e))).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { reload(); }, [reload]);
  return { data, loading, error, reload };
}

function ErrorBox({ error }: { error: string | null }) {
  return error ? <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null;
}

// ---- remove / freeze dialog ------------------------------------------------------------------------

const REASONS = ['spam', 'scam', 'nudity', 'sexual content', 'harassment', 'hate', 'violence', 'self-harm', 'illegal', 'impersonation'];

type ActionSpec = {
  title: string; description: string; confirm: string; destructive?: boolean; notifyDefault?: boolean;
  needsReason?: boolean; noNotify?: boolean; run: (args: { reason: string; notify: boolean; message: string | null }) => Promise<void>;
};

function ActionDialog({ spec, onClose, mail }: { spec: ActionSpec | null; onClose: () => void; mail: boolean }) {
  const [reason, setReason] = useState('');
  const [notify, setNotify] = useState(true);
  const [custom, setCustom] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (spec) { setReason(''); setNotify(spec.notifyDefault ?? true); setCustom(false); setMessage(''); }
  }, [spec]);
  if (!spec) return null;
  const go = async () => {
    setBusy(true);
    try {
      await spec.run({ reason: reason.trim(), notify: !spec.noNotify && notify, message: custom && message.trim() ? message.trim() : null });
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{spec.title}</DialogTitle>
          <DialogDescription>{spec.description}</DialogDescription>
        </DialogHeader>
        {spec.needsReason !== false && (
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (shown to the user in the email)</Label>
            <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. spam" maxLength={500} />
            <div className="flex flex-wrap gap-1">
              {REASONS.map((r) => (
                <button key={r} type="button" onClick={() => setReason(r)}
                  className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">{r}</button>
              ))}
            </div>
          </div>
        )}
        {!spec.noNotify && (
          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="notify" className="flex items-center gap-2"><Mail className="h-4 w-4" /> Notify by email</Label>
              <Switch id="notify" checked={notify} onCheckedChange={setNotify} />
            </div>
            {!mail && <p className="text-xs text-orange-600">Email isn't configured on the server (OUTSIE_SMTP_HOST), so no email will go out.</p>}
            {notify && (
              <>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox checked={custom} onCheckedChange={(v) => setCustom(Boolean(v))} /> Write my own message instead of the standard one
                </label>
                {custom && <Textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Hi …" maxLength={5000} />}
              </>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant={spec.destructive ? 'destructive' : 'default'} onClick={go} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {spec.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- shared actions ----------------------------------------------------------------------------------

function useActions(after: () => void) {
  const [spec, setSpec] = useState<ActionSpec | null>(null);
  const removePost = (p: { post_id: string; author: string | null }) => setSpec({
    title: 'Delete post', destructive: true, confirm: 'Delete post',
    description: `Deletes the post${p.author ? ` by @${p.author}` : ''}, its comments and likes, and its files in the bucket. This can't be undone.`,
    run: async (a) => {
      const r = await call<{ email: MailResult }>(`/admin/posts/${encodeURIComponent(p.post_id)}/delete`, { method: 'POST', json: a });
      mailToast(r.email, 'Post deleted'); after();
    },
  });
  const removePosts = (ids: string[]) => setSpec({
    title: `Delete ${ids.length} posts`, destructive: true, confirm: `Delete ${ids.length}`, notifyDefault: false,
    description: 'Deletes every selected post with its comments, likes and files. Each author gets their own email if you notify.',
    run: async (a) => {
      const r = await call<{ deleted: string[]; failed: unknown[]; emails_sent: number }>('/admin/posts/bulk-delete',
        { method: 'POST', json: { ...a, post_ids: ids } });
      toast.success(`Deleted ${r.deleted.length}${r.failed.length ? `, ${r.failed.length} failed` : ''}${a.notify ? ` · ${r.emails_sent} emails` : ''}`);
      after();
    },
  });
  const removeComment = (c: { comment_id: number }, author?: string | null) => setSpec({
    title: 'Delete comment', destructive: true, confirm: 'Delete comment', notifyDefault: false,
    description: `Deletes this comment${author ? ` by @${author}` : ''}. This can't be undone.`,
    run: async (a) => {
      const r = await call<{ email: MailResult }>(`/admin/comments/${c.comment_id}/delete`, { method: 'POST', json: a });
      mailToast(r.email, 'Comment deleted'); after();
    },
  });
  const freeze = (u: { user_id: number; username: string }) => setSpec({
    title: `Freeze @${u.username}`, destructive: true, confirm: 'Freeze account',
    description: 'They are signed out everywhere and can\'t sign in; their posts, comments and profile are hidden from everyone. Nothing is deleted and you can unfreeze any time.',
    run: async (a) => {
      const r = await call<{ email: MailResult }>(`/admin/users/${u.user_id}/freeze`, { method: 'POST', json: a });
      mailToast(r.email, `@${u.username} frozen`); after();
    },
  });
  const unfreeze = (u: { user_id: number; username: string }) => setSpec({
    title: `Unfreeze @${u.username}`, confirm: 'Unfreeze', needsReason: false,
    description: 'They can sign in again and their content becomes visible.',
    run: async (a) => {
      const r = await call<{ email: MailResult }>(`/admin/users/${u.user_id}/unfreeze`, { method: 'POST', json: { notify: a.notify, message: a.message } });
      mailToast(r.email, `@${u.username} unfrozen`); after();
    },
  });
  return { spec, close: () => setSpec(null), removePost, removePosts, removeComment, freeze, unfreeze };
}

// ---- post card ---------------------------------------------------------------------------------------

function Media({ m }: { m: { url: string; media_type: string } }) {
  if (m.media_type === 'video') {
    return (
      <a href={m.url} target="_blank" rel="noreferrer" className="relative flex aspect-square items-center justify-center rounded bg-muted">
        <Video className="h-6 w-6 text-muted-foreground" />
      </a>
    );
  }
  return (
    <a href={m.url} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded bg-muted">
      <img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover" />
    </a>
  );
}

function PostCard({ p, selected, onSelect, onDelete, onUser, onScan, extra }: {
  p: AdminPost; selected?: boolean; onSelect?: (v: boolean) => void; onDelete: () => void;
  onUser?: (id: number) => void; onScan?: () => void; extra?: ReactNode;
}) {
  return (
    <div className={`rounded-lg border bg-card p-3 ${selected ? 'ring-2 ring-primary' : ''}`}>
      <div className="mb-2 flex items-center gap-2 text-sm">
        {onSelect && <Checkbox checked={!!selected} onCheckedChange={(v) => onSelect(Boolean(v))} />}
        <button className="font-medium hover:underline" onClick={() => p.author_user_id && onUser?.(p.author_user_id)}>
          @{p.author ?? 'deleted'}
        </button>
        {p.author_frozen && <Badge variant="destructive">frozen</Badge>}
        <span className="text-xs text-muted-foreground">{ago(p.datetime_posted)} · {p.post_category}</span>
        <span className="ml-auto flex items-center gap-1">
          {p.scan ? <ScoreBadge score={p.scan.score} /> : <span className="text-xs text-muted-foreground">unscanned</span>}
          {p.open_flags > 0 && <Badge variant="outline" className="gap-1"><FlagIcon className="h-3 w-3" />{p.open_flags}</Badge>}
        </span>
      </div>
      {p.media.length > 0 && (
        <div className={`mb-2 grid gap-1 ${p.media.length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
          {p.media.slice(0, 6).map((m) => <Media key={m.url} m={m} />)}
        </div>
      )}
      {p.caption && <p className="mb-2 whitespace-pre-wrap break-words text-sm">{p.caption}</p>}
      {p.scan && p.scan.labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">{p.scan.labels.map((l) => <Badge key={l} variant="secondary">{l}</Badge>)}</div>
      )}
      {extra}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>♥ {p.like_count} · 💬 {p.comment_count}</span>
        <a className="inline-flex items-center gap-1 hover:text-foreground" href={postHref(p.post_id)} target="_blank" rel="noreferrer">
          <ExternalLink className="h-3 w-3" /> open
        </a>
        <span className="ml-auto flex gap-1">
          {onScan && <Button size="sm" variant="ghost" onClick={onScan} title="Re-scan with the models"><ScanSearch className="h-4 w-4" /></Button>}
          <Button size="sm" variant="destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /> Delete</Button>
        </span>
      </div>
    </div>
  );
}

// ---- overview ----------------------------------------------------------------------------------------

function Stat({ label, value, sub, onClick }: { label: string; value: ReactNode; sub?: ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={!onClick}
      className="rounded-lg border bg-card p-4 text-left enabled:hover:border-primary disabled:cursor-default">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </button>
  );
}

function OverviewTab({ ov, go }: { ov: Overview; go: (tab: string, filter?: string) => void }) {
  const m = ov.moderation;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Review queue" value={ov.queue.open} sub={`${ov.queue.post ?? 0} posts · ${ov.queue.comment ?? 0} comments · ${ov.queue.user ?? 0} users`} onClick={() => go('queue')} />
        <Stat label="Suspicious accounts" value={ov.suspicious} sub="risk score ≥ 3" onClick={() => go('users', 'suspicious')} />
        <Stat label="Frozen accounts" value={ov.users.frozen} onClick={() => go('users', 'frozen')} />
        <Stat label="Unscanned posts" value={ov.posts.unscanned} sub="use “Scan backlog” in the queue" onClick={() => go('queue')} />
        <Stat label="Users" value={ov.users.total} sub={`+${ov.users.new_24h} today · +${ov.users.new_7d} this week`} onClick={() => go('users', 'new')} />
        <Stat label="Confirmed emails" value={ov.users.verified} sub={`${ov.users.total - ov.users.verified} unconfirmed`} onClick={() => go('users', 'unverified')} />
        <Stat label="Posts" value={ov.posts.total} sub={`+${ov.posts.new_24h} today · +${ov.posts.new_7d} this week`} onClick={() => go('posts')} />
        <Stat label="Comments" value={ov.comments.total} sub={`+${ov.comments.new_24h} today`} />
        <Stat label="Likes (24h)" value={ov.likes_24h} />
        <Stat label="Exams taken (24h)" value={ov.exams_24h} />
        <Stat label="AI prompts (24h)" value={ov.ai_prompts_24h} />
        <Stat label="Paid users" value={ov.users.paid} sub={`₹${(ov.revenue_30d_paise / 100).toLocaleString('en-IN')} paid in 30 days`} />
      </div>
      <div className="rounded-lg border bg-card p-4 text-sm">
        <div className="mb-2 font-medium">Moderation engines</div>
        <ul className="space-y-1 text-muted-foreground">
          <li><Check className="mr-1 inline h-4 w-4 text-green-600" /> Rules (links, scam words, repeats, blocklist): always on</li>
          <li>{m.ml ? <Check className="mr-1 inline h-4 w-4 text-green-600" /> : <Ban className="mr-1 inline h-4 w-4" />}
            LLM review of text + photos{m.ml_model ? ` (${m.ml_model})` : ': off (OUTSIE_MOD_ML / LITELLM_MASTER_KEY)'}</li>
          <li>{m.vision ? <Check className="mr-1 inline h-4 w-4 text-green-600" /> : <Ban className="mr-1 inline h-4 w-4" />}
            Google Cloud Vision SafeSearch{m.vision ? '' : ': off (OUTSIE_MOD_VISION=1 to turn on, 1,000 images/month free)'}</li>
          {m.vision && m.vision_usage && (
            <li className="pl-5">Vision this month: {m.vision_usage.used} / {m.vision_usage.cap} images
              {m.vision_usage.exhausted ? ' · paused until next month (Flash-Lite still checks photos)' : ` · ${m.vision_usage.remaining} left`}</li>
          )}
          <li>{m.autoscan ? <Check className="mr-1 inline h-4 w-4 text-green-600" /> : <Ban className="mr-1 inline h-4 w-4" />}
            Scan new posts and comments automatically</li>
          <li>Flags open at score ≥ {Math.round(m.threshold * 100)}%</li>
          <li>{ov.mail ? <Check className="mr-1 inline h-4 w-4 text-green-600" /> : <AlertTriangle className="mr-1 inline h-4 w-4 text-orange-600" />}
            Email notices{ov.mail ? '' : ': not configured (OUTSIE_SMTP_HOST, OUTSIE_MAIL_FROM)'}</li>
        </ul>
      </div>
    </div>
  );
}

// ---- review queue ----------------------------------------------------------------------------------

function FlagLine({ f, prefix }: { f: Flag & { reporter?: string | null }; prefix?: string }) {
  return (
    <li className="flex flex-wrap items-center gap-1 text-xs">
      {prefix && <span className="mr-1 font-medium">{prefix}</span>}
      <Badge variant={f.source === 'report' ? 'default' : 'outline'}>{f.source === 'report' ? `report${f.reporter ? ` by @${f.reporter}` : ''}` : f.source}</Badge>
      <ScoreBadge score={f.score} />
      {f.labels.map((l) => <Badge key={l} variant="secondary">{l}</Badge>)}
      {f.note && <span className="text-muted-foreground">{f.note}</span>}
      <span className="ml-auto text-muted-foreground">{ago(f.created_at)}</span>
    </li>
  );
}

function QueueTab({ mail, onUser, refreshOverview }: { mail: boolean; onUser: (id: number) => void; refreshOverview: () => void }) {
  const [kind, setKind] = useState<string>('');
  const [status, setStatus] = useState('open');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const { data, loading, error, reload } = useLoad(
    () => call<{ total: number; items: QueueItem[] }>(`/admin/moderation/queue?status=${status}&offset=${page * 30}&limit=30${kind ? `&kind=${kind}` : ''}`),
    [kind, status, page]);
  const refresh = () => { setSelected(new Set()); reload(); refreshOverview(); };
  const act = useActions(refresh);
  const dismiss = async (it: QueueItem) => {
    try {
      await call('/admin/moderation/dismiss', { method: 'POST', json: { kind: it.kind, target_id: it.target_id } });
      toast.success('Kept up, flags dismissed'); refresh();
    } catch (e) { toast.error(errMsg(e)); }
  };
  const scan = async () => {
    setScanning(true);
    try {
      const r = await call<{ scanned: number; flagged: number; remaining: number }>('/admin/moderation/scan?limit=20', { method: 'POST' });
      toast.success(`Scanned ${r.scanned}, flagged ${r.flagged}. ${r.remaining} left.`); refresh();
    } catch (e) { toast.error(errMsg(e)); } finally { setScanning(false); }
  };
  const postIds = (data?.items ?? []).filter((i) => i.kind === 'post' && !i.gone).map((i) => i.target_id);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {[['', 'All'], ['post', 'Posts'], ['comment', 'Comments'], ['user', 'Accounts']].map(([k, l]) => (
          <Button key={k} size="sm" variant={kind === k ? 'default' : 'outline'} onClick={() => { setKind(k); setPage(0); }}>{l}</Button>
        ))}
        <span className="mx-1 h-6 w-px bg-border" />
        {['open', 'dismissed', 'actioned'].map((s) => (
          <Button key={s} size="sm" variant={status === s ? 'secondary' : 'ghost'} onClick={() => { setStatus(s); setPage(0); }}>{s}</Button>
        ))}
        <span className="ml-auto flex gap-2">
          {status === 'open' && postIds.length > 0 && (
            <>
              <Button size="sm" variant="outline" onClick={() => setSelected(selected.size === postIds.length ? new Set() : new Set(postIds))}>
                {selected.size === postIds.length ? 'Select none' : 'Select all posts'}
              </Button>
              {selected.size > 0 && (
                <Button size="sm" variant="destructive" onClick={() => act.removePosts([...selected])}><Trash2 className="h-4 w-4" /> Delete {selected.size}</Button>
              )}
            </>
          )}
          <Button size="sm" variant="outline" onClick={scan} disabled={scanning} title="Run the models over posts that were never scanned (20 at a time)">
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />} Scan backlog
          </Button>
          <Button size="sm" variant="ghost" onClick={refresh}><RefreshCw className="h-4 w-4" /></Button>
        </span>
      </div>
      <ErrorBox error={error} />
      {loading && !data && <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />}
      {data && data.items.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          <Inbox className="mx-auto mb-2 h-8 w-8" /> Nothing {status === 'open' ? 'to review' : status}.
        </div>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {data?.items.map((it) => {
          const flags = <ul className="mb-2 space-y-1 rounded-md bg-muted/40 p-2">{it.flags.map((f) => <FlagLine key={f.id} f={f} />)}</ul>;
          const owner = it.user && (
            <div className="mb-2 flex items-center gap-2 text-xs">
              <button className="font-medium hover:underline" onClick={() => onUser(it.user!.user_id)}>@{it.user.username}</button>
              <RiskBadge risk={it.user.risk} />
              {it.user.frozen && <Badge variant="destructive">frozen</Badge>}
              {status === 'open' && !it.user.frozen && (
                <Button size="sm" variant="outline" className="ml-auto h-7" onClick={() => act.freeze(it.user!)}><Ban className="h-3 w-3" /> Freeze author</Button>
              )}
            </div>
          );
          const keep = status === 'open' && (
            <Button size="sm" variant="outline" onClick={() => dismiss(it)}><ShieldCheck className="h-4 w-4" /> Keep</Button>
          );
          if (it.kind === 'post' && it.post) {
            return (
              <PostCard key={`${it.kind}:${it.target_id}`} p={it.post} onUser={onUser}
                selected={selected.has(it.target_id)}
                onSelect={status === 'open' ? (v) => setSelected((s) => { const n = new Set(s); if (v) n.add(it.target_id); else n.delete(it.target_id); return n; }) : undefined}
                onDelete={() => act.removePost(it.post!)}
                extra={<>{flags}{owner}{keep && <div className="mb-2">{keep}</div>}</>} />
            );
          }
          return (
            <div key={`${it.kind}:${it.target_id}`} className="rounded-lg border bg-card p-3">
              <div className="mb-2 flex items-center gap-2 text-sm">
                <Badge variant="outline">{it.kind}</Badge>
                <ScoreBadge score={it.score} />
                {it.gone && <Badge variant="secondary">already gone</Badge>}
              </div>
              {it.kind === 'comment' && it.comment && (
                <blockquote className="mb-2 border-l-2 pl-3 text-sm">
                  {it.comment.content}
                  <div className="mt-1 text-xs text-muted-foreground">
                    {ago(it.comment.datetime_commented)} · <a className="hover:underline" href={postHref(it.comment.post_id)} target="_blank" rel="noreferrer">on this post</a>
                  </div>
                </blockquote>
              )}
              {flags}
              {owner}
              <div className="flex gap-2">
                {keep}
                {it.kind === 'comment' && it.comment && status === 'open' && (
                  <Button size="sm" variant="destructive" onClick={() => act.removeComment(it.comment!, it.user?.username)}><Trash2 className="h-4 w-4" /> Delete comment</Button>
                )}
                {it.kind === 'user' && it.user && (
                  <Button size="sm" variant="secondary" onClick={() => onUser(it.user!.user_id)}><Eye className="h-4 w-4" /> Open account</Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {data && data.total > 30 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</Button>
          <span>{page * 30 + 1}–{Math.min(data.total, (page + 1) * 30)} of {data.total}</span>
          <Button size="sm" variant="outline" disabled={(page + 1) * 30 >= data.total} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
      <ActionDialog spec={act.spec} onClose={act.close} mail={mail} />
    </div>
  );
}

// ---- users -------------------------------------------------------------------------------------------

function UsersTab({ mail, onUser, initialFilter, version }: { mail: boolean; onUser: (id: number) => void; initialFilter: string; version: number }) {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(initialFilter);
  const [page, setPage] = useState(0);
  useEffect(() => { setFilter(initialFilter); setPage(0); }, [initialFilter]);
  const { data, loading, error, reload } = useLoad(
    () => call<{ total: number; users: UserRow[] }>(`/admin/users?filter=${filter}&q=${encodeURIComponent(query)}&offset=${page * 50}&limit=50`),
    [filter, query, page, version]);
  const act = useActions(reload);
  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); setQuery(q); setPage(0); }}>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="w-72 pl-8" placeholder="username, name, email or id" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {[['all', 'All'], ['suspicious', 'Suspicious'], ['new', 'New (7d)'], ['unverified', 'Unconfirmed'], ['frozen', 'Frozen']].map(([k, l]) => (
          <Button key={k} type="button" size="sm" variant={filter === k ? 'default' : 'outline'} onClick={() => { setFilter(k); setPage(0); }}>{l}</Button>
        ))}
        <span className="ml-auto text-sm text-muted-foreground">{data ? `${data.total} accounts` : ''}</span>
      </form>
      <ErrorBox error={error} />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-2">Account</th><th className="p-2">Email</th><th className="p-2">Joined</th><th className="p-2">Plan</th>
              <th className="p-2 text-right">Posts</th><th className="p-2">Risk</th><th className="p-2">Status</th><th className="p-2" /></tr>
          </thead>
          <tbody>
            {loading && !data && <tr><td colSpan={8} className="p-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>}
            {data?.users.map((u) => (
              <tr key={u.user_id} className="cursor-pointer border-t hover:bg-muted/30" onClick={() => onUser(u.user_id)}>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    {u.avatar_url ? <img src={u.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" /> : <UserRound className="h-7 w-7 rounded-full bg-muted p-1" />}
                    <div><div className="font-medium">@{u.username}</div><div className="text-xs text-muted-foreground">{u.fullname}</div></div>
                  </div>
                </td>
                <td className="p-2"><span className="break-all">{u.email}</span> {!u.email_verified && <Badge variant="outline" className="ml-1">unconfirmed</Badge>}</td>
                <td className="p-2 whitespace-nowrap text-muted-foreground">{ago(u.created_at)}</td>
                <td className="p-2">{u.plan}</td>
                <td className="p-2 text-right tabular-nums">{u.posts}</td>
                <td className="p-2"><RiskBadge risk={u.risk} /></td>
                <td className="p-2">{u.frozen ? <Badge variant="destructive" title={u.frozen_reason ?? ''}>frozen</Badge> : <span className="text-xs text-muted-foreground">active</span>}</td>
                <td className="p-2" onClick={(e) => e.stopPropagation()}>
                  {u.frozen
                    ? <Button size="sm" variant="outline" onClick={() => act.unfreeze(u)}>Unfreeze</Button>
                    : <Button size="sm" variant="destructive" onClick={() => act.freeze(u)}><Ban className="h-4 w-4" /> Freeze</Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && data.total > 50 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</Button>
          <span>{page * 50 + 1}–{Math.min(data.total, (page + 1) * 50)} of {data.total}</span>
          <Button size="sm" variant="outline" disabled={(page + 1) * 50 >= data.total} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
      <ActionDialog spec={act.spec} onClose={act.close} mail={mail} />
    </div>
  );
}

// ---- one user (sheet) ----------------------------------------------------------------------------------

function UserSheet({ id, onClose, mail, onChanged }: { id: number | null; onClose: () => void; mail: boolean; onChanged: () => void }) {
  const [u, setU] = useState<UserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const load = useCallback(() => {
    if (id == null) return;
    call<UserDetail>(`/admin/users/${id}`).then((d) => { setU(d); setError(null); }).catch((e) => setError(errMsg(e)));
  }, [id]);
  useEffect(() => { setU(null); load(); }, [load]);
  const changed = () => { load(); onChanged(); };
  const act = useActions(changed);
  const simple = async (path: string, method: string, ok: string, json?: unknown) => {
    try { await call(path, { method, json }); toast.success(ok); changed(); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <Sheet open={id != null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {u?.avatar_url ? <img src={u.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <UserRound className="h-10 w-10 rounded-full bg-muted p-2" />}
            <span>{u ? `@${u.username}` : 'Loading…'}</span>
            {u?.frozen && <Badge variant="destructive">frozen</Badge>}
            {u && <RiskBadge risk={u.risk} />}
          </SheetTitle>
          <SheetDescription>{u ? `${u.fullname} · ${u.email} · id ${u.user_id}` : ''}</SheetDescription>
        </SheetHeader>
        <div className="space-y-5 px-4 pb-8">
          <ErrorBox error={error} />
          {u && (
            <>
              {u.frozen && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                  Frozen {ago(u.frozen_at)}{u.frozen_reason ? `: ${u.frozen_reason}` : ''}
                </div>
              )}
              {u.risk.reasons.length > 0 && (
                <div className="rounded-md border border-orange-400/50 bg-orange-400/10 p-3 text-sm">
                  <div className="mb-1 font-medium">Why it looks suspicious</div>
                  <ul className="list-inside list-disc text-muted-foreground">{u.risk.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {u.frozen
                  ? <Button size="sm" onClick={() => act.unfreeze(u)}><Check className="h-4 w-4" /> Unfreeze</Button>
                  : <Button size="sm" variant="destructive" onClick={() => act.freeze(u)}><Ban className="h-4 w-4" /> Freeze</Button>}
                <Button size="sm" variant="outline" onClick={() => setEmailOpen(true)}><Mail className="h-4 w-4" /> Email</Button>
                {!u.email_verified && <Button size="sm" variant="outline" onClick={() => simple(`/admin/users/${u.user_id}/verify-email`, 'POST', 'Email marked confirmed')}>Mark email confirmed</Button>}
                <Button size="sm" variant="outline" onClick={() => simple(`/admin/users/${u.user_id}/sessions`, 'DELETE', 'Signed out everywhere')}>Sign out everywhere ({u.active_sessions})</Button>
                {u.avatar_url && <Button size="sm" variant="outline" onClick={() => simple(`/admin/users/${u.user_id}/avatar`, 'DELETE', 'Profile photo removed')}>Remove photo</Button>}
                <a href={profileHref(u.username)} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost"><ExternalLink className="h-4 w-4" /> Profile</Button></a>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4" /> Delete account</Button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {[['Joined', ago(u.created_at)], ['Email', u.email_verified ? 'confirmed' : 'unconfirmed'], ['Posts', u.posts], ['Comments', u.comments],
                  ['Followers', u.followers], ['Following', u.following], ['Exams', u.exam_attempts], ['AI prompts 24h', u.ai_prompts_24h],
                  ['Born', u.date_of_birth ?? '—']].map(([k, v]) => (
                  <div key={String(k)} className="rounded border p-2"><div className="text-xs text-muted-foreground">{k}</div><div className="font-medium">{v}</div></div>
                ))}
              </div>
              {u.bio && <p className="text-sm text-muted-foreground">“{u.bio}”</p>}
              <PlanEditor u={u} onSave={(plan, days) => simple(`/admin/users/${u.user_id}/plan`, 'PUT', `Plan set to ${plan}`, { plan, days })} />
              <section>
                <h3 className="mb-2 font-medium">Posts ({u.posts})</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {u.posts_recent.map((p) => <PostCard key={p.post_id} p={p} onDelete={() => act.removePost(p)} />)}
                  {u.posts_recent.length === 0 && <p className="text-sm text-muted-foreground">No posts.</p>}
                </div>
              </section>
              <section>
                <h3 className="mb-2 font-medium">Recent comments</h3>
                <ul className="space-y-1 text-sm">
                  {u.comments_recent.map((c) => (
                    <li key={c.comment_id} className="flex items-start gap-2 rounded border p-2">
                      <span className="flex-1 break-words">{c.content}<span className="ml-2 text-xs text-muted-foreground">{ago(c.datetime_commented)}</span></span>
                      <Button size="sm" variant="ghost" onClick={() => act.removeComment(c, u.username)}><Trash2 className="h-4 w-4" /></Button>
                    </li>
                  ))}
                  {u.comments_recent.length === 0 && <li className="text-muted-foreground">No comments.</li>}
                </ul>
              </section>
              {u.flags.length > 0 && (
                <section>
                  <h3 className="mb-2 font-medium">Flags</h3>
                  <ul className="space-y-1 rounded-md bg-muted/40 p-2">{u.flags.map((f) => (
                    <FlagLine key={f.id} f={f} prefix={`${f.kind} · ${f.status}`} />
                  ))}</ul>
                </section>
              )}
              {u.payments.length > 0 && (
                <section>
                  <h3 className="mb-2 font-medium">Payments</h3>
                  <ul className="space-y-1 text-xs">{u.payments.map((p) => (
                    <li key={p.order_id} className="flex gap-2"><span className="font-mono">{p.order_id}</span><span>{p.plan}</span>
                      <span>₹{(p.amount / 100).toFixed(2)}</span><Badge variant={p.status === 'paid' ? 'default' : 'outline'}>{p.status}</Badge>
                      <span className="ml-auto text-muted-foreground">{ago(p.created)}</span></li>
                  ))}</ul>
                </section>
              )}
              {u.actions.length > 0 && (
                <section>
                  <h3 className="mb-2 font-medium">Admin history</h3>
                  <ul className="space-y-1 text-xs">{u.actions.map((a) => (
                    <li key={a.id} className="flex gap-2"><Badge variant="outline">{a.action}</Badge><span className="text-muted-foreground">{a.admin}</span>
                      <span className="truncate">{String(a.detail.reason ?? a.detail.subject ?? a.detail.plan ?? '')}</span>
                      <span className="ml-auto text-muted-foreground">{ago(a.created_at)}</span></li>
                  ))}</ul>
                </section>
              )}
            </>
          )}
        </div>
        <ActionDialog spec={act.spec} onClose={act.close} mail={mail} />
        {u && <EmailDialog open={emailOpen} onClose={() => setEmailOpen(false)} u={u} mail={mail} onSent={changed} />}
        {u && <DeleteUserDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} u={u} onDeleted={() => { onChanged(); onClose(); }} />}
      </SheetContent>
    </Sheet>
  );
}

function PlanEditor({ u, onSave }: { u: UserDetail; onSave: (plan: string, days: number | null) => void }) {
  const [plan, setPlan] = useState(u.plan);
  const [days, setDays] = useState('30');
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm">
      <span className="font-medium">Plan</span>
      <span className="text-muted-foreground">now {u.plan}{u.plan_valid_until ? ` until ${new Date(u.plan_valid_until).toLocaleDateString()}` : ''}</span>
      <select className="ml-auto rounded-md border bg-background px-2 py-1" value={plan} onChange={(e) => setPlan(e.target.value)}>
        {['free', 'pro', 'contributor'].map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      {plan !== 'free' && (
        <Input className="w-24" type="number" min={1} max={3650} value={days} onChange={(e) => setDays(e.target.value)} placeholder="days" title="Days (empty = forever)" />
      )}
      <Button size="sm" variant="outline" onClick={() => onSave(plan, plan === 'free' || !days ? null : Number(days))}>Set</Button>
    </div>
  );
}

function EmailDialog({ open, onClose, u, mail, onSent }: { open: boolean; onClose: () => void; u: UserDetail; mail: boolean; onSent: () => void }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setSubject(''); setBody(`Hi ${u.fullname || u.username},\n\n`); } }, [open, u]);
  const send = async () => {
    setBusy(true);
    try {
      await call(`/admin/users/${u.user_id}/email`, { method: 'POST', json: { subject, body } });
      toast.success(`Email sent to ${u.email}`); onSent(); onClose();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Email @{u.username}</DialogTitle><DialogDescription>To {u.email}. Signed “— the Outstagram team”.</DialogDescription></DialogHeader>
        {!mail && <p className="text-sm text-orange-600">Email isn't configured on the server yet.</p>}
        <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
        <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} maxLength={10000} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={send} disabled={busy || !subject.trim() || !body.trim()}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteUserDialog({ open, onClose, u, onDeleted }: { open: boolean; onClose: () => void; u: UserDetail; onDeleted: () => void }) {
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setConfirm(''); }, [open]);
  const go = async () => {
    setBusy(true);
    try {
      await call(`/admin/users/${u.user_id}/delete`, { method: 'POST', json: { confirm_username: confirm } });
      toast.success(`@${u.username} deleted`); onClose(); onDeleted();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete @{u.username} for good?</DialogTitle>
          <DialogDescription>Removes the account with all its posts, files, comments, likes, follows, exam history and plan. Freezing is usually enough; this can't be undone.</DialogDescription>
        </DialogHeader>
        <Label htmlFor="confirm">Type <span className="font-mono">{u.username}</span> to confirm</Label>
        <Input id="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" disabled={busy || confirm !== u.username} onClick={go}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Delete forever</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- posts -------------------------------------------------------------------------------------------

function PostsTab({ mail, onUser, version }: { mail: boolean; onUser: (id: number) => void; version: number }) {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [flagged, setFlagged] = useState(false);
  const [risky, setRisky] = useState(false);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data, loading, error, reload } = useLoad(
    () => call<{ total: number; posts: AdminPost[] }>(`/admin/posts?q=${encodeURIComponent(query)}&flagged=${flagged}${risky ? '&min_score=0.3' : ''}&offset=${page * 48}&limit=48`),
    [query, flagged, risky, page, version]);
  const refresh = () => { setSelected(new Set()); reload(); };
  const act = useActions(refresh);
  const rescan = async (id: string) => {
    try {
      const r = await call<{ score: number; flagged: boolean }>(`/admin/posts/${encodeURIComponent(id)}/scan`, { method: 'POST' });
      toast.success(`Score ${Math.round(r.score * 100)}%${r.flagged ? ' · flagged for review' : ''}`); reload();
    } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); setQuery(q); setPage(0); }}>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="w-72 pl-8" placeholder="caption, @author or post id" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm"><Switch checked={flagged} onCheckedChange={(v) => { setFlagged(v); setPage(0); }} /> Open flags only</label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={risky} onCheckedChange={(v) => { setRisky(v); setPage(0); }} /> Model score ≥ 30%</label>
        <span className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          {data ? `${data.total} posts` : ''}
          {selected.size > 0 && <Button size="sm" variant="destructive" type="button" onClick={() => act.removePosts([...selected])}><Trash2 className="h-4 w-4" /> Delete {selected.size}</Button>}
        </span>
      </form>
      <ErrorBox error={error} />
      {loading && !data && <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data?.posts.map((p) => (
          <PostCard key={p.post_id} p={p} onUser={onUser} onDelete={() => act.removePost(p)} onScan={() => rescan(p.post_id)}
            selected={selected.has(p.post_id)}
            onSelect={(v) => setSelected((s) => { const n = new Set(s); if (v) n.add(p.post_id); else n.delete(p.post_id); return n; })} />
        ))}
      </div>
      {data && data.total > 48 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</Button>
          <span>{page * 48 + 1}–{Math.min(data.total, (page + 1) * 48)} of {data.total}</span>
          <Button size="sm" variant="outline" disabled={(page + 1) * 48 >= data.total} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
      <ActionDialog spec={act.spec} onClose={act.close} mail={mail} />
    </div>
  );
}

// ---- audit ---------------------------------------------------------------------------------------------

function AuditTab({ onUser, version }: { onUser: (id: number) => void; version: number }) {
  const { data, error } = useLoad(() => call<{ total: number; actions: AuditEntry[] }>('/admin/audit?limit=200'), [version]);
  return (
    <div className="space-y-2">
      <ErrorBox error={error} />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-2">When</th><th className="p-2">Admin</th><th className="p-2">Action</th><th className="p-2">Target</th><th className="p-2">Details</th></tr>
          </thead>
          <tbody>
            {data?.actions.map((a) => (
              <tr key={a.id} className="border-t align-top">
                <td className="p-2 whitespace-nowrap text-muted-foreground" title={a.created_at}>{ago(a.created_at)}</td>
                <td className="p-2">{a.admin}</td>
                <td className="p-2"><Badge variant="outline">{a.action}</Badge></td>
                <td className="p-2">
                  {a.target_kind === 'user' && /^\d+$/.test(a.target_id)
                    ? <button className="hover:underline" onClick={() => onUser(Number(a.target_id))}>user {String(a.detail.username ?? a.target_id)}</button>
                    : `${a.target_kind} ${a.target_id}`}
                </td>
                <td className="p-2 text-xs text-muted-foreground">
                  {Object.entries(a.detail).filter(([, v]) => v !== null && v !== '').map(([k, v]) => `${k}: ${String(v)}`).join(' · ')}
                </td>
              </tr>
            ))}
            {data && data.actions.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No admin actions yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- shell -------------------------------------------------------------------------------------------

function SignIn({ error }: { error: string | null }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-6 text-center">
        <BrandMark className="mx-auto h-12 w-12" />
        <h1 className="text-xl font-semibold">Outstagram admin</h1>
        <p className="text-sm text-muted-foreground">Sign in with an allow-listed Google account.</p>
        <ErrorBox error={error} />
        <Button className="w-full" disabled={busy} onClick={() => { setBusy(true); startGoogle().catch((e) => { setBusy(false); toast.error(errMsg(e)); }); }}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />} Continue with Google
        </Button>
      </div>
      <Toaster />
    </div>
  );
}

function VisionBanner({ ov }: { ov: Overview | null }) {
  const u = ov?.moderation.vision ? ov.moderation.vision_usage : undefined;
  if (!u || !u.near) return null;
  return (
    <div className={`mb-4 flex items-start gap-2 rounded-md border p-3 text-sm ${u.exhausted
      ? 'border-destructive/50 bg-destructive/10' : 'border-orange-400/50 bg-orange-400/10'}`}>
      <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${u.exhausted ? 'text-destructive' : 'text-orange-600'}`} />
      <span>
        {u.exhausted
          ? <>Cloud Vision's free quota for {u.month} is used up ({u.used}/{u.cap} images). It's paused until next month; Gemini Flash-Lite keeps checking photos, so nothing goes unscanned.</>
          : <>Cloud Vision has used {u.used} of {u.cap} free images this month ({u.remaining} left). After that it pauses and Gemini Flash-Lite checks photos alone.</>}
      </span>
    </div>
  );
}

function Panel({ me, onSignOut }: { me: Session; onSignOut: () => void }) {
  const [tab, setTab] = useState('overview');
  const [userFilter, setUserFilter] = useState('all');
  const [userId, setUserId] = useState<number | null>(null);
  const [version, setVersion] = useState(0);
  const ov = useLoad(() => call<Overview>('/admin/overview'), [version]);
  const bump = () => setVersion((v) => v + 1);
  const go = (t: string, filter?: string) => { if (filter) setUserFilter(filter); setTab(t); };
  const mail = ov.data?.mail ?? false;
  useEffect(() => {
    const t = window.setInterval(() => { if (!session()) onSignOut(); }, 30_000);
    return () => window.clearInterval(t);
  }, [onSignOut]);
  const queueCount = ov.data?.queue.open ?? 0;
  const tabs = useMemo(() => [
    { id: 'overview', label: 'Overview', icon: <Shield className="h-4 w-4" /> },
    { id: 'queue', label: 'Review queue', icon: <FlagIcon className="h-4 w-4" />, count: queueCount },
    { id: 'users', label: 'Users', icon: <Users className="h-4 w-4" />, count: ov.data?.suspicious },
    { id: 'posts', label: 'Posts', icon: <FileText className="h-4 w-4" /> },
    { id: 'audit', label: 'Audit log', icon: <FileText className="h-4 w-4" /> },
  ], [queueCount, ov.data?.suspicious]);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
          <BrandMark className="h-7 w-7" />
          <span className="font-semibold">Admin</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">{me.email}</span>
          <span className="ml-auto flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={bump} title="Refresh"><RefreshCw className="h-4 w-4" /></Button>
            <ThemeToggle />
            <Button size="sm" variant="ghost" onClick={onSignOut}><LogOut className="h-4 w-4" /> Sign out</Button>
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-4">
        <VisionBanner ov={ov.data} />
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4 flex h-auto flex-wrap">
            {tabs.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="gap-1">
                {t.icon}{t.label}{t.count ? <span className="ml-1 rounded-full bg-destructive px-1.5 text-xs text-white">{t.count}</span> : null}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="overview">
            <ErrorBox error={ov.error} />
            {ov.data ? <OverviewTab ov={ov.data} go={go} /> : <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />}
          </TabsContent>
          <TabsContent value="queue"><QueueTab mail={mail} onUser={setUserId} refreshOverview={bump} /></TabsContent>
          <TabsContent value="users"><UsersTab mail={mail} onUser={setUserId} initialFilter={userFilter} version={version} /></TabsContent>
          <TabsContent value="posts"><PostsTab mail={mail} onUser={setUserId} version={version} /></TabsContent>
          <TabsContent value="audit"><AuditTab onUser={setUserId} version={version} /></TabsContent>
        </Tabs>
      </main>
      <UserSheet id={userId} onClose={() => setUserId(null)} mail={mail} onChanged={bump} />
      <Toaster />
    </div>
  );
}

export default function AdminApp() {
  const [me, setMe] = useState<Session | null>(() => session());
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    document.title = 'Admin · Outstagram';
    completeGoogle().then((s) => { if (s) setMe(s); }).catch((e) => setError(errMsg(e))).finally(() => setChecking(false));
  }, []);
  const out = useCallback(() => { signOut(); setMe(null); }, []);
  if (checking && !me) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  return me ? <Panel me={me} onSignOut={out} /> : <SignIn error={error} />;
}
