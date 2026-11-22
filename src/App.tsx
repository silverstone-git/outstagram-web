import { useState, useEffect, useCallback } from 'react';
import { Home, User, Plus, Search, GraduationCap } from 'lucide-react';
import Cookies from 'js-cookie';
import { Login } from './components/Login';
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
import { OutstagramAPI } from './services/api';
import type { User as ApiUser } from './services/api';

const LoadingSpinner = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading Outstagram...</p>
    </div>
  </div>
);

type Screen = 'dashboard' | 'feed' | 'exams' | 'profile' | 'upload' | 'postView';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

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

  const handleLoginSuccess = (user: ApiUser) => {
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
          return <Dashboard user={currentUser} onNavigateToPost={handleNavigateToPost} />;
        case 'feed':
          return <Feed />;
        case 'exams':
          return <ExamsTab onImmersive={onImmersive} onShareResult={shareExamResult} />;
        case 'profile':
          return <Profile user={currentUser} onLogout={handleLogout} onNavigateToPost={handleNavigateToPost} />;
        case 'upload':
          return <UploadPost user={currentUser} />;
        case 'postView':
          return <PostView postId={selectedPostId!} onBack={() => setCurrentScreen('dashboard')} />;
        default:
          return <Dashboard user={currentUser} onNavigateToPost={handleNavigateToPost} />;
      }
    };

    if (isLoading) {
      return <LoadingSpinner />;
    }

    if (!isAuthenticated) {
      return (
        <>
          <Login onLoginSuccess={handleLoginSuccess} />
          <Toaster />
        </>
      );
    }

    return (
      <div className="min-h-screen bg-background text-foreground">
        {/* Main Content */}
        <div className={immersive ? '' : 'pb-20'}>
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
              onClick={() => setCurrentScreen('upload')}
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