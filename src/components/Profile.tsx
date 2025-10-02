import { useState, useEffect } from 'react';
import { Grid, Heart, Bookmark, LogOut, GraduationCap, Trophy } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner';
import { OutstagramAPI } from '../services/api';
import type { User as ApiUser, Post } from '../services/api';

interface ProfileProps {
  user: ApiUser;
  onLogout: () => void;
}

function Profile({ user, onLogout }: ProfileProps) {
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      await loadUserPosts();
    };
    
    loadData();
  }, [user]);

  const loadUserPosts = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const posts = await OutstagramAPI.getUserPosts(user.username, 1);
      setUserPosts(posts);
    } catch (error) {
      toast.error('Failed to load user posts.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-card/80 backdrop-blur-md border-b border-border p-4 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-card-foreground">@{user.username}</h1>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground hover:text-destructive"
            onClick={onLogout}
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Profile Header */}
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <Avatar className="w-24 h-24 ring-4 ring-primary/30">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
              <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
              <span className="text-xs">✨</span>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-card-foreground">{user.fullname}</h2>
            <p className="text-muted-foreground">@{user.username}</p>
          </div>

          <p className="text-card-foreground max-w-xs mx-auto">
            {user.bio}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{userPosts.length}</div>
            <div className="text-sm text-muted-foreground">Posts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">156</div>
            <div className="text-sm text-muted-foreground">Followers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">89</div>
            <div className="text-sm text-muted-foreground">Following</div>
          </div>
        </div>

        {/* Academic Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30">
            <CardContent className="p-3 text-center">
              <GraduationCap className="w-6 h-6 text-primary mx-auto mb-1" />
              <div className="text-sm font-medium text-card-foreground">GPA: 3.8</div>
              <div className="text-xs text-muted-foreground">Academic Standing</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-accent/10 to-primary/10 border-accent/30">
            <CardContent className="p-3 text-center">
              <Trophy className="w-6 h-6 text-accent mx-auto mb-1" />
              <div className="text-sm font-medium text-card-foreground">5 Awards</div>
              <div className="text-xs text-muted-foreground">Achievements</div>
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
                  <div key={post.post_id} className="aspect-square overflow-hidden rounded-lg relative">
                    {post.media_urls && post.media_urls.length > 0 ? (
                      <ImageWithFallback
                        src={post.media_urls[0].url}
                        alt={`Post ${post.post_id}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-secondary/50 flex items-center justify-center">
                        {post.post_category === 'exam_result' ? (
                          <GraduationCap className="w-8 h-8 text-accent" />
                        ) : post.post_category === 'achievement' ? (
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
