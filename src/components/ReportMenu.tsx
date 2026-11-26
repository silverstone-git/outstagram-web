// "⋮" menu on posts: report to the admins (POST /posts/{id}/report), which puts the post in the admin review queue.
import { useState } from 'react';
import { Flag, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { OutstagramAPI } from '../services/api';

const REASONS: [string, string][] = [
  ['spam', 'Spam'], ['scam', 'Scam or fraud'], ['nudity', 'Nudity or sexual content'], ['harassment', 'Bullying or harassment'],
  ['hate', 'Hate speech'], ['violence', 'Violence'], ['self_harm', 'Self-harm'], ['illegal', 'Illegal goods or activity'],
  ['impersonation', 'Pretending to be someone'], ['personal_info', 'Shares private info'], ['other', 'Something else'],
];

export function ReportMenu({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      await OutstagramAPI.reportPost(postId, reason, note.trim() || undefined);
      toast.success('Thanks. Our team will take a look.');
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send the report');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="text-muted-foreground" aria-label="More">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => { setReason(''); setNote(''); setOpen(true); }} className="text-destructive">
            <Flag className="w-4 h-4" /> Report post
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report this post</DialogTitle>
            <DialogDescription>The author won't know who reported it.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1">
            {REASONS.map(([k, label]) => (
              <button key={k} type="button" onClick={() => setReason(k)}
                className={`rounded-md border px-3 py-2 text-left text-sm ${reason === k ? 'border-primary bg-primary/10' : 'hover:bg-accent'}`}>
                {label}
              </button>
            ))}
          </div>
          {reason && <Textarea rows={3} placeholder="Anything else we should know? (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button variant="destructive" onClick={send} disabled={!reason || busy}>Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
