import React, { useState } from 'react';
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

function Login({ onLoginSuccess }: LoginProps) {
  const [isLoading, setIsLoading] = useState(false);
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
        </Card>
      </div>
    </div>
  );
}

export { Login };
