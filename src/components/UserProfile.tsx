import { useCallback, useEffect, useState } from 'react';
import { RichCaption } from './RichCaption';
import { ArrowLeft, Check, Clock, Flame, GraduationCap, Share2, Trophy, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { OutstagramAPI, type FollowUser, type Post, type UserProfile } from '../services/api';
import { categoryKey } from '../types/post';
import { openProfile } from '../lib/nav';
import { shareProfile } from '../lib/share';

interface Props {
  username: string;
  onBack: () => void;
  onNavigateToPost: (postId: string) => void;
}

const face = (name: string, url?: string | null) => url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;

/** Someone's profile: header, follow / requested / following, follower lists, posts grid.
 *  Opened from post authors, follower lists and share links (`/u/?name=…`). */
export function UserProfileView({ username, onBack, onNavigateToPost }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<'followers' | 'following' | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const p = await OutstagramAPI.getUserProfile(username);
      if (!p) throw new Error('User not found');
      setProfile(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'User not found');
    }
  }, [username]);

  useEffect(() => {
    setProfile(null);
    setPosts(null);
    load();
    OutstagramAPI.getUserPosts(username, 1).then((p) => setPosts(p ?? [])).catch(() => setPosts([]));
  }, [username, load]);

  const follow = async () => {
    if (!profile) return;
    setBusy(true);
    try {
      if (profile.you_follow_them) {
        const pending = profile.you_follow_them !== 1;
        if (!window.confirm(pending ? `Cancel your request to @${username}?` : `Unfollow @${username}?`)) return;
        await OutstagramAPI.unfollowUser(username);
      } else {
        await OutstagramAPI.followUser(username);
        toast.success('Follow request sent');
      }
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const share = () => shareProfile(username);

  const f = profile?.you_follow_them ?? 0;
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-card/80 backdrop-blur-md border-b border-border p-3 z-10">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back"><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="min-w-0 flex-1 truncate text-lg font-bold">@{username}</h1>
          <Button variant="ghost" size="icon" onClick={share} aria-label="Share profile"><Share2 className="w-5 h-5" /></Button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {error ? (
          <p className="py-16 text-center text-muted-foreground">{error}</p>
        ) : !profile ? (
          <div className="py-16 text-center"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" /></div>
        ) : (
          <>
            <div className="flex items-center gap-5">
              <Avatar className="w-20 h-20 ring-4 ring-primary/30">
                <AvatarImage src={face(username, profile.avatar_url)} />
                <AvatarFallback>{username.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 grid-cols-3 text-center">
                <div><div className="text-xl font-bold tabular-nums">{profile.posts_count}</div><div className="text-xs text-muted-foreground">posts</div></div>
                <button type="button" onClick={() => setList('followers')} className="rounded-lg hover:bg-secondary/60">
                  <div className="text-xl font-bold tabular-nums">{profile.followers_count}</div><div className="text-xs text-muted-foreground">followers</div>
                </button>
                <button type="button" onClick={() => setList('following')} className="rounded-lg hover:bg-secondary/60">
                  <div className="text-xl font-bold tabular-nums">{profile.following_count}</div><div className="text-xs text-muted-foreground">following</div>
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">{profile.fullname}</h2>
                {(profile.streak ?? 0) > 0 && (
                  <span title={`${profile.streak}-day exam streak`}
                    className="inline-flex items-center gap-0.5 rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-bold text-orange-500">
                    <Flame className="h-3.5 w-3.5" />{profile.streak}
                  </span>
                )}
              </div>
              {profile.bio && <p className="mt-1 text-sm whitespace-pre-line">{profile.bio}</p>}
              {profile.they_follow_you === 1 && <p className="mt-1 text-xs text-muted-foreground">Follows you</p>}
            </div>

            <Button className="w-full" variant={f ? 'outline' : 'default'} onClick={follow} disabled={busy}>
              {f === 1 ? <><Check className="w-4 h-4" />Following</>
                : f ? <><Clock className="w-4 h-4" />Requested</>
                : <><UserPlus className="w-4 h-4" />{profile.they_follow_you === 1 ? 'Follow back' : 'Follow'}</>}
            </Button>

            {posts === null ? (
              <div className="py-8 text-center"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" /></div>
            ) : posts.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">No posts yet</p>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {posts.map((post) => (
                  <button type="button" key={post.post_id} onClick={() => onNavigateToPost(post.post_id)}
                    className="aspect-square overflow-hidden rounded-lg">
                    {post.media_urls?.length ? (
                      post.media_urls[0].media_type === 'video'
                        ? <video src={post.media_urls[0].url} className="w-full h-full object-cover" muted />
                        : <ImageWithFallback src={post.media_urls[0].url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full bg-secondary/50 flex items-center justify-center p-2 text-xs text-left">
                        {categoryKey(post.post_category) === 'exam_result' ? <GraduationCap className="w-8 h-8 text-accent" />
                          : categoryKey(post.post_category) === 'achievement' ? <Trophy className="w-8 h-8 text-primary" />
                          : <RichCaption className="line-clamp-5" text={post.caption} postId={post.post_id} />}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <FollowListDialog username={username} which={list} onClose={() => setList(null)} />
    </div>
  );
}

function FollowListDialog({ username, which, onClose }: { username: string; which: 'followers' | 'following' | null; onClose: () => void }) {
  const [rows, setRows] = useState<FollowUser[] | null>(null);
  useEffect(() => {
    if (!which) return;
    setRows(null);
    OutstagramAPI.getFollowList(username, which).then(setRows).catch(() => setRows([]));
  }, [username, which]);
  return (
    <Dialog open={!!which} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{which === 'followers' ? 'Followers' : 'Following'}</DialogTitle></DialogHeader>
        <div className="max-h-[60dvh] overflow-y-auto -mx-2">
          {rows === null ? <p className="p-4 text-center text-sm text-muted-foreground">Loading…</p>
            : rows.length === 0 ? <p className="p-4 text-center text-sm text-muted-foreground">Nobody yet</p>
            : rows.map((u) => (
              <button key={u.user_id} type="button" onClick={() => { onClose(); if (!u.is_you) openProfile(u.username); }}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-secondary/60">
                <Avatar className="w-9 h-9"><AvatarImage src={face(u.username, u.avatar_url)} /><AvatarFallback>{u.username[0]?.toUpperCase()}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{u.is_you ? 'You' : u.username}</div>
                  <div className="truncate text-xs text-muted-foreground">{u.fullname}</div>
                </div>
                {u.you_follow_them === 1 && <span className="text-xs text-muted-foreground">Following</span>}
              </button>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
