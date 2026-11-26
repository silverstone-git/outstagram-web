import { useEffect, useState, type ComponentType } from 'react';
import { RichCaption } from './RichCaption';
import { BookOpen, GraduationCap, MessageCircle, Trophy, Users, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner';
import { OutstagramAPI } from '../services/api';
import type { User as ApiUser, Post, MyStats, TrendingTag } from '../services/api';
import { categoryKey, type PostCategory } from '../types/post';
import { ThemeToggle } from '../lib/theme';
import { RequestsButton } from './Requests';

interface DashboardProps {
  user: ApiUser;
  onNavigateToPost: (postId: string) => void;
  onOpenExams?: () => void;
  onCompose?: (category: PostCategory) => void;
}

/** "+2 this week" only when it's true; every number comes from GET /me/stats. */
const delta = (n: number | undefined, period: string) => (n ? `+${n} this ${period}` : `none this ${period}`);

function Dashboard({ user, onNavigateToPost, onOpenExams, onCompose }: DashboardProps) {
  const [recent, setRecent] = useState<Post[]>([]);
  const [stats, setStats] = useState<MyStats | null>(null);
  const [trending, setTrending] = useState<TrendingTag[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let live = true;
    OutstagramAPI.getDashboard(1)
      .then((p) => live && setRecent(p ?? []))
      .catch(() => toast.error('Failed to load your posts.'))
      .finally(() => live && setIsLoading(false));
    OutstagramAPI.getMyStats().then((s) => live && setStats(s)).catch(() => {});
    OutstagramAPI.getTrending().then((t) => live && setTrending(t)).catch(() => live && setTrending([]));
    return () => { live = false; };
  }, []);

  const cards: { label: string; value: number | undefined; icon: ComponentType<{ className?: string }>; note: string }[] = [
    { label: 'Posts', value: stats?.posts, icon: MessageCircle, note: delta(stats?.posts_this_week, 'week') },
    { label: 'Achievements', value: stats?.achievements, icon: Trophy, note: delta(stats?.achievements_this_month, 'month') },
    { label: 'Exams taken', value: stats?.exams_taken, icon: GraduationCap,
      note: stats?.avg_accuracy != null ? `${Math.round(stats.avg_accuracy)}% avg accuracy` : delta(stats?.exams_this_week, 'week') },
    { label: 'Followers', value: stats?.followers, icon: Users, note: stats ? `${stats.following} following` : '' },
  ];
  const first = (user.fullname || user.username || '').split(' ')[0];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-primary break-words">Welcome, {first}! 🎓</h1>
            <p className="text-muted-foreground">Your study dashboard</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <RequestsButton />
            <ThemeToggle />
            <Avatar className="w-12 h-12 ring-2 ring-primary">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
              <AvatarFallback>{(user.username || '?').charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {cards.map((c) => (
            <Card key={c.label} className="bg-card border-border">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <c.icon className="w-5 h-5 shrink-0 text-primary" />
                  <span className="text-xl font-bold tabular-nums text-card-foreground">{c.value ?? '–'}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{c.label}</div>
                <div className="text-[11px] leading-tight text-accent truncate">{stats ? c.note : ' '}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-gradient-to-r from-primary/20 to-accent/20 border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <Zap className="w-5 h-5 text-accent" />
              Student Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full h-auto min-h-11 whitespace-normal py-2.5" onClick={onOpenExams}>
              📊 Take a test, share your result
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto min-h-11 whitespace-normal py-2.5 border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => onCompose?.('achievement')}>
                🏆 Post achievement
              </Button>
              <Button variant="outline" className="h-auto min-h-11 whitespace-normal py-2.5 border-accent/40 text-accent hover:bg-accent/10"
                onClick={() => onCompose?.('study_group')}>
                👥 Find study group
              </Button>
            </div>
            <Button variant="outline" className="w-full h-auto min-h-11 whitespace-normal py-2.5 text-card-foreground"
              onClick={() => onCompose?.('academic')}>
              📚 Share study notes
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Your recent posts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-muted-foreground text-sm">Loading your posts...</p>
              </div>
            ) : recent.length > 0 ? (
              recent.slice(0, 3).map((post) => {
                const cat = categoryKey(post.post_category);
                return (
                  <button type="button" key={post.post_id} className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50" onClick={() => onNavigateToPost(post.post_id)}>
                    <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden relative">
                      {post.media_urls && post.media_urls.length > 0 ? (
                        <ImageWithFallback src={post.media_urls[0].url} alt="Post thumbnail" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-secondary/50 flex items-center justify-center">
                          {cat === 'exam_result' ? <GraduationCap className="w-6 h-6 text-accent" /> :
                            cat === 'achievement' ? <Trophy className="w-6 h-6 text-primary" /> :
                              <BookOpen className="w-6 h-6 text-muted-foreground" />}
                        </div>
                      )}
                      {post.highlighted_by_author && <div className="absolute top-1 right-1 w-3 h-3 bg-accent rounded-full"></div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-card-foreground mb-1 line-clamp-2 break-words"><RichCaption text={post.caption} postId={post.post_id} /></div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize truncate">{String(cat).replace(/_/g, ' ')}</span>
                        <span>•</span>
                        <span className="shrink-0">{new Date(post.datetime_posted).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-center py-6">
                <div className="text-4xl mb-2">📚</div>
                <p className="text-muted-foreground text-sm">No posts yet! Start sharing your study journey.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Trending this month 🔥</CardTitle>
          </CardHeader>
          <CardContent>
            {trending === null ? (
              <div className="h-20 rounded-lg bg-secondary/40 animate-pulse" />
            ) : trending.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hashtags yet this month. Add one like #ExamPrep to your next post.</p>
            ) : (
              <div className="space-y-2">
                {trending.map((t, i) => (
                  <div key={t.tag} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-secondary/50">
                    <span className="text-primary truncate">{t.tag}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">#{i + 1} · {t.posts} post{t.posts === 1 ? '' : 's'}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export { Dashboard };
