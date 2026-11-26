import { useState } from 'react';
import { toast } from 'sonner';
import { MailCheck, MailX } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { BrandMark } from './Brand';
import { OutstagramAPI } from '../services/api';
import type { User as ApiUser } from '../services/api';
import { pageHref, type EmailLink } from '../features/public/routes';

interface Props {
  link: EmailLink;
  onSignedIn: (user: ApiUser) => void;
}

type State =
  | { kind: 'ready' }
  | { kind: 'busy' }
  | { kind: 'error'; message: string }
  | { kind: 'changed'; email: string }
  | { kind: 'password'; token: string; user: ApiUser };

/** <base>/signin/?h=…: the magic link in the code email. Waits for a tap before using the link, because
 * some mail scanners open links on their own and a one-time link would be spent before the person got here. */
export function EmailLinkPage({ link, onSignedIn }: Props) {
  const [state, setState] = useState<State>(link.error ? { kind: 'error', message: link.error } : { kind: 'ready' });
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  // Leave the link's URL so a refresh or Back doesn't reuse it.
  const clearUrl = () => window.history.replaceState(null, '', pageHref(''));

  const go = async () => {
    setState({ kind: 'busy' });
    try {
      const r = await OutstagramAPI.emailLinkSignIn({ token_hash: link.token_hash, access_token: link.access_token });
      if (r.changed_email) {
        clearUrl();
        setState({ kind: 'changed', email: r.changed_email });
      } else if (r.next === 'password' && r.reset_token && r.user) {
        setState({ kind: 'password', token: r.reset_token, user: r.user });
      } else if (r.user) {
        clearUrl();
        toast.success(r.created ? 'Welcome to Outstagram!' : 'Signed in!');
        onSignedIn(r.user);
      }
    } catch (e) {
      setState({ kind: 'error', message: (e as Error).message });
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.kind !== 'password') return;
    setSaving(true);
    try {
      const r = await OutstagramAPI.resetPasswordWithLink(state.token, password);
      clearUrl();
      toast.success('Password changed. Other devices were signed out.');
      onSignedIn(r.user);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const skipPassword = () => {
    if (state.kind !== 'password') return;
    clearUrl();
    toast.success('Signed in!');
    onSignedIn(state.user);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="flex justify-center"><BrandMark className="h-14 w-14" /></div>
        <Card className="bg-card border-border p-6 space-y-4 text-center">
          {(state.kind === 'ready' || state.kind === 'busy') && (
            <>
              <MailCheck className="mx-auto h-10 w-10 text-primary" aria-hidden />
              <h1 className="text-lg font-semibold text-card-foreground">Finish signing in</h1>
              <p className="text-sm text-muted-foreground">You opened the sign-in link from your email.</p>
              <Button className="w-full" onClick={go} disabled={state.kind === 'busy'} autoFocus>
                {state.kind === 'busy' ? 'Signing in…' : 'Continue to Outstagram'}
              </Button>
            </>
          )}
          {state.kind === 'error' && (
            <>
              <MailX className="mx-auto h-10 w-10 text-destructive" aria-hidden />
              <h1 className="text-lg font-semibold text-card-foreground">This link didn't work</h1>
              <p className="text-sm text-muted-foreground">{state.message}</p>
              <p className="text-sm text-muted-foreground">
                If the email also has a code and you haven't used it, you can type it in. Otherwise, ask for a new email.
              </p>
              <Button className="w-full" onClick={() => { window.location.href = `${pageHref('')}?login`; }}>
                Go to sign in
              </Button>
            </>
          )}
          {state.kind === 'changed' && (
            <>
              <MailCheck className="mx-auto h-10 w-10 text-primary" aria-hidden />
              <h1 className="text-lg font-semibold text-card-foreground">Email changed</h1>
              <p className="text-sm text-muted-foreground">Your account's email is now <b>{state.email}</b>.</p>
              <Button className="w-full" onClick={() => { window.location.href = pageHref(''); }}>Continue</Button>
            </>
          )}
          {state.kind === 'password' && (
            <form onSubmit={savePassword} className="space-y-3 text-left">
              <h1 className="text-lg font-semibold text-card-foreground text-center">Set a new password</h1>
              <p className="text-sm text-muted-foreground text-center">You're signed in. Choose a new password to finish.</p>
              <Label htmlFor="el-pw">New password</Label>
              <Input id="el-pw" type="password" required minLength={8} autoFocus autoComplete="new-password"
                value={password} placeholder="At least 8 characters" onChange={(e) => setPassword(e.target.value)}
                className="border-border bg-input-background text-foreground placeholder:text-muted-foreground" />
              <Button type="submit" className="w-full" disabled={saving || password.length < 8}>
                {saving ? 'Saving…' : 'Set new password'}
              </Button>
              <button type="button" onClick={skipPassword} className="w-full text-sm text-muted-foreground hover:text-foreground">
                Not now
              </button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
