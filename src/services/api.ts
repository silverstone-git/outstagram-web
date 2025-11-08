import Cookies from 'js-cookie';

import { fetchWithHandling, handleResponse } from './handle-response';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

// Development mode flag - set to false when real API is available
const USE_MOCK_API = false;

// You can change this to false to try connecting to the real API
// or add logic to detect if the API is available

// Auth types
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  fullname: string;
  username: string;
  bio: string;
  email: string;
  password: string;
  date_of_birth: string;
}

export interface User {
  user_id: number;
  username: string;
  fullname: string;
  bio: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterResponse {
  user_id: number;
  username: string;
  fullname: string;
  bio: string;
}

// Post types
export interface MediaUrl {
  url: string;
  media_type: 'image' | 'video';
}

export interface PostMediaUrl {
  post_id: string;
  url: string;
}

export interface CreatePostData {
  media_urls: MediaUrl[];
  highlighted_by_author: boolean;
  caption: string;
  post_category: string;
}

export interface Post {
  post_id: string;
  caption: string;
  post_category: string;
  datetime_posted: string;
  author_user_id: number;
  highlighted_by_author: boolean;
  is_liked: boolean;
  media_urls: PostMediaUrl[];
  author: string;
}

// Exam types
export interface ExamData {
  exam_title: string;
  exam_json_str: string;
}

export interface Exam {
  exam_id: string;
  exam_title: string;
  exam_json_str?: string;
  datetime_uploaded?: string;
}

// Comment and Like types
export interface Comment {
  comment_id: number;
  post_id: string;
  content: string;
  author_user_id: number;
  datetime_commented: string;
}

export interface Like {
  post_id: string;
  liker_user_id: number;
  liker_username?: string;
  datetime_liked: string;
}

// User Profile types
export interface UserProfile {
  user_id: number;
  fullname: string;
  username: string;
  bio: string;
  posts_count: number;
  followers_count: number;
  following_count: number;
  they_follow_you: number;
  you_follow_them: number;
}

// Follow Request types
export interface FollowRequest {
  request_id: number;
  requester_user_id: number;
  requested_user_id: number;
  datetime_requested: string;
  status: string;
  requester_username: string;
}

export interface MediaUploadResponse {
  object_key: string;
  presigned_url: string;
}

// API service class
export class OutstagramAPI {
  private static getAuthToken(): string | undefined {
    return Cookies.get('outstagram_token');
  }

  private static setAuthToken(token: string): void {
    Cookies.set('outstagram_token', token, { expires: 7, secure: true, sameSite: 'strict' });
  }

  public static removeAuthToken(): void {
    Cookies.remove('outstagram_token');
  }

