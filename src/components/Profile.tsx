import { useState, useEffect, useCallback } from 'react';
import { Grid, Heart, Bookmark, LogOut, GraduationCap, Trophy, Crown, Camera } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner';
import { OutstagramAPI } from '../services/api';
import type { User as ApiUser, Post, MyStats } from '../services/api';
import { categoryKey } from '../types/post';
import { ThemeToggle } from '../lib/theme';
import { openPaywall } from '../features/billing/billing';
import { EditProfileDialog } from './EditProfile';

interface ProfileProps {
  user: ApiUser;
  onLogout: () => void;
  onNavigateToPost: (postId: string) => void;
  /** after a name/bio edit, so App (and localStorage) hold the new values */
  onUserUpdated?: (user: ApiUser) => void;
}

function Profile({ user, onLogout, onNavigateToPost, onUserUpdated }: ProfileProps) {
  const [editing, setEditing] = useState(false);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<MyStats | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  useEffect(() => { OutstagramAPI.getMyStats().then(setStats).catch(() => {}); }, [user]);
  useEffect(() => { OutstagramAPI.getMe().then((m) => setPhoto(m.avatar_url ?? null)).catch(() => {}); }, [user]);

  const changePhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoBusy(true);
    try {
      setPhoto(await OutstagramAPI.setAvatar(file));
      toast.success('Profile photo updated');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPhotoBusy(false);
    }
  };
  const removePhoto = async () => {
    try { await OutstagramAPI.removeAvatar(); setPhoto(null); } catch (e) { toast.error((e as Error).message); }
  };

  const loadUserPosts = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const posts = await OutstagramAPI.getUserPosts(user.username, 1);
      if (!posts) {
        setUserPosts([]);
        return;
      }
      setUserPosts(posts);
    } catch {
      toast.error('Failed to load user posts.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const loadData = async () => {
      await loadUserPosts();
    };
    
    loadData();
  }, [user, loadUserPosts]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-card/80 backdrop-blur-md border-b border-border p-4 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="min-w-0 truncate text-xl font-bold text-card-foreground">@{user.username}</h1>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => openPaywall({ code: 'manual' })} aria-label="Plans and Pro"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-primary">
              <Crown className="h-5 w-5" />
            </button>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              aria-label="Log out"
              className="text-muted-foreground hover:text-destructive"
              onClick={onLogout}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Profile Header */}
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <label className="cursor-pointer" aria-label="Change profile photo">
              <Avatar className={`w-24 h-24 ring-4 ring-primary/30 ${photoBusy ? 'opacity-50' : ''}`}>
                <AvatarImage src={photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
                <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center">
                <Camera className="w-4 h-4 text-primary-foreground" />
              </div>
              <input type="file" accept="image/*" className="hidden" disabled={photoBusy}
                onChange={(e) => { changePhoto(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
          </div>
          {photo && (
            <button type="button" onClick={removePhoto} className="block mx-auto text-xs text-muted-foreground hover:text-destructive">
              Remove photo
            </button>
          )}

          <div>
            <h2 className="text-xl font-bold text-card-foreground">{user.fullname}</h2>
            <p className="text-muted-foreground">@{user.username}</p>
          </div>

          {user.bio && (
            <p className="text-card-foreground max-w-xs mx-auto whitespace-pre-line break-words">
              {user.bio}
            </p>
          )}
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit profile</Button>
          <EditProfileDialog user={user} open={editing} onOpenChange={setEditing}
            onSaved={(u) => onUserUpdated?.(u)} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary tabular-nums">{stats?.posts ?? '–'}</div>
            <div className="text-sm text-muted-foreground">Posts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary tabular-nums">{stats?.followers ?? '–'}</div>
            <div className="text-sm text-muted-foreground">Followers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary tabular-nums">{stats?.following ?? '–'}</div>
            <div className="text-sm text-muted-foreground">Following</div>
          </div>
        </div>

        {/* Academic Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30">
            <CardContent className="p-3 text-center">
              <GraduationCap className="w-6 h-6 text-primary mx-auto mb-1" />
              <div className="text-sm font-medium text-card-foreground">
                {stats ? (stats.exams_taken ? `${stats.exams_taken} exam${stats.exams_taken === 1 ? '' : 's'} · ${Math.round(stats.avg_accuracy ?? 0)}%` : 'No exams yet') : '–'}
              </div>
              <div className="text-xs text-muted-foreground">Exams · avg accuracy</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-accent/10 to-primary/10 border-accent/30">
            <CardContent className="p-3 text-center">
              <Trophy className="w-6 h-6 text-accent mx-auto mb-1" />
              <div className="text-sm font-medium text-card-foreground">{stats ? `${stats.achievements} posted` : '–'}</div>
              <div className="text-xs text-muted-foreground">Achievements & results</div>
            </CardContent>
          </Card>
        </div>

        {/* Academic Highlights */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <h3 className="font-medium text-card-foreground mb-3">Academic Highlights</h3>
            <div className="flex gap-3 overflow-x-auto">
              {['Exams 📊', 'Projects 💡', 'Study 📚', 'Awards 🏆'].map((highlight, index) => (
                <div key={index} className="flex-shrink-0 text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary/30 flex items-center justify-center mb-2">
                    <span className="text-2xl">{highlight.split(' ')[1]}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{highlight.split(' ')[0]}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Posts Grid */}
        <Tabs defaultValue="posts" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-card border border-border">
            <TabsTrigger value="posts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Grid className="w-4 h-4 mr-2" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="liked" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Heart className="w-4 h-4 mr-2" />
              Liked
            </TabsTrigger>
            <TabsTrigger value="saved" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Bookmark className="w-4 h-4 mr-2" />
              Saved
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-0">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-muted-foreground text-sm">Loading posts...</p>
              </div>
            ) : userPosts.length > 0 ? (
              <div className="grid grid-cols-3 gap-1">
                {userPosts.map((post) => (
                  <div key={post.post_id} className="aspect-square overflow-hidden rounded-lg relative cursor-pointer" onClick={() => onNavigateToPost(post.post_id)}>
                    {post.media_urls && post.media_urls.length > 0 ? (
                      <ImageWithFallback
                        src={post.media_urls[0].url}
                        alt={`Post ${post.post_id}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-secondary/50 flex items-center justify-center">
                        {categoryKey(post.post_category) === 'exam_result' ? (
                          <GraduationCap className="w-8 h-8 text-accent" />
                        ) : categoryKey(post.post_category) === 'achievement' ? (
                          <Trophy className="w-8 h-8 text-primary" />
                        ) : (
                          <span className="text-2xl">📚</span>
                        )}
                      </div>
                    )}
                    {post.highlighted_by_author && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-accent rounded-full flex items-center justify-center">
                        <span className="text-xs">⭐</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-2">📚</div>
                <p className="text-muted-foreground">No posts yet! Start sharing your academic journey.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="liked" className="space-y-4">
            <div className="text-center py-12">
              <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Liked posts appear here</p>
            </div>
          </TabsContent>

          <TabsContent value="saved" className="space-y-4">
            <div className="text-center py-12">
              <Bookmark className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Saved posts appear here</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export { Profile };
