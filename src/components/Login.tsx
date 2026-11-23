import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { GraduationCap, LogIn, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { OutstagramAPI } from '../services/api';
import type { User as ApiUser, RegisterData, LoginCredentials } from '../services/api';

interface LoginProps {
  onLoginSuccess: (user: ApiUser) => void;
}

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="w-4 h-4 mr-2" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
  </svg>
);

function Login({ onLoginSuccess }: LoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [social, setSocial] = useState<{ supabase_url: string | null; providers: string[] }>({ supabase_url: null, providers: [] });
  const [socialBusy, setSocialBusy] = useState(false);

  useEffect(() => {
    OutstagramAPI.getAuthProviders().then(setSocial);
    // Returning from Google: finish the sign-in
    setSocialBusy(true);
    OutstagramAPI.completeSocialLogin()
      .then((res) => {
        if (res) {
          toast.success('Login successful!');
          onLoginSuccess(res.user);
        }
      })
      .catch((e: Error) => toast.error(e.message || 'Google sign-in failed'))
      .finally(() => setSocialBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogle = async () => {
    if (!social.supabase_url) return;
    setSocialBusy(true);
    try {
      await OutstagramAPI.startSocialLogin(social.supabase_url, 'google');
    } catch {
      setSocialBusy(false);
      toast.error('Could not start Google sign-in');
    }
  };
  const [loginForm, setLoginForm] = useState<LoginCredentials>({
    username: '',
    password: '',
  });
  const [registerForm, setRegisterForm] = useState<RegisterData>({
    fullname: '',
    username: '',
    bio: '',
    email: '',
    password: '',
    date_of_birth: '2000-01-01',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await OutstagramAPI.login(loginForm);
      if (!response) {
        toast.error('Login failed. No user data received.');
        return;
      }
      toast.success('Login successful!');
      onLoginSuccess(response.user);
    } catch {
      toast.error('Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await OutstagramAPI.register(registerForm);
      toast.success('Registration successful! Logging you in...');
      // Auto-login after registration
      const response = await OutstagramAPI.login({
        username: registerForm.username,
        password: registerForm.password,
      });
      if (!response) {
        toast.error('Auto-login failed after registration. Please try logging in manually.');
        return;
      }
      onLoginSuccess(response.user);
    } catch {
      toast.error('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <GraduationCap className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-primary">Outstagram</h1>
          </div>
          <p className="text-muted-foreground">
            Social platform for students to share achievements, connect with study groups, and grow together! 🎓
          </p>
        </div>

        {/* Auth Forms */}
        <Card className="bg-card border-border">
          <Tabs defaultValue="login" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 bg-secondary">
              <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <LogIn className="w-4 h-4 mr-2" />
                Login
              </TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <UserPlus className="w-4 h-4 mr-2" />
                Register
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <CardHeader>
                  <CardTitle className="text-card-foreground">Welcome back! 👋</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-username">Username</Label>
                    <Input
                      id="login-username"
                      type="text"
                      placeholder="Enter your username"
                      value={loginForm.username}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                      className="border-border bg-input-background text-foreground placeholder:text-muted-foreground"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                      className="border-border bg-input-background text-foreground placeholder:text-muted-foreground"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        Logging in...
                      </>
                    ) : (
                      'Login to Outstagram ✨'
                    )}
                  </Button>
                </CardContent>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <CardHeader>
                  <CardTitle className="text-card-foreground">Join the community! 🎉</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="register-fullname">Full Name</Label>
                      <Input
                        id="register-fullname"
                        type="text"
                        placeholder="Your full name"
                        value={registerForm.fullname}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, fullname: e.target.value }))}
                        className="border-border bg-input-background text-foreground placeholder:text-muted-foreground"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-username">Username</Label>
                      <Input
                        id="register-username"
                        type="text"
                        placeholder="Choose username"
                        value={registerForm.username}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, username: e.target.value }))}
                        className="border-border bg-input-background text-foreground placeholder:text-muted-foreground"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="your.email@student.com"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                      className="border-border bg-input-background text-foreground placeholder:text-muted-foreground"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-bio">Bio</Label>
                    <Input
                      id="register-bio"
                      type="text"
                      placeholder="Tell us about yourself (course, year, interests)"
                      value={registerForm.bio}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, bio: e.target.value }))}
                      className="border-border bg-input-background text-foreground placeholder:text-muted-foreground"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Create a strong password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                      className="border-border bg-input-background text-foreground placeholder:text-muted-foreground"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-dob">Date of Birth</Label>
                    <Input
                      id="register-dob"
                      type="date"
                      value={registerForm.date_of_birth}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                      className="border-border bg-input-background text-foreground placeholder:text-muted-foreground"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-accent-foreground border-t-transparent" />
                        Creating account...
                      </>
                    ) : (
                      'Join Outstagram 🚀'
                    )}
                  </Button>
                </CardContent>
              </form>
            </TabsContent>
          </Tabs>
          {social.providers.includes('google') && (
            <div className="px-6 pb-6 space-y-4">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />or<div className="h-px flex-1 bg-border" />
              </div>
              <Button type="button" variant="outline" className="w-full" onClick={handleGoogle} disabled={socialBusy}>
                {socialBusy ? (
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                ) : (
                  <GoogleIcon />
                )}
                Continue with Google
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export { Login };
