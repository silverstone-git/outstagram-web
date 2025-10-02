import { useState, useEffect } from 'react';
import { Home, User, Plus, Search } from 'lucide-react';
import Cookies from 'js-cookie';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Feed } from './components/Feed';
import { Profile } from './components/Profile';
import { UploadPost } from './components/UploadPost';
import { Toaster } from './components/ui/sonner';
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

type Screen = 'dashboard' | 'feed' | 'profile' | 'upload';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);

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

  const renderScreen = () => {
    if (!currentUser) return <Dashboard user={{} as ApiUser} />;
    switch (currentScreen) {
      case 'dashboard':
        return <Dashboard user={currentUser} />;
      case 'feed':
        return <Feed />;
      case 'profile':
        return <Profile user={currentUser} onLogout={handleLogout} />;
      case 'upload':
        return <UploadPost user={currentUser} />;
      default:
        return <Dashboard user={currentUser} />;
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
      <div className="pb-20">
        {renderScreen()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-2">
        <div className="flex justify-around items-center max-w-md mx-auto">
          <button
            onClick={() => setCurrentScreen('dashboard')}
            className={`p-3 transition-colors ${
              currentScreen === 'dashboard' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Home className="w-6 h-6" />
          </button>
          <button
            onClick={() => setCurrentScreen('feed')}
            className={`p-3 transition-colors ${
              currentScreen === 'feed' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Search className="w-6 h-6" />
          </button>
          <button
            onClick={() => setCurrentScreen('upload')}
            className={`p-3 transition-colors ${
              currentScreen === 'upload' ? 'text-accent' : 'text-muted-foreground'
            }`}
          >
            <Plus className="w-6 h-6" />
          </button>
          <button
            onClick={() => setCurrentScreen('profile')}
            className={`p-3 transition-colors ${
              currentScreen === 'profile' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <User className="w-6 h-6" />
          </button>
        </div>
      </div>
      <Toaster />
    </div>
  );
}