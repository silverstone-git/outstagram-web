import { Check, Crown, Loader2, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { bytes, limit, money, usePlans, type PlanLimits } from './plans';
import { pageHref } from './routes';

const features = (l: PlanLimits) => [
  l.posts == null ? 'Unlimited posts' : `Up to ${limit(l.posts)} posts`,
  `${l.media_per_post ?? 4} photos or videos per post, photos up to ${bytes(l.media_bytes)}`,
  l.video_bytes === 0 ? 'Photo posts (videos come with Pro)' : `Videos up to ${limit(l.video_bytes, bytes)}`,
  l.ai_prompts_per_hour == null ? 'Unlimited AI tutor messages' : `${l.ai_prompts_per_hour} AI tutor messages every hour`,
  `${limit(l.tutor_threads)} saved tutor chats`,
];

export function PricingCards({ onStart }: { onStart: () => void }) {
  const { plans, failed } = usePlans();
  if (failed) return <p className="text-center text-muted-foreground">Prices couldn't load right now. Please refresh in a moment.</p>;
  if (!plans) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />;
  const free = plans.plans.find((p) => p.id === 'free')!;
  const paid = plans.plans.filter((p) => p.id !== 'free');
  return (
    <div className={`mx-auto grid max-w-5xl gap-6 ${paid.length > 1 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
      <div className="rounded-2xl border border-border bg-card p-6 flex flex-col">
        <h3 className="text-lg font-semibold">Free</h3>
        <p className="mt-2 text-4xl font-bold">{money(0, plans.currency)}</p>
        <p className="text-sm text-muted-foreground">forever</p>
        <ul className="mt-6 space-y-2 text-sm flex-1">
          <li className="flex gap-2"><Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />Unlimited practice exams</li>
          {features(free.limits).map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />{f}</li>)}
        </ul>
        <Button variant="outline" className="mt-6" onClick={onStart}>Start free</Button>
      </div>
      {paid.map((p, i) => {
        const top = p.id === 'contributor';
        return (
          <div key={p.id} className={`relative rounded-2xl bg-card p-6 flex flex-col ${i === 0 ? 'border-2 border-primary shadow-lg shadow-primary/10' : 'border border-border'}`}>
            {i === 0 && <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">For exam season</span>}
            {top && <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-accent-foreground">For creators</span>}
            <h3 className="text-lg font-semibold flex items-center gap-2">
              {top ? <Crown className="h-4 w-4 text-accent" /> : <Sparkles className="h-4 w-4 text-primary" />}
              {top ? 'Contributor' : 'Pro pass'}
            </h3>
            <p className="mt-2 text-4xl font-bold">{money(p.price, plans.currency)}</p>
            <p className="text-sm text-muted-foreground">one-time payment for {p.days} days · no auto-renewal</p>
            <ul className="mt-6 space-y-2 text-sm flex-1">
              <li className="flex gap-2"><Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />Everything in {top ? 'Pro' : 'Free'}</li>
              {features(p.limits).map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />{f}</li>)}
            </ul>
            <Button className="mt-6" variant={i === 0 ? 'default' : 'outline'} onClick={onStart}>Get {top ? 'Contributor' : 'Pro'} after you sign up</Button>
          </div>
        );
      })}
      <p className={`${paid.length > 1 ? 'md:col-span-3' : 'md:col-span-2'} text-center text-xs text-muted-foreground`}>
        Prices in {plans.currency}. Payments are processed securely by Razorpay (UPI, cards, net banking).
        See our <a className="underline" href={pageHref('refunds')}>refund policy</a>.
      </p>
    </div>
  );
}
