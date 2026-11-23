import { Check, Loader2, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { bytes, money, usePlans } from './plans';
import { pageHref } from './routes';

export function PricingCards({ onStart }: { onStart: () => void }) {
  const { plans, failed } = usePlans();
  if (failed) return <p className="text-center text-muted-foreground">Prices couldn't load right now. Please refresh in a moment.</p>;
  if (!plans) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />;
  const free = plans.plans.find((p) => p.id === 'free')!;
  const pro = plans.plans.find((p) => p.id === 'pro')!;
  const features = (l: typeof free.limits) => [
    `${l.ai_prompts_per_hour} AI tutor messages every hour`,
    `${l.tutor_threads.toLocaleString('en-IN')} saved tutor chats (${bytes(l.tutor_bytes)})`,
    `Photo uploads up to ${bytes(l.media_bytes)} each`,
  ];
  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
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
      <div className="relative rounded-2xl border-2 border-primary bg-card p-6 flex flex-col shadow-lg shadow-primary/10">
        <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">For exam season</span>
        <h3 className="text-lg font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Pro pass</h3>
        <p className="mt-2 text-4xl font-bold">{money(pro.price, plans.currency)}</p>
        <p className="text-sm text-muted-foreground">one-time payment for {pro.days} days · no auto-renewal</p>
        <ul className="mt-6 space-y-2 text-sm flex-1">
          <li className="flex gap-2"><Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />Everything in Free</li>
          {features(pro.limits).map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />{f}</li>)}
        </ul>
        <Button className="mt-6" onClick={onStart}>Get Pro after you sign up</Button>
      </div>
      <p className="md:col-span-2 text-center text-xs text-muted-foreground">
        Prices in {plans.currency}. Payments are processed securely by Razorpay (UPI, cards, net banking).
        See our <a className="underline" href={pageHref('refunds')}>refund policy</a>.
      </p>
    </div>
  );
}
