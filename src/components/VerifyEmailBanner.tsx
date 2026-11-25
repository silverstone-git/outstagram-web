import { useEffect, useState } from 'react';
import { MailWarning } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { OutstagramAPI } from '../services/api';
import type { Me } from '../services/api';

/** Shown while the account's email isn't confirmed: posting, uploads and the AI tutor need it
 *  (the server answers 403 detail.code = "email_unverified", which also opens the code field here). */
export function VerifyEmailBanner() {
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    OutstagramAPI.getMe().then(setMe).catch(() => {});
    const onBlocked = () => { setOpen(true); toast.error('Confirm your email first. We emailed you a code.'); send(); };
    window.addEventListener('emailUnverified', onBlocked);
    return () => window.removeEventListener('emailUnverified', onBlocked);
  }, []);

  const send = async () => {
    setBusy(true);
    try { await OutstagramAPI.sendVerifyCode(); setOpen(true); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      setMe(await OutstagramAPI.verifyEmail(code));
      toast.success('Email confirmed. Posting and the AI tutor are unlocked.');
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setBusy(false); }
  };

  if (!me || me.email_verified || me.verification_required === false) return null;
  return (
    <div className="mx-auto max-w-md px-4 pt-4">
      <div className="rounded-xl border border-destructive/60 bg-destructive/10 p-3 text-sm">
        <div className="flex items-start gap-3">
          <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold">Confirm your email</div>
            <div className="text-muted-foreground">
              You need it to post, change your photo and use the AI tutor. {open ? `Code sent to ${me.email}.` : ''}
            </div>
            {open ? (
              <form onSubmit={verify} className="mt-2 flex gap-2">
                <Input inputMode="numeric" autoComplete="one-time-code" maxLength={10} placeholder="6-digit code"
                  value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className="h-9" />
                <Button type="submit" size="sm" disabled={busy || code.length < 6}>Confirm</Button>
              </form>
            ) : null}
          </div>
          {!open && <Button size="sm" variant="outline" disabled={busy} onClick={send}>Send code</Button>}
        </div>
        {open && (
          <button type="button" disabled={busy} onClick={send} className="mt-1 text-xs text-primary disabled:opacity-50">Resend code</button>
        )}
      </div>
    </div>
  );
}
