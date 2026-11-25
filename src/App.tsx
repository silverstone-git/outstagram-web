import { useState, useEffect, useCallback } from 'react';
import { Home, User, Plus, Search, GraduationCap } from 'lucide-react';
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
import { toast } from 'sonner';
import { ExamsTab } from './features/exams/ExamsTab';
import type { ExamResult } from './features/exams/types';
import { Paywall } from './features/billing/Paywall';
import { Landing } from './features/public/Landing';
import { PolicyPage } from './features/public/PolicyPages';
import { PublicLayout } from './features/public/PublicLayout';
import { currentPublicPage, pageHref, sharedPostId } from './features/public/routes';
import type { PostCategory } from './types/post';
import { OutstagramAPI } from './services/api';
import { BrandMark } from './components/Brand';
import type { User as ApiUser } from './services/api';

const LoadingSpinner = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center">
      <BrandMark className="h-16 w-16 mx-auto mb-4 animate-pulse" />
      <p className="text-muted-foreground">Loading Outstagram...</p>
    </div>
  </div>
);

type Screen = 'dashboard' | 'feed' | 'exams' | 'profile' | 'upload' | 'postView';

export default function App() {
  // a shared link (/p/?id=...) opens that post, after sign-in if needed
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => (sharedPostId() ? 'postView' : 'dashboard'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(() => sharedPostId());
  const [composeCategory, setComposeCategory] = useState<PostCategory | undefined>(undefined);
  const compose = (c: PostCategory) => { setComposeCategory(c); setCurrentScreen('upload'); };
  const manageTutorHistory = () => {
    setCurrentScreen('exams');
    window.setTimeout(() => document.getElementById('tutor-history')?.scrollIntoView({ behavior: 'smooth' }), 400);
  };

  const shareExamResult = async (result: ExamResult, maxScore: number) => {
    const caption = `📊 ${result.examName}: ${Number(result.score.toFixed(2))}/${Number(maxScore.toFixed(2))} ` +
      `(${result.correctAnswers}/${result.totalQuestions} correct, ${Math.round(result.accuracy)}% accuracy) #ExamPrep #Pariksha`;
    try {
      await OutstagramAPI.createPost({ media_urls: [], highlighted_by_author: false, caption, post_category: 'Exam Result' });
      toast.success('Shared to your feed');
    } catch {
      toast.error('Could not share your result');
    }
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
          return <Profile user={currentUser} onLogout={handleLogout} onNavigateToPost={handleNavigateToPost} />;
        case 'upload':
          return <UploadPost key={composeCategory ?? 'default'} user={currentUser} initialCategory={composeCategory} />;
        case 'postView':
          return <PostView postId={selectedPostId!} onBack={() => {
            if (sharedPostId()) window.history.replaceState(null, '', pageHref(''));
            setCurrentScreen('dashboard');
          }} />;
        default:
          return <Dashboard user={currentUser} onNavigateToPost={handleNavigateToPost}
            onOpenExams={() => setCurrentScreen('exams')} onCompose={compose} />;
      }
    };

    if (isLoading) {
      return <LoadingSpinner />;
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
      const wantsLogin = params.has('code') || params.has('error') || params.has('login') || sharedPostId() !== null;
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

    return (
      <div className="min-h-screen bg-background text-foreground">
        {/* Main Content */}
        <div className={immersive ? '' : 'pb-20'}>
          {!immersive && <VerifyEmailBanner />}
          {renderScreen()}
        </div>

        {/* Bottom Navigation */}
        <div className={`fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] ${immersive ? 'hidden' : ''}`}>
          <div className="flex justify-around items-center max-w-md mx-auto">
            <button
              onClick={() => setCurrentScreen('dashboard')}
              aria-label="Home"
              className={`p-3 transition-colors ${
                currentScreen === 'dashboard' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Home className="w-6 h-6" />
            </button>
            <button
              onClick={() => setCurrentScreen('feed')}
              aria-label="Explore"
              className={`p-3 transition-colors ${
                currentScreen === 'feed' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Search className="w-6 h-6" />
            </button>
            <button
              onClick={() => setCurrentScreen('exams')}
              aria-label="Exams"
              className={`p-3 transition-colors ${
                currentScreen === 'exams' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <GraduationCap className="w-6 h-6" />
            </button>
            <button
              onClick={() => { setComposeCategory(undefined); setCurrentScreen('upload'); }}
              aria-label="New post"
              className={`p-3 transition-colors ${
                currentScreen === 'upload' ? 'text-accent' : 'text-muted-foreground'
              }`}
            >
              <Plus className="w-6 h-6" />
            </button>
            <button
              onClick={() => setCurrentScreen('profile')}
              aria-label="Profile"
              className={`p-3 transition-colors ${
                currentScreen === 'profile' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <User className="w-6 h-6" />
            </button>
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