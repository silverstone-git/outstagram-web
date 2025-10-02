import { useState, useEffect } from 'react';
import { MessageCircle, Users, Zap, GraduationCap, Trophy, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner';
import { OutstagramAPI } from '../services/api';
import type { User as ApiUser, Post } from '../services/api';

interface DashboardProps {
  user: ApiUser;
}

function Dashboard({ user }: DashboardProps) {
  const [dashboardData, setDashboardData] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userStats, setUserStats] = useState({
    posts: 0,
    achievements: 0,
    studyGroups: 0
  });

  useEffect(() => {
    const loadData = async () => {
      await loadDashboard();
    };
    
    loadData();
  }, []);

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      const posts = await OutstagramAPI.getDashboard(1);
      setDashboardData(posts);
      
      // Calculate stats from posts
      const achievements = posts.filter(p => p.post_category === 'achievement' || p.post_category === 'exam_result').length;
      const studyGroups = posts.filter(p => p.post_category === 'study_group').length;
      
      setUserStats({
        posts: posts.length,
        achievements,
        studyGroups
      });
    } catch (error) {
      toast.error('Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  const stats = [
    { label: 'Posts', value: userStats.posts.toString(), icon: MessageCircle, change: '+3 this week' },
    { label: 'Achievements', value: userStats.achievements.toString(), icon: Trophy, change: '+2 this month' },
    { label: 'Study Groups', value: userStats.studyGroups.toString(), icon: Users, change: 'Active' },
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">Welcome, {user.fullname.split(' ')[0]}! 🎓</h1>
            <p className="text-muted-foreground">Your academic journey dashboard</p>
          </div>
          <Avatar className="w-12 h-12 ring-2 ring-primary">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
            <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className="w-5 h-5 text-primary" />
                  <span className="text-xs text-accent">{stat.change}</span>
                </div>
                <div className="text-lg font-bold text-card-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="bg-gradient-to-r from-primary/20 to-accent/20 border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <Zap className="w-5 h-5 text-accent" />
              Student Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              📊 Share Exam Results
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
                🏆 Post Achievement
              </Button>
              <Button variant="outline" className="border-accent/30 text-accent hover:bg-accent/10">
                👥 Find Study Group
              </Button>
            </div>
            <Button variant="outline" className="w-full border-secondary/30 text-card-foreground hover:bg-secondary/10">
              📚 Share Academic Content
            </Button>
          </CardContent>
        </Card>

        {/* Recent Posts */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Your Recent Posts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-muted-foreground text-sm">Loading your posts...</p>
              </div>
            ) : dashboardData.length > 0 ? (
              dashboardData.slice(0, 3).map((post) => (
                <div key={post.post_id} className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden relative">
                    {post.media_urls && post.media_urls.length > 0 ? (
                      <ImageWithFallback
                        src={post.media_urls[0].url}
                        alt="Post thumbnail"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-secondary/50 flex items-center justify-center">
                        {post.post_category === 'exam_result' ? <GraduationCap className="w-6 h-6 text-accent" /> :
                         post.post_category === 'achievement' ? <Trophy className="w-6 h-6 text-primary" /> :
                         <BookOpen className="w-6 h-6 text-muted-foreground" />}
                      </div>
                    )}
                    {post.highlighted_by_author && (
                      <div className="absolute top-1 right-1 w-3 h-3 bg-accent rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-card-foreground mb-1 line-clamp-2">
                      {post.caption.slice(0, 60)}...
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="capitalize">{post.post_category.replace('_', ' ')}</span>
                      <span>•</span>
                      <span>{new Date(post.datetime_posted).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <div className="text-4xl mb-2">📚</div>
                <p className="text-muted-foreground text-sm">No posts yet! Start sharing your academic journey.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trending Academic Topics */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Student Trending 🔥</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { tag: '#StudyLife', icon: '📚' },
                { tag: '#ExamPrep', icon: '🎯' },
                { tag: '#StudentSuccess', icon: '🏆' },
                { tag: '#StudyGroup', icon: '👥' },
                { tag: '#AcademicGoals', icon: '🎓' },
                { tag: '#ProjectWork', icon: '💡' }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span>{item.icon}</span>
                    <span className="text-primary">{item.tag}</span>
                  </div>
                  <span className="text-xs text-accent">#{index + 1}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export { Dashboard };
