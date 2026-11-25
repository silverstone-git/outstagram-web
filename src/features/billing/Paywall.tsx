import { useCallback, useEffect, useState } from 'react';
import { Check, Crown, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../../components/ui/drawer';
import { pageHref } from '../public/routes';
import {
  BillingAPI, buyPro, plansOf, shortName, PLAN_RANK,
  type BillingStatus, type Limits, type PaywallDetail, type PlanId, type PlanInfo,
} from './billing';

const HEADLINE: Record<string, string> = {
  ai_quota: "You've used this hour's AI prompts",
  tutor_threads: 'Your tutor history is full',
  tutor_storage: 'Your tutor history is full',
  media_too_large: 'That file is too big for your plan',
  video_not_allowed: 'Videos come with Pro',
  posts_limit: "You've reached your post limit",
  manual: 'Outstagram plans',
};

const kb = (b: number) => (b >= 1_000_000 ? `${Math.round(b / 1_000_000)} MB` : `${Math.round(b / 1000)} kB`);
const lim = (n: number | null | undefined, f: (n: number) => string = (x) => `${x}`) => (n == null ? 'Unlimited' : f(n));
const money = (p: PlanInfo) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: p.currency, maximumFractionDigits: 0 }).format(p.price / 100);

const ROWS: [string, (l: Limits) => string][] = [
  ['Posts', (l) => lim(l.posts)],
  ['Photos/videos per post', (l) => lim(l.media_per_post ?? 4)],
  ['Photo size (after compression)', (l) => kb(l.media_bytes)],
  ['Video size', (l) => (l.video_bytes === 0 ? '—' : lim(l.video_bytes, kb))],
  ['AI tutor messages / hour', (l) => lim(l.ai_prompts_per_hour)],
  ['Saved tutor chats', (l) => lim(l.tutor_threads)],
];

/** The upgrade sheet. Mounted once in App; opened by openPaywall() / any paywall API response. */
export function Paywall({ onManageHistory }: { onManageHistory?: () => void }) {
  const [detail, setDetail] = useState<PaywallDetail | null>(null);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [paying, setPaying] = useState<PlanId | null>(null);

  const refresh = useCallback(() => BillingAPI.status().then(setStatus).catch(() => {}), []);
  useEffect(() => {
    const on = (e: Event) => { setDetail((e as CustomEvent<PaywallDetail>).detail); refresh(); };
    window.addEventListener('paywall', on);
    return () => window.removeEventListener('paywall', on);
  }, [refresh]);

  const pay = async (p: PlanInfo) => {
    if (!detail || p.id === 'free') return;
    setPaying(p.id);
    try {
      const plan = await buyPro(detail.code, () => setDetail(null), p.id);
      if (plan === p.id) {
        toast.success(`Welcome to ${shortName(p)}! Your limits are raised.`);
        window.dispatchEvent(new CustomEvent('planchange', { detail: plan }));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setPaying(null);
      refresh();
    }
  };

  const plans = status ? plansOf(status) : [];
  const upgrades = status ? plans.filter((p) => PLAN_RANK[p.id] > PLAN_RANK[status.plan]) : [];
  const current = plans.find((p) => p.id === status?.plan);
  const highlight: PlanId = detail?.needs ?? upgrades[0]?.id ?? status?.plan ?? 'pro';
  const history = detail?.code === 'tutor_threads' || detail?.code === 'tutor_storage';

  return (
    <Drawer open={!!detail} onOpenChange={(o) => !o && !paying && setDetail(null)}>
      <DrawerContent className="max-w-lg mx-auto max-h-[92dvh]">
        <DrawerHeader className="text-left">
          <div className="mb-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary"><Crown className="h-5 w-5" /></div>
          <DrawerTitle>{HEADLINE[detail?.code ?? 'manual'] ?? HEADLINE.manual}</DrawerTitle>
          <DrawerDescription>{detail?.message || 'More posts, bigger photos, videos and more AI help.'}</DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-4 overflow-y-auto">
          {!status ? (
            <div className="h-40 rounded-xl bg-secondary/50 animate-pulse" />
          ) : (
            <>
              {status.plan !== 'free' && (
                <p className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm">
                  You're on {current ? shortName(current) : 'a paid plan'}
                  {status.valid_until ? ` until ${new Date(status.valid_until).toLocaleDateString()}` : ''}
                  {upgrades.length === 0 ? ', the top plan. Thanks for supporting Outstagram!' : '.'}
                </p>
              )}
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/60 text-xs text-muted-foreground">
                    <tr>
                      <th className="p-2 text-left font-medium" />
                      {plans.map((p) => (
                        <th key={p.id} className={`p-2 text-right font-medium ${p.id === highlight ? 'text-primary' : ''}`}>
                          {shortName(p)}<div className="font-normal">{p.id === 'free' ? '' : money(p)}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ROWS.map(([label, value]) => (
                      <tr key={label} className="border-t border-border">
                        <td className="p-2">{label}</td>
                        {plans.map((p) => (
                          <td key={p.id} className={`p-2 text-right tabular-nums whitespace-nowrap ${p.id === highlight ? 'font-semibold' : 'text-muted-foreground'}`}>
                            {value(p.limits)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="space-y-1.5 text-sm">
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Tutor answers grounded in every subject's books</li>
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />One payment, no auto-renewal: {status.price.days} days per pass. Upgrading to Contributor starts it now.</li>
              </ul>
              {upgrades.length > 0 && (status.payments_enabled ? (
                <div className="space-y-2">
                  {upgrades.map((p) => (
                    <Button key={p.id} variant={p.id === highlight ? 'default' : 'outline'} className="h-12 w-full text-base"
                      onClick={() => pay(p)} disabled={paying !== null}>
                      {paying === p.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                      Get {shortName(p)} · {money(p)}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl bg-secondary/60 p-3 text-sm text-muted-foreground">Payments aren't set up on this server yet.</p>
              ))}
              {upgrades.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  By paying you agree to the <a className="underline" href={pageHref('terms')} target="_blank" rel="noreferrer">Terms</a> and{' '}
                  <a className="underline" href={pageHref('refunds')} target="_blank" rel="noreferrer">Refund policy</a> (full refund within 7 days).
                </p>
              )}
              {status.test_mode && status.payments_enabled && upgrades.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Test mode: no real money moves. Pick Netbanking, any bank, then <strong>Success</strong> (or Failure) on the demo bank page. Test card: <code>4111 1111 1111 1111</code>, any future date and CVV.
                </p>
              )}
            </>
          )}
          {history && onManageHistory && (
            <Button variant="outline" className="w-full" onClick={() => { setDetail(null); onManageHistory(); }}>
              Delete old tutor chats instead
            </Button>
          )}
          <Button variant="ghost" className="w-full" onClick={() => setDetail(null)} disabled={paying !== null}>
            {upgrades.length ? 'Maybe later' : 'Close'}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
