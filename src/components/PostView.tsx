
import { useState, useEffect } from 'react';
import { Heart, MessageCircle, ArrowLeft } from 'lucide-react';
import { OutstagramAPI } from '../services/api';
import type { Post, Comment, Like } from '../services/api';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from './ui/carousel';
import { toast } from 'sonner';

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
          <span className="font-semibold">{post.author}</span> {post.caption}
        </p>

        <div>
          <h2 className="font-semibold text-lg mb-2">Comments</h2>
          {comments.length > 0 ? (
            <ul className="space-y-2">
              {comments.map(comment => (
                <li key={comment.comment_id} className="flex items-start space-x-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author_user_id}`} />
                    <AvatarFallback>{comment.author_user_id}</AvatarFallback>
                  </Avatar>
                  <p>
                    <span className="font-semibold">{comment.author_user_id}</span> {comment.content}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No comments yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
