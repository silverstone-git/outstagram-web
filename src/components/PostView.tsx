
import { useState, useEffect } from 'react';
import { Heart, MessageCircle, ArrowLeft, Trash2 } from 'lucide-react';
import { OutstagramAPI } from '../services/api';
import type { Post, Comment, Like } from '../services/api';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from './ui/carousel';
import { toast } from 'sonner';
import { openProfile } from '../lib/nav';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from './ui/alert-dialog';

/** The signed-in user's id (App keeps the user in localStorage). */
const myUserId = (): number | null => {
  try { return JSON.parse(localStorage.getItem('outstagram_user') ?? 'null')?.user_id ?? null; } catch { return null; }
};

interface PostViewProps {
  postId: string;
  onBack: () => void;
}

const LoadingSpinner = () => (
  <div className="text-center py-10">
    <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
  </div>
);

const ErrorDisplay = ({ message }: { message: string }) => (
  <div className="text-center py-10 text-destructive">
    <p>{message}</p>
  </div>
);

export function PostView({ postId, onBack }: PostViewProps) {
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLikedOptimistic, setIsLikedOptimistic] = useState(false);
  const [toDelete, setToDelete] = useState<Comment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const me = myUserId();
  const canDelete = (c: Comment) => me != null && (c.author_user_id === me || post?.author_user_id === me);

  const deleteComment = async () => {
    if (!toDelete || !post) return;
    setDeleting(true);
    try {
      await OutstagramAPI.deleteComment(post.post_id, toDelete.comment_id);
      setComments((cs) => cs.filter((c) => c.comment_id !== toDelete.comment_id));
      toast.success('Comment deleted');
      setToDelete(null);
    } catch (e) {
      toast.error((e as Error).message || 'Could not delete the comment');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    const fetchPostData = async () => {
      try {
        setIsLoading(true);
        const [postData, commentsData, likesData] = await Promise.all([
          OutstagramAPI.getPost(postId),
          OutstagramAPI.getPostComments(postId),
          OutstagramAPI.getPostLikes(postId),
        ]);
        setPost(postData);
        setComments(commentsData || []);
        setLikes(likesData || []);
        if (postData) {
          setIsLikedOptimistic(postData.is_liked);
        }
      } catch (err) {
        setError('Failed to load post. Please try again later.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPostData();
  }, [postId]);

  const handleLike = async () => {
    if (!post) return;

    const originalIsLiked = isLikedOptimistic;
    setIsLikedOptimistic(!originalIsLiked);

    try {
      if (!originalIsLiked) {
        await OutstagramAPI.likePost(post.post_id);
      } else {
        await OutstagramAPI.unlikePost(post.post_id);
      }
    } catch (err) {
      setIsLikedOptimistic(originalIsLiked);
      toast.error(`Failed to ${originalIsLiked ? 'unlike' : 'like'} post.`);
      console.error(err);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay message={error} />;
  }

  if (!post) {
    return <ErrorDisplay message="Post not found." />;
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="sticky top-0 p-4 z-10 flex items-center">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-bold ml-4">Post</h1>
      </div>

      <Card className="m-4">
        <CardContent className="p-0">
          {post.media_urls && post.media_urls.length > 1 ? (
            <Carousel>
              <CarouselContent>
                {post.media_urls.map((media, index) => (
                  <CarouselItem key={index}>
                    <img src={media.url} alt={`Post media ${index + 1}`} className="w-full h-auto object-cover" />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          ) : post.media_urls && post.media_urls.length === 1 ? (
            <img src={post.media_urls[0].url} alt="Post media" className="w-full h-auto object-cover" />
          ) : (
            <div className="p-6">
              <p className="text-lg font-semibold">{post.caption}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="px-4 pb-4 space-y-4">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={handleLike}>
            <Heart className={`w-6 h-6 ${isLikedOptimistic ? 'text-red-500 fill-current' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon">
            <MessageCircle className="w-6 h-6" />
          </Button>
        </div>
        <p className="font-semibold">{likes.length + (isLikedOptimistic && !post.is_liked ? 1 : 0) - (!isLikedOptimistic && post.is_liked ? 1 : 0)} likes</p>
        <p>
          <button type="button" onClick={() => openProfile(post.author)} className="font-semibold hover:underline">{post.author}</button> {post.caption}
        </p>

        <div>
          <h2 className="font-semibold text-lg mb-2">Comments</h2>
          {comments.length > 0 ? (
            <ul className="space-y-2">
              {comments.map(comment => (
                <li key={comment.comment_id} className="group flex items-start gap-2">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarImage src={comment.author_avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author ?? comment.author_user_id}`} />
                    <AvatarFallback>{(comment.author ?? '?').charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <p className="min-w-0 flex-1 break-words">
                    {comment.author ? (
                      <button type="button" onClick={() => openProfile(comment.author!)} className="font-semibold hover:underline">{comment.author}</button>
                    ) : <span className="font-semibold">Someone</span>} {comment.content}
                  </p>
                  {canDelete(comment) && (
                    <Button variant="ghost" size="icon" aria-label="Delete comment" onClick={() => setToDelete(comment)}
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No comments yet.</p>
          )}
        </div>
        <AlertDialog open={toDelete !== null} onOpenChange={(o) => { if (!o && !deleting) setToDelete(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
              <AlertDialogDescription className="break-words">
                “{(toDelete?.content ?? '').slice(0, 120)}{(toDelete?.content.length ?? 0) > 120 ? '…' : ''}” will be removed for everyone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction disabled={deleting} onClick={(e) => { e.preventDefault(); deleteComment(); }}
                className="bg-destructive text-white hover:bg-destructive/90">
                {deleting ? 'Deleting…' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
