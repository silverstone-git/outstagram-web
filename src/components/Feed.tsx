import React, { useState, useEffect, useCallback } from 'react';
import { Heart, MessageCircle, Share, MoreVertical, Bookmark, Trophy, BookOpen, GraduationCap } from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { OutstagramAPI } from '../services/api';
import type { Post } from '../services/api';

// Types
interface CategoryOption {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }> | null;
}

// Constants
const CATEGORY_OPTIONS: CategoryOption[] = [
  { value: '', label: '🌟 All Posts', icon: null },
  { value: 'general', label: '✨ General', icon: null },
  { value: 'academic', label: '📚 Academic', icon: BookOpen },
  { value: 'achievement', label: '🏆 Achievement', icon: Trophy },
  { value: 'exam_result', label: '📊 Exam Results', icon: GraduationCap },
  { value: 'study_group', label: '👥 Study Groups', icon: null },
  { value: 'project', label: '💡 Projects', icon: null },
];

const CATEGORY_STYLES = {
  exam_result: 'bg-accent/20 text-accent',
  achievement: 'bg-primary/20 text-primary',
  academic: 'bg-blue-500/20 text-blue-400',
  default: 'bg-secondary/20 text-secondary-foreground',
} as const;

// Utility Functions
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h`;
  return `${Math.floor(diffInHours / 24)}d`;
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'academic': return <BookOpen className="w-4 h-4" />;
    case 'achievement': return <Trophy className="w-4 h-4" />;
    case 'exam_result': return <GraduationCap className="w-4 h-4" />;
    default: return null;
  }
};

const getCategoryStyle = (category: string): string => {
  return CATEGORY_STYLES[category as keyof typeof CATEGORY_STYLES] || CATEGORY_STYLES.default;
};

// Sub-components
interface CategoryFilterProps {
  categories: CategoryOption[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ 
  categories, 
  selectedCategory, 
  onCategoryChange 
}) => (
  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
    {categories.map((category) => {
      const IconComponent = category.icon;
      const isSelected = selectedCategory === category.value;
      
      return (
        <Button
          key={category.value}
          variant={isSelected ? "default" : "outline"}
          size="sm"
          onClick={() => onCategoryChange(category.value)}
          className={`flex-shrink-0 ${
            isSelected 
              ? 'bg-primary text-primary-foreground' 
              : 'border-primary/30 text-primary hover:bg-primary/10'
          }`}
        >
          {IconComponent && <IconComponent className="w-4 h-4 mr-1" />}
          {category.label}
        </Button>
      );
    })}
  </div>
);

interface PostHeaderProps {
  post: Post;
}

const PostHeader: React.FC<PostHeaderProps> = ({ post }) => (
  <CardHeader className="pb-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Avatar className="w-10 h-10 ring-2 ring-primary/30">
          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author}`} />
          <AvatarFallback>{post.author.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <div className="font-medium text-card-foreground">{post.author}</div>
            {getCategoryIcon(post.post_category)}
            {post.highlighted_by_author && (
              <div className="px-2 py-1 bg-accent/20 text-accent text-xs rounded-full">
                ⭐ Featured
              </div>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            @{post.author} • {formatTimeAgo(post.datetime_posted)}
          </div>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="text-muted-foreground">
        <MoreVertical className="w-5 h-5" />
      </Button>
    </div>
  </CardHeader>
);

interface PostActionsProps {
  post: Post;
  onLike: (postId: string) => void;
}

const PostActions: React.FC<PostActionsProps> = ({ post, onLike }) => (
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-4">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => onLike(post.post_id)}
        className={`p-2 transition-colors ${post.is_liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}
      >
        <Heart className={`w-6 h-6 transition-all ${post.is_liked ? 'fill-red-500 scale-110' : ''}`} />
      </Button>
      <Button variant="ghost" size="sm" className="p-2 text-muted-foreground hover:text-primary">
        <MessageCircle className="w-6 h-6" />
      </Button>
      <Button variant="ghost" size="sm" className="p-2 text-muted-foreground hover:text-primary">
        <Share className="w-6 h-6" />
      </Button>
    </div>
    <Button variant="ghost" size="sm" className="p-2 text-muted-foreground hover:text-accent">
      <Bookmark className="w-6 h-6" />
    </Button>
  </div>
);

interface PostContentProps {
  post: Post;
  onLike: (postId: string) => void;
}

const PostContent: React.FC<PostContentProps> = ({ post, onLike }) => (
  <CardContent className="p-0">
    {post.media_urls && post.media_urls.length > 0 && (
      <div className="aspect-square overflow-hidden bg-muted">
        <ImageWithFallback
          src={post.media_urls[0].url}
          alt={`Post by ${post.author}`}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
      </div>
    )}

    <div className="p-4">
      <PostActions post={post} onLike={onLike} />

      {/* Caption */}
      <div className="text-card-foreground mb-2">
        <span className="font-medium">@{post.author}</span>{' '}
        <span className="text-sm">{post.caption}</span>
      </div>

      {/* Category Badge */}
      {post.post_category !== 'general' && (
        <div className="mb-3">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getCategoryStyle(post.post_category)}`}>
            {getCategoryIcon(post.post_category)}
            {post.post_category.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      )}
    </div>
  </CardContent>
);

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onLike }) => (
  <Card 
    className={`bg-card border-border overflow-hidden transition-shadow hover:shadow-lg ${
      post.highlighted_by_author ? 'ring-2 ring-accent/50' : ''
    }`}
  >
    <PostHeader post={post} />
    <PostContent post={post} onLike={onLike} />
  </Card>
);

