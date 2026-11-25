import { useCallback, useEffect, useState } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { OutstagramAPI } from '../services/api';
import type { FollowRequest } from '../services/api';
import { openProfile } from '../lib/nav';

type Outcome = 'approved' | 'declined';

const timeAgo = (iso: string) => {
  const s = (Date.now() - new Date(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

/**
 * Bell with a count of pending follow requests; opens the inbox (approve / decline).
 * No push on the web: the count refreshes on mount and whenever the tab regains focus.
 */
export function RequestsButton() {
  const [requests, setRequests] = useState<FollowRequest[] | null>(null);
  const [done, setDone] = useState<Record<number, Outcome>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    OutstagramAPI.getFollowRequests().then((r) => setRequests(r ?? [])).catch(() => setRequests((p) => p ?? []));
  }, []);

  useEffect(() => {
    load();
    const onFocus = () => { if (document.visibilityState === 'visible') load(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => { window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus); };
  }, [load]);

  const pending = (requests ?? []).filter((r) => !done[r.request_id]).length;

  const act = async (r: FollowRequest, outcome: Outcome) => {
    setBusy(r.request_id);
    try {
      if (outcome === 'approved') await OutstagramAPI.approveFollowRequest(r.request_id);
      else await OutstagramAPI.rejectFollowRequest(r.request_id);
      setDone((d) => ({ ...d, [r.request_id]: outcome }));
    } catch (e) {
      toast.error((e as Error).message || 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  const onOpenChange = (o: boolean) => {
    setOpen(o);
    if (o) load();
    else {
      // drop handled rows once the sheet closes
      setRequests((rs) => (rs ?? []).filter((r) => !done[r.request_id]));
      setDone({});
    }
  };

  return (
    <>
      <button type="button" onClick={() => onOpenChange(true)}
        aria-label={pending ? `Follow requests (${pending})` : 'Follow requests'}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-primary">
        <Bell className="h-5 w-5" />
        {pending > 0 && (
          <span className="absolute right-1 top-1 min-w-[18px] rounded-full bg-accent px-1 text-center text-[11px] font-bold leading-[18px] text-accent-foreground tabular-nums">
            {pending > 99 ? '99+' : pending}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Follow requests</DialogTitle>
            <DialogDescription>People who asked to follow you.</DialogDescription>
          </DialogHeader>
          {requests === null ? (
            <div className="h-16 animate-pulse rounded-lg bg-secondary/40" />
          ) : requests.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No requests right now.</p>
          ) : (
            <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
              {requests.map((r) => {
                const outcome = done[r.request_id];
                return (
                  <li key={r.request_id} className="flex items-center gap-3 rounded-lg p-2">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={r.requester_avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.requester_username}`} />
                      <AvatarFallback>{r.requester_username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <button type="button" className="min-w-0 flex-1 text-left"
                      onClick={() => { setOpen(false); openProfile(r.requester_username); }}>
                      <div className="truncate font-medium text-card-foreground hover:underline">@{r.requester_username}</div>
                      <div className="text-xs text-muted-foreground">{timeAgo(r.datetime_requested)}</div>
                    </button>
                    {outcome ? (
                      <span className={`shrink-0 text-sm ${outcome === 'approved' ? 'text-primary' : 'text-muted-foreground'}`}>
                        {outcome === 'approved' ? 'Approved' : 'Declined'}
                      </span>
                    ) : (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button size="sm" disabled={busy === r.request_id} onClick={() => act(r, 'approved')}>
                          <Check className="mr-1 h-4 w-4" />Approve
                        </Button>
                        <Button size="icon" variant="ghost" aria-label={`Decline @${r.requester_username}`}
                          disabled={busy === r.request_id} onClick={() => act(r, 'declined')}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