  private static getAuthHeaders(): HeadersInit {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  // Mock data generators
  private static getMockUser(): User {
    return {
      user_id: 1,
      username: 'student_demo',
      fullname: 'Demo Student',
      bio: 'Passionate about learning and sharing knowledge! 🎓📚'
    };
  }

  private static getMockPosts(): Post[] {
    return [
      {
        post_id: 'mock-1',
        author: 'maya_student',
        author_user_id: 2,
        caption: 'Just aced my calculus exam! 📊 Score: 95/100 (95.0%) - Grade: A 🎉 All those late night study sessions paid off! Ready for the next challenge 💪 #StudyLife #ExamResult #MathIsLife',
        post_category: 'exam_result',
        datetime_posted: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        highlighted_by_author: true,
        is_liked: false,
        media_urls: [{
          post_id: 'mock-1',
          url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50JTIwc3R1ZHlpbmd8ZW58MXx8fHwxNzU4NjEyMzYwfDA&ixlib=rb-4.1.0&q=80&w=1080'
        }]
      },
      {
        post_id: 'mock-2',
        author: 'alex_achiever',
        author_user_id: 3,
        caption: 'Won first place in the university coding competition! 🏆 Three months of preparation and countless debugging sessions, but totally worth it! Thanks to my amazing study group for the support 👥 #Achievement #Coding #TeamWork',
        post_category: 'achievement',
        datetime_posted: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        highlighted_by_author: true,
        is_liked: true,
        media_urls: [{
          post_id: 'mock-2',
          url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2Rpbmcgd2luJTIwdHJvcGh5fGVufDF8fHx8MTc1ODYxMjM2MHww&ixlib=rb-4.1.0&q=80&w=1080'
        }]
      },
      {
        post_id: 'mock-3',
        author: 'study_buddy',
        author_user_id: 4,
        caption: 'Starting a new study group for Data Structures & Algorithms! 📚 We meet every Tuesday and Thursday at 7 PM in the library. Looking for 3-4 more dedicated students. DM me if interested! #StudyGroup #DSA #LetsLearnTogether',
        post_category: 'study_group',
        datetime_posted: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        highlighted_by_author: false,
        is_liked: false,
        media_urls: [{
          post_id: 'mock-3',
          url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkeSUyMGdyb3VwfGVufDF8fHx8MTc1ODYxMjM2MHww&ixlib=rb-4.1.0&q=80&w=1080'
        }]
      },
      {
        post_id: 'mock-4',
        author: 'project_master',
        author_user_id: 5,
        caption: 'Finally completed my machine learning project! 🤖 Built a sentiment analysis model with 89% accuracy. The dataset preprocessing was the hardest part, but learned so much about data cleaning and feature engineering! #MachineLearning #Project #DataScience',
        post_category: 'project',
        datetime_posted: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        highlighted_by_author: false,
        is_liked: true,
        media_urls: [{
          post_id: 'mock-4',
          url: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYWNoaW5lJTIwbGVhcm5pbmd8ZW58MXx8fHwxNzU4NjEyMzYwfDA&ixlib=rb-4.1.0&q=80&w=1080'
        }]
      }
    ];
  }

  // Helper method to simulate API delay
  private static async delay(ms: number = 500): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Authentication
  static async login(credentials: LoginCredentials): Promise<AuthResponse | null> {
    if (USE_MOCK_API) {
      await this.delay();
      
      // Mock login validation
      if (credentials.username && credentials.password) {
        const mockUser = this.getMockUser();
        const mockResponse: AuthResponse = {
          access_token: 'mock-token-' + Date.now(),
          token_type: 'bearer',
          user: mockUser
        };
        
        this.setAuthToken(mockResponse.access_token);
        return mockResponse;
      } else {
        throw new Error('Invalid credentials');
      }
    }

    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await fetchWithHandling(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const data = await handleResponse<AuthResponse>(response);
    if (data) {
      this.setAuthToken(data.access_token);
    }
    return data;
  }

  static async register(userData: RegisterData): Promise<RegisterResponse | null> {
    if (USE_MOCK_API) {
      await this.delay();
      
      return {
        user_id: Math.floor(Math.random() * 1000) + 1,
        username: userData.username,
        fullname: userData.fullname,
        bio: userData.bio
      };
    }

    const response = await fetchWithHandling(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    return handleResponse<RegisterResponse>(response);
  }

  // Posts
  static async createPost(postData: CreatePostData): Promise<Post | null> {
    if (USE_MOCK_API) {
      await this.delay();
      
      const newPost: Post = {
        post_id: 'new-post-' + Date.now(),
        author: 'student_demo',
        author_user_id: 1,
        caption: postData.caption,
        post_category: postData.post_category,
        datetime_posted: new Date().toISOString(),
        highlighted_by_author: postData.highlighted_by_author,
        is_liked: false,
        media_urls: postData.media_urls.map(media => ({
          post_id: 'new-post-' + Date.now(),
          url: media.url
        }))
      };
      
      return newPost;
    }

    const response = await fetchWithHandling(`${API_BASE_URL}/posts`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(postData),
    });

    return handleResponse<Post>(response);
  }

  static async uploadImages(files: File[]): Promise<MediaUrl[] | null> {
    if (USE_MOCK_API) {
      await this.delay(1000); // Simulate longer upload time
      
      // Return mock URLs for uploaded files
      return files.map((file, index) => {
          const isVideo = file.type.startsWith('video');
          return {
              url: `https://images.unsplash.com/photo-1434030216411-0b793f4b4173?mock=${index}`,
              media_type: isVideo ? 'video' : 'image'
          }
      });
    }

    if (files.length === 0) {
        return [];
    }

    const formData = new FormData();
    const token = this.getAuthToken();
    const headers = {
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
    };

    const getMediaType = (fileName: string): 'image' | 'video' => {
        const extension = fileName.split('.').pop()?.toLowerCase();
        if (extension && ['mp4', 'mov', 'avi', 'webm'].includes(extension)) {
            return 'video';
        }
        return 'image';
    };

    if (files.length === 1) {
        formData.append('file', files[0]);
        const response = await fetchWithHandling(`${API_BASE_URL}/media-upload`, {
            method: 'POST',
            headers,
            body: formData,
        });

        const result = await handleResponse<MediaUploadResponse>(response);
        if (!result) return null;
        return [{
            url: result.presigned_url,
            media_type: getMediaType(result.object_key),
        }];
    } else {
        files.forEach(file => {
            formData.append('files', file);
        });

        const response = await fetchWithHandling(`${API_BASE_URL}/media-upload/bulk`, {
            method: 'POST',
            headers,
            body: formData,
        });

        const results = await handleResponse<MediaUploadResponse[]>(response);
        if (!results) return null;
        return results.map(result => ({
            url: result.presigned_url,
            media_type: getMediaType(result.object_key),
        }));
    }
  }

  static async getFeed(page: number = 1, category?: string): Promise<Post[] | null> {
    if (USE_MOCK_API) {
      await this.delay();
      
      let posts = this.getMockPosts();
      
      // Filter by category if provided
      if (category && category !== '') {
        posts = posts.filter(post => post.post_category === category);
      }
      
      return posts;
    }

    const params = new URLSearchParams({ page: page.toString() });
    if (category) {
      params.append('category', category);
    }

    const response = await fetchWithHandling(`${API_BASE_URL}/feed?${params}`, {
      headers: this.getAuthHeaders(),
    });

    return handleResponse<Post[]>(response);
  }

  static async likePost(postId: string): Promise<Like | null> {
    if (USE_MOCK_API) {
      await this.delay(200);
      
      return {
        post_id: postId,
        liker_user_id: 1,
        datetime_liked: new Date().toISOString()
      };
    }

    const response = await fetchWithHandling(`${API_BASE_URL}/posts/${postId}/like`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    return handleResponse<Like>(response);
  }

  static async unlikePost(postId: string): Promise<void | null> {
    if (USE_MOCK_API) {
      await this.delay(200);
      return;
    }

    const response = await fetchWithHandling(`${API_BASE_URL}/posts/${postId}/like`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    return handleResponse(response);
  }

  static async commentOnPost(postId: string, content: string): Promise<Comment | null> {
    const response = await fetchWithHandling(`${API_BASE_URL}/posts/${postId}/comment`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ content }),
    });

    return handleResponse<Comment>(response);
  }

  static async getPostLikes(postId: string, page: number = 1): Promise<Like[] | null> {
    const response = await fetchWithHandling(`${API_BASE_URL}/posts/${postId}/likes/${page}`, {
      headers: this.getAuthHeaders(),
    });

    return handleResponse<Like[]>(response);
  }

  static async getPostComments(postId: string, page: number = 1): Promise<Comment[] | null> {
    const response = await fetchWithHandling(`${API_BASE_URL}/posts/${postId}/comments/${page}`, {
      headers: this.getAuthHeaders(),
    });

    return handleResponse<Comment[]>(response);
  }

  static async getPost(postId: string): Promise<Post | null> {
    const response = await fetchWithHandling(`${API_BASE_URL}/posts/${postId}`, {
      headers: this.getAuthHeaders(),
    });

    return handleResponse<Post>(response);
  }

  // Exams
  static async createExam(examData: ExamData): Promise<Exam | null> {
    const response = await fetchWithHandling(`${API_BASE_URL}/pariksha`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(examData),
    });

    return handleResponse<Exam>(response);
  }

