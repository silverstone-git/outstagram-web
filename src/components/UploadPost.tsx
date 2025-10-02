import React, { useState, useEffect } from 'react';
import { Upload, Camera, Image, X, Sparkles, Hash, MapPin, Users, Trophy, BookOpen, GraduationCap, Award, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { OutstagramAPI } from '../services/api';
import type { User as ApiUser, CreatePostData, MediaUrl } from '../services/api';

interface UploadPostProps {
  user: ApiUser;
}

function UploadPost({ user }: UploadPostProps) {
  const [caption, setCaption] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [hashtags, setHashtags] = useState('');
  const [location, setLocation] = useState('');
  const [postCategory, setPostCategory] = useState('general');
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [examData, setExamData] = useState({
    subject: '',
    score: '',
    totalMarks: '',
    grade: ''
  });

  // Cleanup object URLs when component unmounts or image changes
  useEffect(() => {
    return () => {
      if (selectedImage && selectedImage.startsWith('blob:')) {
        URL.revokeObjectURL(selectedImage);
      }
    };
  }, [selectedImage]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = event.target.files;
      if (files) {
        const fileArray = Array.from(files);
        
        // Validate file types and sizes
        const validFiles = fileArray.filter(file => {
          const isValidType = file.type.startsWith('image/');
          const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
          return isValidType && isValidSize;
        });
        
        if (validFiles.length !== fileArray.length) {
          toast.warning('Some files were skipped. Please only select images under 10MB.');
        }
        
        setSelectedFiles(validFiles);
        if (validFiles.length > 0) {
          // Create preview URL for the first image
          const previewUrl = URL.createObjectURL(validFiles[0]);
          setSelectedImage(previewUrl);
        }
      }
    } catch (error) {
      toast.error('Error selecting files. Please try again.');
    }
  };

  const handleShare = async () => {
    if (!selectedImage || !caption.trim()) return;

    setIsUploading(true);
    try {
      let mediaUrls: MediaUrl[] = [];

      // Upload files if local files are selected
      if (selectedFiles.length > 0) {
        const uploadResult = await OutstagramAPI.uploadImages(selectedFiles);
        mediaUrls = uploadResult.map(item => ({
          url: item.url,
          media_type: 'image' as const
        }));
      }

      // Enhance caption with exam data if it's an exam result post
      let enhancedCaption = caption;
      if (postCategory === 'exam_result' && examData.subject && examData.score && examData.totalMarks) {
        const percentage = ((parseFloat(examData.score) / parseFloat(examData.totalMarks)) * 100).toFixed(1);
        enhancedCaption += `\n\n📊 ${examData.subject} Result: ${examData.score}/${examData.totalMarks} (${percentage}%)`;
        if (examData.grade) {
          enhancedCaption += ` - Grade: ${examData.grade}`;
        }
      }

      const postData: CreatePostData = {
        media_urls: mediaUrls,
        highlighted_by_author: isHighlighted,
        caption: `${enhancedCaption} ${hashtags}`,
        post_category: postCategory,
      };

      await OutstagramAPI.createPost(postData);
      
      // Reset form
      setCaption('');
      setSelectedImage(null);
      setSelectedFiles([]);
      setHashtags('');
      setLocation('');
      setPostCategory('general');
      setIsHighlighted(false);
      setExamData({ subject: '', score: '', totalMarks: '', grade: '' });

      toast.success('Post shared successfully! 🎉');
    } catch (error) {
      toast.error('Failed to share post. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const postCategories = [
    { value: 'general', label: '🌟 General', icon: Sparkles },
    { value: 'academic', label: '📚 Academic', icon: BookOpen },
    { value: 'achievement', label: '🏆 Achievement', icon: Trophy },
    { value: 'study_group', label: '👥 Study Group', icon: Users },
    { value: 'exam_result', label: '📊 Exam Result', icon: GraduationCap },
    { value: 'project', label: '💡 Project', icon: Award },
  ];

  const studentHashtags = [
    '#StudyLife', '#ExamPrep', '#StudentVibes', '#AcademicGoals', 
    '#StudyGroup', '#ProjectWork', '#CampusLife', '#StudentSuccess'
  ];

  const trendingHashtags = postCategory === 'academic' || postCategory === 'exam_result' || postCategory === 'achievement' 
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
            disabled={!selectedImage || !caption.trim() || isUploading}
          >
            {isUploading ? 'Sharing...' : 'Share'}
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
              Choose Image
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedImage ? (
              <div className="relative">
                <div className="aspect-square rounded-xl overflow-hidden">
                  <img
                    src={selectedImage}
                    alt="Selected"
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-2 right-2 bg-background/80 hover:bg-background/90"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                {/* Upload Options */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button variant="outline" className="h-24 border-primary/30 text-primary hover:bg-primary/10 w-full" asChild>
                      <div className="flex flex-col items-center gap-2">
                        <Camera className="w-6 h-6" />
                        <span className="text-sm">Camera</span>
                      </div>
                    </Button>
                  </label>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button variant="outline" className="h-24 border-primary/30 text-primary hover:bg-primary/10 w-full" asChild>
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-6 h-6" />
                        <span className="text-sm">Gallery</span>
                      </div>
                    </Button>
                  </label>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Post Category */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <BookOpen className="w-5 h-5 text-primary" />
              Post Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={postCategory} onValueChange={setPostCategory}>
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
        {postCategory === 'exam_result' && (
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
                postCategory === 'exam_result' ? "Share your exam experience! How did you prepare? ✨" :
                postCategory === 'achievement' ? "Tell us about your achievement! 🏆" :
                postCategory === 'study_group' ? "Looking for study partners? Share your study plans! 📚" :
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
                    {postCategory === 'achievement' || postCategory === 'exam_result' 
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
                  postCategory === 'study_group' ? "Study location (Library, Cafe, etc.)" :
                  postCategory === 'exam_result' ? "Exam center or school name" :
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
          disabled={!selectedImage || !caption.trim() || isUploading}
        >
          {isUploading ? (
            <>
              <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Sharing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              {postCategory === 'exam_result' ? 'Share Your Results! 🎉' :
               postCategory === 'achievement' ? 'Share Your Achievement! 🏆' :
               postCategory === 'study_group' ? 'Find Study Buddies! 📚' :
               'Share Your Moment ✨'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export { UploadPost };
