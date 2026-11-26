import { useState } from 'react';
import { Download, Loader2, ShieldAlert, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { OutstagramAPI } from '../services/api';

/** "Your data": download everything as JSON, or delete the account and everything in it. */
export function AccountData({ username, onDeleted }: { username: string; onDeleted: () => void }) {
  const [exporting, setExporting] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setExporting(true);
    try {
      const blob = await OutstagramAPI.exportMyData();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `outstagram-${username}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
      toast.success('Your data is downloading');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not export your data');
    } finally { setExporting(false); }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await OutstagramAPI.deleteMyAccount(confirm);
      toast.success('Your account and all its data were deleted');
      setOpen(false);
      onDeleted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete the account');
    } finally { setBusy(false); }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold"><ShieldAlert className="h-4 w-4" />Your data</h3>
      <p className="text-xs text-muted-foreground">Download a copy of everything Outstagram stores about you, or delete your account for good.</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={download} disabled={exporting}>
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download my data
        </Button>
        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setConfirm(''); setOpen(true); }}>
          <Trash2 className="h-4 w-4" /> Delete my account
        </Button>
      </div>
      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently deletes your profile and everything you made: posts and their photos and videos, comments,
              likes, follows, exam history, tutor chats, saved equations, plan and streak. It can't be undone; download your data first if you want a copy.
            </DialogDescription>
          </DialogHeader>
          <Label htmlFor="del-confirm">Type <span className="font-mono">{username}</span> to confirm</Label>
          <Input id="del-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={busy || confirm.trim().replace(/^@/, '') !== username} onClick={remove}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Delete forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