  static async getExams(page: number = 1): Promise<Exam[] | null> {
    const response = await fetchWithHandling(`${API_BASE_URL}/pariksha?page=${page}`);

    return handleResponse<Exam[]>(response);
  }

  static async getExam(examId: string): Promise<Exam | null> {
    const response = await fetchWithHandling(`${API_BASE_URL}/pariksha/${examId}`);

    return handleResponse<Exam>(response);
  }

  // Dashboard
  static async getDashboard(page: number = 1): Promise<Post[] | null> {
    if (USE_MOCK_API) {
      await this.delay();
      
      // Return user's own posts for dashboard
      return [
        {
          post_id: 'user-post-1',
          author: 'student_demo',
          author_user_id: 1,
          caption: 'Just shared my latest exam results! 📊 Really proud of this achievement 🎉 Calculus has been challenging but I pushed through!',
          post_category: 'exam_result',
          datetime_posted: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          highlighted_by_author: true,
          is_liked: false,
          media_urls: [{
            post_id: 'user-post-1',
            url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50JTIwc3R1ZHlpbmd8ZW58MXx8fHwxNzU4NjEyMzYwfDA&ixlib=rb-4.1.0&q=80&w=1080'
          }]
        }
      ];
    }

    const response = await fetchWithHandling(`${API_BASE_URL}/dashboard/${page}`, {
      headers: this.getAuthHeaders(),
    });

    return handleResponse<Post[]>(response);
  }

  // User operations
  static async followUser(username: string): Promise<{ message: string } | null> {
    const response = await fetchWithHandling(`${API_BASE_URL}/users/${username}/follow`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    return handleResponse<{ message: string }>(response);
  }

  static async getUserProfile(username: string): Promise<UserProfile | null> {
    const response = await fetchWithHandling(`${API_BASE_URL}/users/${username}`, {
      headers: this.getAuthHeaders(),
    });

    return handleResponse<UserProfile>(response);
  }

  static async getUserPosts(username: string, page: number = 1): Promise<Post[] | null> {
    const response = await fetchWithHandling(`${API_BASE_URL}/users/${username}/posts/${page}`, {
      headers: this.getAuthHeaders(),
    });

    return handleResponse<Post[]>(response);
  }

  static async getFollowRequests(): Promise<FollowRequest[] | null> {
    const response = await fetchWithHandling(`${API_BASE_URL}/follow-requests`, {
      headers: this.getAuthHeaders(),
    });

    return handleResponse<FollowRequest[]>(response);
  }

  static async approveFollowRequest(requestId: number): Promise<{ user1_id: number; user2_id: number; being_followed: number; datetime_friended: string } | null> {
    const response = await fetchWithHandling(`${API_BASE_URL}/request-approve/${requestId}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    return handleResponse<{ user1_id: number; user2_id: number; being_followed: number; datetime_friended: string }>(response);
  }
}
