import React, { useState, useEffect } from 'react';
import { Camera, Image, X, Sparkles, Hash, MapPin, Users, Trophy, BookOpen, GraduationCap, Award, Star, Video } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { OutstagramAPI, UploadTooLargeError } from '../services/api';
import { compressImage, formatBytes } from '../lib/compress';
import { BillingAPI, openPaywall } from '../features/billing/billing';
import type { User as ApiUser, CreatePostData } from '../services/api';
import type { PostCategory } from '../types/post';

interface UploadPostProps {
  user: ApiUser;
  initialCategory?: PostCategory;
}

interface FilePreview {
  url: string;
  type: 'image' | 'video';
}

/** Photos + videos per post (the server's media_per_post). */
const MAX_MEDIA = 4;
/** Videos pass through the API here, and Cloud Run caps a request at 32 MB (the app uploads straight to storage). */
const WEB_VIDEO_MAX = 30_000_000;

function UploadPost({ user, initialCategory }: UploadPostProps) {
  const [caption, setCaption] = useState('');
  const [previews, setPreviews] = useState<FilePreview[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [hashtags, setHashtags] = useState('');
  const [location, setLocation] = useState('');
  const [postCategory, setPostCategory] = useState<PostCategory>(initialCategory ?? "academic");
  const [status, setStatus] = useState<string | null>(null);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [examData, setExamData] = useState({
    subject: '',
    score: '',
    totalMarks: '',
    grade: ''
  });

  // Cleanup object URLs when component unmounts or files change
  useEffect(() => {
    return () => {
      previews.forEach(preview => URL.revokeObjectURL(preview.url));
    };
  }, [previews]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = event.target.files;
      if (files) {
        const fileArray = Array.from(files);
        
        // Types here; plan limits (count, video size, videos at all) are checked on Share.
        const typed = fileArray.filter(file => {
          const isValidType = file.type.startsWith('image/') || file.type.startsWith('video/');
          if (!isValidType) toast.warning(`File type not supported: ${file.name}`);
          return isValidType;
        });
        const room = Math.max(0, MAX_MEDIA - selectedFiles.length);
        if (typed.length > room) toast.warning(`A post can have up to ${MAX_MEDIA} photos or videos.`);
        const validFiles = typed.slice(0, room);
        
        setSelectedFiles(prev => [...prev, ...validFiles]);

        const newPreviews = validFiles.map(file => ({
          url: URL.createObjectURL(file),
          type: (file.type.startsWith('image/') ? 'image' : 'video') as 'image' | 'video'
        }));
        setPreviews(prev => [...prev, ...newPreviews]);
      }
    } catch {
      toast.error('Error selecting files. Please try again.');
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => {
      const newPreviews = prev.filter((_, i) => i !== index);
      URL.revokeObjectURL(previews[index].url);
      return newPreviews;
    });
  };

  const handleShare = async () => {
    if (selectedFiles.length === 0 || !caption.trim()) return;

    setIsUploading(true);
    try {
      // Plan limits first (lib/plans.py): videos (none on Free, size by plan), then compress photos.
      const st = await BillingAPI.status().catch(() => null);
      const limit = st?.limits.media_bytes ?? 200_000;
      const videoLimit = st ? st.limits.video_bytes : 0;
      const videos = selectedFiles.filter((f) => f.type.startsWith('video/'));
      if (videos.length && videoLimit === 0) {
        openPaywall({ code: 'video_not_allowed', needs: 'pro',
          message: 'Posting videos needs Pro (up to 4 MB) or Contributor (up to 500 MB).' });
        return;
      }
      const bigVideo = videos.find((f) => videoLimit != null && f.size > videoLimit);
      if (bigVideo && videoLimit != null) {
        openPaywall({ code: 'media_too_large', needs: st?.plan === 'pro' ? 'contributor' : undefined,
          message: `"${bigVideo.name}" is ${formatBytes(bigVideo.size)}; videos are posted as they are and your plan allows ${formatBytes(videoLimit)}.` });
        return;
      }
      const tooBigForWeb = videos.find((f) => f.size > WEB_VIDEO_MAX);
      if (tooBigForWeb) {
        toast.error(`"${tooBigForWeb.name}" is ${formatBytes(tooBigForWeb.size)}. The web uploads videos up to ${formatBytes(WEB_VIDEO_MAX)}; post bigger ones from the Android app.`);
        return;
      }
      setStatus('Compressing…');
      const files = await Promise.all(selectedFiles.map((f) => compressImage(f, Math.min(limit, 200_000))));
      const saved = selectedFiles.reduce((a, f) => a + f.size, 0) - files.reduce((a, f) => a + f.size, 0);
      const big = files.find((f) => f.size > limit);
      if (big) {
        openPaywall({ code: 'media_too_large',
          message: `"${big.name}" is ${formatBytes(big.size)} even after compression; your plan allows ${formatBytes(limit)} per file.` });
        return;
      }
      setStatus(saved > 50_000 ? `Uploading (compressed, saved ${formatBytes(saved)})…` : 'Uploading…');
      const mediaUrls = await OutstagramAPI.uploadImages(files);
      if (!mediaUrls) {
        toast.error('Failed to upload media. Please try again.');
        return;
      }

      // Enhance caption with exam data if it's an exam result post
      let enhancedCaption = caption;
      if (postCategory === "exam_result" && examData.subject && examData.score && examData.totalMarks) {
        const percentage = ((parseFloat(examData.score) / parseFloat(examData.totalMarks)) * 100).toFixed(1);
        enhancedCaption += `\n\n📊 ${examData.subject} Result: ${examData.score}/${examData.totalMarks} (${percentage}%)`;
        if (examData.grade) {
          enhancedCaption += ` - Grade: ${examData.grade}`;
        }
      }

      const postCategoryLabel = postCategories.find(c => c.value === postCategory)?.label || postCategory;

      const postData: CreatePostData = {
        media_urls: mediaUrls,
        highlighted_by_author: isHighlighted,
        caption: `${enhancedCaption} ${hashtags}`,
        post_category: postCategoryLabel,
      };

      await OutstagramAPI.createPost(postData);
      
      // Reset form
      setCaption('');
      setPreviews([]);
      setSelectedFiles([]);
      setHashtags('');
      setLocation('');
      setPostCategory(initialCategory ?? "academic");
      setIsHighlighted(false);
      setExamData({ subject: '', score: '', totalMarks: '', grade: '' });

      toast.success('Post shared successfully! 🎉');
    } catch (e) {
      if (!(e instanceof UploadTooLargeError)) toast.error('Failed to share post. Please try again.');
    } finally {
      setIsUploading(false);
      setStatus(null);
    }
  };
  
  const postCategories = [
    { value: "tech", label: "Technology", icon: Sparkles },
    { value: "entertainment", label: "Entertainment", icon: Video },
    { value: "business", label: "Business", icon: Award },
    { value: "vlog", label: "Vlog", icon: Camera },
    { value: "lifestyle", label: "Lifestyle", icon: Users },
    { value: "academic", label: "Academic", icon: BookOpen },
    { value: "achievement", label: "Achievement", icon: Trophy },
    { value: "study_group", label: "Study Group", icon: Users },
    { value: "exam_result", label: "Exam Result", icon: GraduationCap },
    { value: "project", label: "Project", icon: Award },
  ];

  const studentHashtags = [
    '#StudyLife', '#ExamPrep', '#StudentVibes', '#AcademicGoals', 
    '#StudyGroup', '#ProjectWork', '#CampusLife', '#StudentSuccess'
  ];

  const trendingHashtags = postCategory === "academic" || postCategory === "exam_result" || postCategory === "achievement" 
    ? studentHashtags 
    : ['#GenZVibes', '#AestheticLife', '#PlantParent', '#FoodieLife', '#SelfCare', '#Mindful'];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-card/80 backdrop-blur-md border-b border-border p-4 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">✨ Create Post</h1>
          <Button 
            onClick={handleShare}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            disabled={previews.length === 0 || !caption.trim() || isUploading}
          >
            {isUploading ? (status ? 'Working…' : 'Sharing...') : 'Share'}
          </Button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* User Info */}
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12 ring-2 ring-primary/30">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
            <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-card-foreground">{user.fullname}</div>
            <div className="text-sm text-muted-foreground">@{user.username}</div>
          </div>
        </div>

        {/* Image Selection */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <Image className="w-5 h-5 text-primary" />
              Choose Media
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {previews.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {previews.map((preview, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden">
                    {preview.type === 'image' ? (
                      <img src={preview.url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                    ) : (
                      <video src={preview.url} className="w-full h-full object-cover" />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(index)}
                      className="absolute top-1 right-1 bg-background/60 hover:bg-background/80 h-6 w-6"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-primary/30 text-primary rounded-lg hover:bg-primary/10 transition-colors">
                    <Camera className="w-6 h-6" />
                    <span className="text-sm mt-1">Add Media</span>
                  </div>
                </label>
                <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border rounded-lg">
                  <Video className="w-6 h-6 text-muted-foreground" />
                  <span className="text-sm mt-1 text-muted-foreground">Live (Soon)</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Post Category, Exam Result, Caption, etc. remain the same */}
        {/* Post Category */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <BookOpen className="w-5 h-5 text-primary" />
              Post Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={postCategory} onValueChange={(value) => setPostCategory(value as PostCategory)}>
              <SelectTrigger className="border-border bg-input-background text-foreground">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {postCategories.map((category) => (
                  <SelectItem key={category.value} value={category.value} className="text-card-foreground">
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Exam Result Input (only for exam_result category) */}
        {postCategory === "exam_result" && (
          <Card className="bg-gradient-to-r from-accent/20 to-primary/20 border-accent/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <GraduationCap className="w-5 h-5 text-accent" />
                Exam Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Subject"
                  value={examData.subject}
                  onChange={(e) => setExamData(prev => ({ ...prev, subject: e.target.value }))}
                  className="border-border bg-input-background text-foreground placeholder:text-muted-foreground"
                />
                <Input
                  placeholder="Grade/Score"
                  value={examData.grade}
                  onChange={(e) => setExamData(prev => ({ ...prev, grade: e.target.value }))}
                  className="border-border bg-input-background text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Your Score"
                  type="number"
                  value={examData.score}
                  onChange={(e) => setExamData(prev => ({ ...prev, score: e.target.value }))}
                  className="border-border bg-input-background text-foreground placeholder:text-muted-foreground"
                />
                <Input
                  placeholder="Total Marks"
                  type="number"
                  value={examData.totalMarks}
                  onChange={(e) => setExamData(prev => ({ ...prev, totalMarks: e.target.value }))}
                  className="border-border bg-input-background text-foreground placeholder:text-muted-foreground"
                />
              </div>
              {examData.score && examData.totalMarks && (
                <div className="text-center p-3 bg-primary/10 rounded-lg">
                  <div className="text-lg font-bold text-primary">
                    {((parseFloat(examData.score) / parseFloat(examData.totalMarks)) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Score Percentage</div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Caption */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <Sparkles className="w-5 h-5 text-accent" />
              Caption
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder={
                postCategory === "exam_result" ? "Share your exam experience! How did you prepare? ✨" :
                postCategory === "achievement" ? "Tell us about your achievement! 🏆" :
                postCategory === "study_group" ? "Looking for study partners? Share your study plans! 📚" :
                "What's on your mind? ✨"
              }
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="min-h-24 border-border bg-input-background text-foreground placeholder:text-muted-foreground resize-none"
            />
            <div className="mt-2 text-sm text-muted-foreground text-right">
              {caption.length}/2200
            </div>
          </CardContent>
        </Card>

        {/* Hashtags */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <Hash className="w-5 h-5 text-primary" />
              Hashtags
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="#hashtags #separated #by #spaces"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              className="border-border bg-input-background text-foreground placeholder:text-muted-foreground"
            />
            <div>
              <p className="text-sm text-muted-foreground mb-2">Trending:</p>
              <div className="flex flex-wrap gap-2">
                {trendingHashtags.map((tag, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setHashtags(prev => prev ? `${prev} ${tag}` : tag)}
                    className="text-xs border-primary/30 text-primary hover:bg-primary/10"
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Highlight Toggle */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-accent" />
                <div>
                  <Label htmlFor="highlight-toggle" className="font-medium text-card-foreground">
                    Highlight this post
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {postCategory === "achievement" || postCategory === "exam_result" 
                      ? 'Showcase your academic success!' 
                      : 'Make this post stand out in your profile'}
                  </p>
                </div>
              </div>
              <Switch
                id="highlight-toggle"
                checked={isHighlighted}
                onCheckedChange={setIsHighlighted}
              />
            </div>
          </CardContent>
        </Card>

        {/* Location & Privacy */}
        <div className="grid grid-cols-1 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="font-medium text-card-foreground">Add Location</span>
              </div>
              <Input
                placeholder={
                  postCategory === "study_group" ? "Study location (Library, Cafe, etc.)" :
                  postCategory === "exam_result" ? "Exam center or school name" :
                  "Where was this taken?"
                }
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="border-border bg-input-background text-foreground placeholder:text-muted-foreground"
              />
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="font-medium text-card-foreground">Privacy</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="border-primary/30 text-primary bg-primary/10">
                  🌍 Public
                </Button>
                <Button variant="outline" size="sm" className="border-border text-muted-foreground">
                  👥 Study Circle
                </Button>
                <Button variant="outline" size="sm" className="border-border text-muted-foreground">
                  🔒 Private
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Post Button */}
        <Button 
          onClick={handleShare}
          className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground"
          disabled={previews.length === 0 || !caption.trim() || isUploading}
        >
          {isUploading ? (
            <>
              <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              {status || 'Sharing...'}
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              {postCategory === "exam_result" ? 'Share Your Results! 🎉' :
               postCategory === "achievement" ? 'Share Your Achievement! 🏆' :
               postCategory === "study_group" ? 'Find Study Buddies! 📚' :
               'Share Your Moment ✨'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export { UploadPost };
