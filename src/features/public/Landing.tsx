import { BookOpenCheck, Bot, Trophy, Users, Sigma, Timer, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { PricingCards } from './PricingCards';
import { useBankSize } from './plans';

const features = [
  { icon: Timer, title: 'Real exam practice', body: 'Timed papers with MCQ, multi-correct and numerical questions, just like the real thing. Proper maths rendering, no blurry screenshots.' },
  { icon: Bot, title: 'An AI tutor on every question', body: 'Stuck on Q14? Ask. The tutor reads the same textbooks you do and explains step by step, at your level.' },
  { icon: BookOpenCheck, title: 'Know what to revise', body: 'See your accuracy and time per topic after every attempt, so you spend tonight on the chapters that need it.' },
  { icon: Users, title: 'Study with friends', body: 'Follow classmates, share notes and results, cheer each other on. A feed that is about learning, not scrolling.' },
  { icon: Sigma, title: 'Save the formulas that matter', body: 'Long-press any equation to keep it. Your own formula sheet builds itself while you practise.' },
  { icon: Trophy, title: 'Share your wins', body: 'Post your score to your feed in one tap. Every good mock deserves a little applause.' },
];

const steps = [
  ['Sign up free', 'Use Google or a username. Takes ten seconds.'],
  ['Pick a subject and practise', 'Quick practice from the question bank, or a full timed paper.'],
  ['Learn from every mistake', 'Open the tutor on any question you got wrong and actually get it.'],
];

const faqs = [
  ['Is Outstagram free?', 'Yes. Practice exams are free, and the free plan includes AI tutor messages every hour. A Pro pass raises the limits for a month when you need more.'],
  ['Does Pro renew automatically?', 'No. Pro is a one-time pass. When it ends you go back to Free; nothing is charged again unless you buy another pass.'],
  ['Which subjects are covered?', 'We started with physics and are adding more subjects. More are on the way.'],
  ['Can I use it on my phone?', 'Yes, Outstagram is built mobile-first and works in any modern browser.'],
];

export function Landing({ onStart }: { onStart: () => void }) {
  const bank = useBankSize();
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
          <div className="absolute top-40 -right-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        </div>
        <div className="mx-auto max-w-4xl px-4 pt-16 pb-20 sm:pt-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Exam prep that actually feels good
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-6xl">
            Practise smarter.{' '}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Ask anything.</span>{' '}
            Show off your progress.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Outstagram is where students take real practice exams, get unstuck with an AI tutor that knows the textbook,
            and share the journey with friends.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="h-12 px-8 text-base" onClick={onStart}>
              Start practising free <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
              <a href="#how">See how it works</a>
            </Button>
          </div>
          {bank && bank.questions > 0 && (
            <p className="mt-6 text-sm text-muted-foreground">
              <b className="text-foreground">{bank.questions.toLocaleString('en-IN')}</b> practice questions across{' '}
              <b className="text-foreground">{bank.topics}</b> topics, and growing.
            </p>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold">Everything you need between now and exam day</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-5xl px-4 py-16 scroll-mt-20">
        <h2 className="text-center text-3xl font-bold">Three steps. That's it.</h2>
        <ol className="mt-10 grid gap-6 sm:grid-cols-3">
          {steps.map(([t, b], i) => (
            <li key={t} className="rounded-2xl border border-border bg-card p-6">
              <span className="text-4xl font-extrabold text-primary/70">{i + 1}</span>
              <h3 className="mt-2 font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{b}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-4 py-16 scroll-mt-20">
        <h2 className="text-center text-3xl font-bold">Simple, student-friendly pricing</h2>
        <p className="mt-2 mb-10 text-center text-muted-foreground">Start free. Upgrade only when exam season gets serious.</p>
        <PricingCards onStart={onStart} />
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold">Questions</h2>
        <div className="mt-8 space-y-3">
          {faqs.map(([q, a]) => (
            <details key={q} className="group rounded-xl border border-border bg-card p-4">
              <summary className="cursor-pointer list-none font-medium flex justify-between">{q}<span className="text-muted-foreground group-open:rotate-45 transition">+</span></summary>
              <p className="mt-2 text-sm text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-primary to-accent p-10 text-center text-primary-foreground">
          <h2 className="text-3xl font-bold">Your next mock could be your best one.</h2>
          <p className="mt-2 opacity-90">Join free and take your first practice paper today.</p>
          <Button size="lg" variant="secondary" className="mt-6 h-12 px-8 text-base" onClick={onStart}>Create my free account</Button>
        </div>
      </section>
    </>
  );
}
