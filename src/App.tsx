import { useState, useEffect, useCallback } from 'react';
import { Home, User, Plus, Search, GraduationCap, Crown } from 'lucide-react';
import Cookies from 'js-cookie';
import { Login } from './components/Login';
import { VerifyEmailBanner } from './components/VerifyEmailBanner';
import { Dashboard } from './components/Dashboard';
import { Feed } from './components/Feed';
import { Profile } from './components/Profile';
import { UploadPost } from './components/UploadPost';
import { PostView } from './components/PostView';
import { SessionExpiredDialog } from './components/SessionExpiredDialog';
import { SessionExpiredProvider, useSessionExpired } from './context/SessionExpiredContext';
import { Toaster } from './components/ui/sonner';
import { ExamsTab } from './features/exams/ExamsTab';
import { Paywall } from './features/billing/Paywall';
import { Landing } from './features/public/Landing';
import { PolicyPage } from './features/public/PolicyPages';
import { PublicLayout } from './features/public/PublicLayout';
import { currentPublicPage, emailLink, pageHref, sharedPostId, sharedProfileName } from './features/public/routes';
import { EmailLinkPage } from './components/EmailLinkPage';
import { UserProfileView } from './components/UserProfile';
import { onOpenPost, onOpenProfile } from './lib/nav';
import type { PostCategory } from './types/post';
import { OutstagramAPI } from './services/api';
import { BrandLogo, BrandMark } from './components/Brand';
import { ThemeToggle } from './lib/theme';
import { openPaywall } from './features/billing/billing';
import type { User as ApiUser } from './services/api';

const LoadingSpinner = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center">
      <BrandMark className="h-16 w-16 mx-auto mb-4 animate-pulse" />
      <p className="text-muted-foreground">Loading Outstagram...</p>
    </div>
  </div>
);

type Screen = 'dashboard' | 'feed' | 'exams' | 'profile' | 'upload' | 'postView' | 'user';