interface LoadingStateProps {
  message?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading feed...' }) => (
  <div className="text-center py-8">
    <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
    <p className="text-muted-foreground">{message}</p>
  </div>
);

interface EmptyStateProps {
  selectedCategory: string;
  onViewAll: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ selectedCategory, onViewAll }) => {
  const categoryLabel = CATEGORY_OPTIONS.find(c => c.value === selectedCategory)?.label.toLowerCase();
  
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">📚</div>
      <h3 className="text-lg font-medium text-card-foreground mb-2">No posts yet!</h3>
      <p className="text-muted-foreground mb-4">
        Be the first to share your {selectedCategory ? categoryLabel : 'content'}!
      </p>
      <Button 
        variant="outline" 
        onClick={onViewAll}
        className="border-primary/30 text-primary hover:bg-primary/10"
      >
        View All Posts
      </Button>
    </div>
  );
};

// Main Component
function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const loadFeed = useCallback(async (page: number = 1) => {
    try {
      setIsLoading(true);
      const feedPosts = await OutstagramAPI.getFeed(page, selectedCategory || undefined);
      
      setPosts(prevPosts => page === 1 ? feedPosts : [...prevPosts, ...feedPosts]);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading feed:', error);
      // TODO: Add error state handling
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadFeed(1);
  }, [loadFeed]);

  const handleLikePost = useCallback(async (postId: string) => {
    try {
      // Optimistic update
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.post_id === postId 
            ? { ...post, is_liked: !post.is_liked }
            : post
        )
      );
      
      await OutstagramAPI.likePost(postId);
    } catch (error) {
      console.error('Error liking post:', error);
      // Revert optimistic update on error
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.post_id === postId 
            ? { ...post, is_liked: !post.is_liked }
            : post
        )
      );
    }
  }, []);

  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  }, []);

  const handleLoadMore = useCallback(() => {
    loadFeed(currentPage + 1);
  }, [currentPage, loadFeed]);

  const handleViewAll = useCallback(() => {
    setSelectedCategory('');
  }, []);

  const isInitialLoading = isLoading && posts.length === 0;
  const hasNoPosts = !isLoading && posts.length === 0;
  const canLoadMore = !isLoading && posts.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 bg-card/80 backdrop-blur-md border-b border-border p-4 z-10">
        <div className="max-w-md mx-auto space-y-3">
          <h1 className="text-xl font-bold text-primary">✨ Your Feed</h1>
          <CategoryFilter 
            categories={CATEGORY_OPTIONS}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto space-y-4 p-4">
        {isInitialLoading && <LoadingState />}

        {posts.map((post) => (
          <PostCard 
            key={post.post_id} 
            post={post} 
            onLike={handleLikePost}
          />
        ))}

        {canLoadMore && (
          <div className="text-center py-8">
            <Button 
              variant="outline" 
              onClick={handleLoadMore}
              disabled={isLoading}
              className="border-primary/30 text-primary hover:bg-primary/10 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Load More Posts ✨'}
            </Button>
          </div>
        )}

        {hasNoPosts && (
          <EmptyState 
            selectedCategory={selectedCategory}
            onViewAll={handleViewAll}
          />
        )}
      </main>
    </div>
  );
}

export { Feed };
