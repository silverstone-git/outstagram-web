import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { OutstagramAPI } from '../services/api';
import type { User as ApiUser } from '../services/api';

type Mode = 'code' | 'reset';

interface Props {
  mode: Mode;
  onDone: (user: ApiUser) => void;
  onCancel: () => void;
}

const inputCls = 'border-border bg-input-background text-foreground placeholder:text-muted-foreground';

/** Sign in with an emailed 6-digit code (a new address gets an account), or reset a forgotten password. */
export function EmailAuth({ mode, onDone, onCancel }: Props) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (f: () => Promise<void>) => {
    setBusy(true);
    try { await f(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  const send = (e?: React.FormEvent) => {
    e?.preventDefault();
    run(async () => {
      if (mode === 'code') await OutstagramAPI.emailCodeStart(email);
      else await OutstagramAPI.forgotPassword(email);
      setSent(true);
      toast.success(mode === 'code' ? 'Code sent. Check your inbox.' : 'If that email has an account, a code is on its way.');
    });
  };

  const finish = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const res = mode === 'code'
        ? await OutstagramAPI.emailCodeSignIn(email, code)
        : await OutstagramAPI.resetPassword(email, code, password);
      toast.success(mode === 'code' ? 'Signed in!' : 'Password changed. You are signed in.');
      onDone(res.user);
    });
  };

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-lg font-semibold text-card-foreground">
          {mode === 'code' ? 'Sign in with an email code' : 'Reset your password'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {sent
            ? `Enter the 6-digit code we sent to ${email}.`
            : mode === 'code'
              ? "No password needed. New here? The code creates your account."
              : "We'll email you a code to set a new password."}
        </p>
      </div>
      {!sent ? (
        <form onSubmit={send} className="space-y-3">
          <Label htmlFor="ea-email">Email</Label>
          <Input id="ea-email" type="email" required autoFocus value={email} placeholder="you@example.com"
            onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Sending…' : 'Send code'}</Button>
        </form>
      ) : (
        <form onSubmit={finish} className="space-y-3">
          <Label htmlFor="ea-code">Code</Label>
          <Input id="ea-code" inputMode="numeric" autoComplete="one-time-code" required autoFocus maxLength={10}
            value={code} placeholder="123456" onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className={`${inputCls} text-center text-2xl tracking-[0.5em]`} />
          {mode === 'reset' && (
            <>
              <Label htmlFor="ea-pw">New password</Label>
              <Input id="ea-pw" type="password" required minLength={8} autoComplete="new-password" value={password}
                placeholder="At least 8 characters" onChange={(e) => setPassword(e.target.value)} className={inputCls} />
            </>
          )}
          <Button type="submit" className="w-full" disabled={busy || code.length < 6}>
            {busy ? 'Checking…' : mode === 'code' ? 'Sign in' : 'Set new password'}
          </Button>
          <div className="flex justify-between text-sm">
            <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => { setSent(false); setCode(''); }}>
              Wrong email?
            </button>
            <button type="button" className="text-primary disabled:opacity-50" disabled={busy} onClick={() => send()}>
              Resend code
            </button>
          </div>
        </form>
      )}
      <button type="button" onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Back to password sign-in
      </button>
    </div>
  );
}
