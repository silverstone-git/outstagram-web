import type { ReactNode } from 'react';
import { GraduationCap, Mail, Phone } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { CONTACT, pageHref } from './routes';

type Props = { children: ReactNode; onLogin: () => void; loggedIn?: boolean };

export function PublicLayout({ children, onLogin, loggedIn }: Props) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <a href={pageHref('')} className="flex items-center gap-2 font-bold text-lg">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </span>
            Outstagram
          </a>
          <nav className="ml-auto flex items-center gap-1 sm:gap-4 text-sm">
            <a href={pageHref('pricing')} className="hidden sm:inline text-muted-foreground hover:text-foreground">Pricing</a>
            <a href={pageHref('contact')} className="hidden sm:inline text-muted-foreground hover:text-foreground">Contact</a>
            <Button size="sm" onClick={onLogin}>{loggedIn ? 'Open app' : 'Log in'}</Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-card/50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3 text-sm">
          <div>
            <div className="font-semibold mb-2">Outstagram</div>
            <p className="text-muted-foreground">Practice exams, an AI tutor that knows your textbooks, and a feed to share your wins. Made in {CONTACT.country}.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="font-semibold mb-1">Policies</div>
            <a className="text-muted-foreground hover:text-foreground" href={pageHref('pricing')}>Pricing</a>
            <a className="text-muted-foreground hover:text-foreground" href={pageHref('terms')}>Terms of Service</a>
            <a className="text-muted-foreground hover:text-foreground" href={pageHref('privacy')}>Privacy Policy</a>
            <a className="text-muted-foreground hover:text-foreground" href={pageHref('refunds')}>Refund &amp; Cancellation Policy</a>
          </div>
          <div className="flex flex-col gap-1.5">
            <a className="font-semibold mb-1" href={pageHref('contact')}>Contact us</a>
            <a className="flex items-center gap-2 text-muted-foreground hover:text-foreground" href={`mailto:${CONTACT.email}`}><Mail className="h-4 w-4" />{CONTACT.email}</a>
            <a className="flex items-center gap-2 text-muted-foreground hover:text-foreground" href={CONTACT.phoneHref}><Phone className="h-4 w-4" />{CONTACT.phone}</a>
          </div>
        </div>
        <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Outstagram, operated by {CONTACT.legalName}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