export default function App() {
  // a shared link (/p/?id=...) opens that post, after sign-in if needed
  const [currentScreen, setCurrentScreen] = useState<Screen>(() =>
    sharedPostId() ? 'postView' : sharedProfileName() ? 'user' : 'dashboard');
  // someone else's profile (`/u/?name=…` links, post authors, follower lists)
  const [selectedUsername, setSelectedUsername] = useState<string | null>(() => sharedProfileName());
  const [backTo, setBackTo] = useState<Screen>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(() => sharedPostId());
  const [composeCategory, setComposeCategory] = useState<PostCategory | undefined>(undefined);
  const compose = (c: PostCategory) => { setComposeDraft(undefined); setComposeCategory(c); setCurrentScreen('upload'); };
  const manageTutorHistory = () => {
    setCurrentScreen('exams');
    window.setTimeout(() => document.getElementById('tutor-history')?.scrollIntoView({ behavior: 'smooth' }), 400);
  };

  // "Post to feed" on the exam result card: the composer opens with the card and caption (like the app)
  const [composeDraft, setComposeDraft] = useState<{ files: File[]; caption: string } | undefined>(undefined);
  const shareExamResult = (card: File, caption: string) => {
    setComposeDraft({ files: [card], caption });
    setComposeCategory('exam_result');
    setCurrentScreen('upload');
  };

  useEffect(() => {
    const token = Cookies.get('outstagram_token');
    const user = localStorage.getItem('outstagram_user');
    if (token && user) {
      setIsAuthenticated(true);
      setCurrentUser(JSON.parse(user));
    }
    setIsLoading(false);
  }, []);

  // Signed-out navigation between the landing page and the login form (no router). Only listens while
  // signed out: re-rendering App remounts AppContent, which must not happen mid-exam.
  const [, setUrlTick] = useState(0);
  const navigate = (to: string) => { window.history.pushState(null, '', to); setUrlTick((n) => n + 1); };
  useEffect(() => {
    if (isAuthenticated) return;
    let last = window.location.pathname + window.location.search;
    const onPop = () => {
      const now = window.location.pathname + window.location.search;
      if (now !== last) { last = now; setUrlTick((n) => n + 1); }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [isAuthenticated]);

  const handleLoginSuccess = (user: ApiUser) => {
    if (new URLSearchParams(window.location.search).has('login')) window.history.replaceState(null, '', pageHref(''));
    setIsAuthenticated(true);
    setCurrentUser(user);
    localStorage.setItem('outstagram_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    OutstagramAPI.removeAuthToken();
    localStorage.removeItem('outstagram_user');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const handleNavigateToPost = (postId: string) => {
    setSelectedPostId(postId);
    setCurrentScreen('postView');
  };

  useEffect(() => onOpenPost((id) => { setBackTo(currentScreen); handleNavigateToPost(id); }));

  useEffect(() => onOpenProfile((name) => {
    if (currentUser && name === currentUser.username) {
      setCurrentScreen('profile');
      return;
    }
    setBackTo((s) => (currentScreen === 'user' ? s : currentScreen));
    setSelectedUsername(name);
    setCurrentScreen('user');
  }), [currentUser, currentScreen]);

  const leaveSharedLink = () => {
    if (sharedPostId() || sharedProfileName()) window.history.replaceState(null, '', pageHref(''));
  };

  const AppContent = () => {
    // Lives inside AppContent: App re-creates AppContent on every App state change, so state kept in
    // App would remount the exam mid-attempt.
    const [immersive, setImmersive] = useState(false); // exam runner/results take the full screen
    const onImmersive = useCallback((on: boolean) => setImmersive(on), []);
    const { isSessionExpired, showSessionExpiredDialog, hideSessionExpiredDialog } = useSessionExpired();

    useEffect(() => {
      const handleSessionExpired = () => {
        showSessionExpiredDialog();
      };

      window.addEventListener('sessionExpired', handleSessionExpired);

      return () => {
        window.removeEventListener('sessionExpired', handleSessionExpired);
      };
    }, [showSessionExpiredDialog]);

    const renderScreen = () => {
      if (!currentUser) return <Dashboard user={{} as ApiUser} onNavigateToPost={handleNavigateToPost} />;
      switch (currentScreen) {
        case 'dashboard':
          return <Dashboard user={currentUser} onNavigateToPost={handleNavigateToPost}
            onOpenExams={() => setCurrentScreen('exams')} onCompose={compose} />;
        case 'feed':
          return <Feed />;
        case 'exams':
          return <ExamsTab onImmersive={onImmersive} onShareResult={shareExamResult} />;
        case 'profile':
          return <Profile user={currentUser} onLogout={handleLogout} onNavigateToPost={handleNavigateToPost}
            onUserUpdated={(u) => { setCurrentUser(u); localStorage.setItem('outstagram_user', JSON.stringify(u)); }} />;
        case 'upload':
          return <UploadPost key={`${composeCategory ?? 'default'}:${composeDraft?.caption ?? ''}`} user={currentUser} initialCategory={composeCategory} draft={composeDraft} />;
        case 'postView':
          return <PostView postId={selectedPostId!} onBack={() => {
            leaveSharedLink();
            setCurrentScreen(backTo === 'exams' ? 'exams' : selectedUsername && backTo === 'user' ? 'user' : 'dashboard');
          }} />;
        case 'user':
          return <UserProfileView username={selectedUsername!} onNavigateToPost={(id) => { setBackTo('user'); handleNavigateToPost(id); }}
            onBack={() => { leaveSharedLink(); setCurrentScreen(backTo === 'user' ? 'dashboard' : backTo); }} />;
        default:
          return <Dashboard user={currentUser} onNavigateToPost={handleNavigateToPost}
            onOpenExams={() => setCurrentScreen('exams')} onCompose={compose} />;
      }
    };

    if (isLoading) {
      return <LoadingSpinner />;
    }

    // Magic link from the code email (/signin/?h=…), signed in or out: it signs in as that address.
    const link = emailLink();
    if (link) {
      return (
        <>
          <EmailLinkPage link={link} onSignedIn={handleLoginSuccess} />
          <Toaster />
        </>
      );
    }

    // Public pages (/pricing, /terms, /privacy, /refunds, /contact) work signed in or out.
    const publicPage = currentPublicPage();
    const toApp = () => { window.location.href = pageHref(''); };
    if (publicPage) {
      return (
        <PublicLayout loggedIn={isAuthenticated} onLogin={toApp}>
          <PolicyPage page={publicPage} onStart={toApp} />
        </PublicLayout>
      );
    }

    if (!isAuthenticated) {
      // Returning from Google (?code=) or ?login goes straight to the sign-in form; otherwise the landing page.
      const params = new URLSearchParams(window.location.search);
      const wantsLogin = params.has('code') || params.has('error') || params.has('login') || sharedPostId() !== null
        || sharedProfileName() !== null;
      const openLogin = () => navigate(`${pageHref('')}?login`);
      return (
        <>
          {wantsLogin
            ? <Login onLoginSuccess={handleLoginSuccess} onBack={() => navigate(pageHref(''))} />
            : <PublicLayout onLogin={openLogin}><Landing onStart={openLogin} /></PublicLayout>}
          <Toaster />
        </>
      );
    }

    const newPost = () => { setComposeDraft(undefined); setComposeCategory(undefined); setCurrentScreen('upload'); };
    const nav: { key: Screen; label: string; icon: typeof Home; go: () => void; accent?: boolean }[] = [
      { key: 'dashboard', label: 'Home', icon: Home, go: () => setCurrentScreen('dashboard') },
      { key: 'feed', label: 'Explore', icon: Search, go: () => setCurrentScreen('feed') },
      { key: 'exams', label: 'Exams', icon: GraduationCap, go: () => setCurrentScreen('exams') },
      { key: 'upload', label: 'Create', icon: Plus, go: newPost, accent: true },
      { key: 'profile', label: 'Profile', icon: User, go: () => setCurrentScreen('profile') },
    ];
    const active = (k: Screen) => currentScreen === k;

    return (
      <div className="min-h-screen bg-background text-foreground">
        {/* Side navigation on tablets and desktops (icons, labels from lg), like Instagram's web app */}
        {!immersive && (
          <nav aria-label="Main" className="hidden md:flex fixed inset-y-0 left-0 z-30 w-20 lg:w-60 flex-col border-r border-border bg-card px-3 py-6">
            <button type="button" onClick={() => setCurrentScreen('dashboard')} aria-label="Outstagram home"
              className="mb-8 flex items-center justify-center lg:justify-start lg:px-3">
              <BrandMark className="h-8 w-8 lg:hidden" />
              <BrandLogo size="sm" className="hidden lg:inline-flex" />
            </button>
            <div className="flex flex-1 flex-col gap-1">
              {nav.map((n) => (
                <button key={n.key} type="button" onClick={n.go} aria-label={n.key === 'upload' ? 'New post' : n.label} title={n.label}
                  aria-current={active(n.key) ? 'page' : undefined}
                  className={`group flex items-center justify-center lg:justify-start gap-4 rounded-xl p-3 transition-colors hover:bg-secondary ${
                    active(n.key) ? (n.accent ? 'text-accent font-semibold' : 'text-primary font-semibold') : 'text-foreground'}`}>
                  <n.icon className={`h-6 w-6 shrink-0 transition-transform group-hover:scale-110 ${active(n.key) ? 'stroke-[2.5]' : ''}`} />
                  <span className="hidden lg:inline text-[15px]">{n.label}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-1">
              <button type="button" onClick={() => openPaywall({ code: 'manual' })} aria-label="Plans" title="Plans"
                className="group flex items-center justify-center lg:justify-start gap-4 rounded-xl p-3 text-foreground hover:bg-secondary">
                <Crown className="h-6 w-6 shrink-0 transition-transform group-hover:scale-110" />
                <span className="hidden lg:inline text-[15px]">Plans</span>
              </button>
              <div className="flex justify-center lg:justify-start lg:px-1"><ThemeToggle /></div>
            </div>
          </nav>
        )}

        {/* Main Content */}
        <div className={immersive ? '' : 'pb-20 md:pb-0 md:pl-20 lg:pl-60'}>
          {!immersive && <VerifyEmailBanner />}
          {renderScreen()}
        </div>

        {/* Bottom Navigation (phones) */}
        <div className={`md:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] ${immersive ? 'hidden' : ''}`}>
          <div className="flex justify-around items-center max-w-md mx-auto">
            {nav.map((n) => (
              <button key={n.key} type="button" onClick={n.go} aria-label={n.key === 'upload' ? 'New post' : n.label}
                className={`p-3 transition-colors ${active(n.key) ? (n.accent ? 'text-accent' : 'text-primary') : 'text-muted-foreground'}`}>
                <n.icon className="w-6 h-6" />
              </button>
            ))}
          </div>
        </div>
        <Toaster />
        <Paywall onManageHistory={manageTutorHistory} />
        <SessionExpiredDialog isOpen={isSessionExpired} onClose={hideSessionExpiredDialog} />
      </div>
    );
  };

  return (
    <SessionExpiredProvider>
      <AppContent />
    </SessionExpiredProvider>
  );
}