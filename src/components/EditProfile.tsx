import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { OutstagramAPI } from '../services/api';
import type { User as ApiUser } from '../services/api';

const NAME_MAX = 60;
const BIO_MAX = 160;

interface EditProfileDialogProps {
  user: ApiUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (user: ApiUser) => void;
}

/** Name (1–60) and bio (≤ 160) via PUT /me; the server enforces the same limits. */
export function EditProfileDialog({ user, open, onOpenChange, onSaved }: EditProfileDialogProps) {
  const [name, setName] = useState(user.fullname ?? '');
  const [bio, setBio] = useState(user.bio ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setName(user.fullname ?? ''); setBio(user.bio ?? ''); }
  }, [open, user]);

  const trimmedName = name.trim();
  const trimmedBio = bio.trim();
  const changed = trimmedName !== (user.fullname ?? '').trim() || trimmedBio !== (user.bio ?? '').trim();
  const valid = trimmedName.length >= 1 && trimmedName.length <= NAME_MAX && trimmedBio.length <= BIO_MAX;

  const save = async () => {
    setSaving(true);
    try {
      const changes: { fullname?: string; bio?: string } = {};
      if (trimmedName !== (user.fullname ?? '').trim()) changes.fullname = trimmedName;
      if (trimmedBio !== (user.bio ?? '').trim()) changes.bio = trimmedBio;
      const me = await OutstagramAPI.updateProfile(changes);
      onSaved({ ...user, fullname: me.fullname ?? trimmedName, bio: me.bio ?? trimmedBio });
      toast.success('Profile updated');
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message || 'Could not save your profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Your name and bio are shown on your profile.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (changed && valid && !saving) save(); }}>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="edit-name">Name</Label>
              <span className={`text-xs tabular-nums ${trimmedName.length > NAME_MAX ? 'text-destructive' : 'text-muted-foreground'}`}>
                {trimmedName.length}/{NAME_MAX}
              </span>
            </div>
            <Input id="edit-name" value={name} maxLength={NAME_MAX + 20} autoComplete="name"
              onChange={(e) => setName(e.target.value)} aria-invalid={trimmedName.length === 0} />
            {trimmedName.length === 0 && <p className="text-xs text-destructive">Your name can't be empty.</p>}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="edit-bio">Bio</Label>
              <span className={`text-xs tabular-nums ${trimmedBio.length > BIO_MAX ? 'text-destructive' : 'text-muted-foreground'}`}>
                {trimmedBio.length}/{BIO_MAX}
              </span>
            </div>
            <Textarea id="edit-bio" value={bio} rows={3} onChange={(e) => setBio(e.target.value)}
              placeholder="What are you studying?" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={saving} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!changed || !valid || saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
