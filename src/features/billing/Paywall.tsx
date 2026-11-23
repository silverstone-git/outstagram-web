import { useCallback, useEffect, useState } from 'react';
import { Check, Crown, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../../components/ui/drawer';
import { pageHref } from '../public/routes';
import { BillingAPI, buyPro, type BillingStatus, type PaywallDetail } from './billing';

const HEADLINE: Record<string, string> = {
  ai_quota: "You've used this hour's AI prompts",
  tutor_threads: 'Your tutor history is full',
  tutor_storage: 'Your tutor history is full',
  media_too_large: 'That file is too big for the free plan',
  manual: 'Outstagram Pro',
};

const kb = (b: number) => (b >= 1_000_000 ? `${Math.round(b / 1_000_000)} MB` : `${Math.round(b / 1000)} kB`);
const money = (p: BillingStatus['price']) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: p.currency, maximumFractionDigits: 0 }).format(p.amount / 100);

/** The upgrade sheet. Mounted once in App; opened by openPaywall() / any paywall API response. */
export function Paywall({ onManageHistory }: { onManageHistory?: () => void }) {
  const [detail, setDetail] = useState<PaywallDetail | null>(null);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [paying, setPaying] = useState(false);

  const refresh = useCallback(() => BillingAPI.status().then(setStatus).catch(() => {}), []);
  useEffect(() => {
    const on = (e: Event) => { setDetail((e as CustomEvent<PaywallDetail>).detail); refresh(); };
    window.addEventListener('paywall', on);
    return () => window.removeEventListener('paywall', on);
  }, [refresh]);

  const pay = async () => {
    if (!detail) return;
    setPaying(true);
    try {
      const plan = await buyPro(detail.code, () => setDetail(null));
      if (plan === 'pro') {
        toast.success('Welcome to Pro! Your limits are raised.');
        window.dispatchEvent(new CustomEvent('planchange', { detail: plan }));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setPaying(false);
      refresh();
    }
  };

  const pro = status?.plan === 'pro';
  const f = status?.free_limits, p = status?.pro_limits;
  const rows: [string, string, string][] = f && p ? [
    ['AI tutor prompts / hour', `${f.ai_prompts_per_hour}`, `${p.ai_prompts_per_hour}`],
    ['Saved tutor chats', `${f.tutor_threads}`, `${p.tutor_threads}`],
    ['Tutor history storage', kb(f.tutor_bytes), kb(p.tutor_bytes)],
    ['Photo / video size (after compression)', kb(f.media_bytes), kb(p.media_bytes)],
  ] : [];
  const history = detail?.code === 'tutor_threads' || detail?.code === 'tutor_storage';

  return (
    <Drawer open={!!detail} onOpenChange={(o) => !o && !paying && setDetail(null)}>
      <DrawerContent className="max-w-lg mx-auto max-h-[92dvh]">
        <DrawerHeader className="text-left">
          <div className="mb-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary"><Crown className="h-5 w-5" /></div>
          <DrawerTitle>{HEADLINE[detail?.code ?? 'manual'] ?? HEADLINE.manual}</DrawerTitle>
          <DrawerDescription>{detail?.message || 'Upgrade to Pro for higher limits.'}</DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-4 overflow-y-auto">
          {!status ? (
            <div className="h-40 rounded-xl bg-secondary/50 animate-pulse" />
          ) : pro ? (
            <p className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm">
              You're on Pro until {new Date(status.valid_until!).toLocaleDateString()}. You've reached even the Pro limit; it resets soon.
            </p>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/60 text-xs text-muted-foreground">
                    <tr><th className="p-2 text-left font-medium" /><th className="p-2 text-right font-medium">Free</th><th className="p-2 text-right font-medium text-primary">Pro</th></tr>
                  </thead>
                  <tbody>
                    {rows.map(([label, free, prov]) => (
                      <tr key={label} className="border-t border-border">
                        <td className="p-2">{label}</td>
                        <td className="p-2 text-right tabular-nums whitespace-nowrap text-muted-foreground">{free}</td>
                        <td className="p-2 text-right tabular-nums whitespace-nowrap font-semibold">{prov}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="space-y-1.5 text-sm">
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Tutor answers grounded in every subject's books</li>
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />One payment, no auto-renewal: {status.price.days} days of Pro</li>
              </ul>
              {status.payments_enabled ? (
                <Button className="h-12 w-full text-base" onClick={pay} disabled={paying}>
                  {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                  Pay {money(status.price)} with Razorpay
                </Button>
              ) : (
                <p className="rounded-xl bg-secondary/60 p-3 text-sm text-muted-foreground">Payments aren't set up on this server yet.</p>
              )}
              <p className="text-xs text-muted-foreground">
                By paying you agree to the <a className="underline" href={pageHref('terms')} target="_blank" rel="noreferrer">Terms</a> and{' '}
                <a className="underline" href={pageHref('refunds')} target="_blank" rel="noreferrer">Refund policy</a> (full refund within 7 days).
              </p>
              {status.test_mode && status.payments_enabled && (
                <p className="text-xs text-muted-foreground">
                  Test mode: no real money moves. Pay by UPI with the ID <code>success@razorpay</code> (or <code>failure@razorpay</code> to see a failed payment).
                </p>
              )}
            </>
          )}
          {history && onManageHistory && (
            <Button variant="outline" className="w-full" onClick={() => { setDetail(null); onManageHistory(); }}>
              Delete old tutor chats instead
            </Button>
          )}
          <Button variant="ghost" className="w-full" onClick={() => setDetail(null)} disabled={paying}>Maybe later</Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
