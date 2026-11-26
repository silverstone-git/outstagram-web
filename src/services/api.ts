import Cookies from 'js-cookie';

import { fetchWithHandling, handleResponse } from './handle-response';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

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

export interface EmailLinkResult extends Partial<AuthResponse> {
  created?: boolean;
  next?: 'password' | null;
  reset_token?: string;
  changed_email?: string;
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
  media_type?: 'image' | 'video';
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
  author_avatar_url?: string | null;
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
  author?: string;
  author_avatar_url?: string | null;
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
  avatar_url?: string | null;
  /** daily exam streak (freezes counted) */
  streak?: number;
}

/** A row of GET /users/{u}/followers|following/{page}. */
export interface FollowUser {
  user_id: number;
  username: string;
  fullname: string;
  bio: string | null;
  avatar_url: string | null;
  you_follow_them: number;
  is_you: boolean;
}

// Follow Request types
export interface FollowRequest {
  request_id: number;
  requester_user_id: number;
  requested_user_id: number;
  datetime_requested: string;
  status: string;
  requester_username: string;
  requester_avatar_url?: string | null;
}

/** A row of GET /users/search. */
export interface UserSearchResult {
  user_id: number;
  username: string;
  fullname: string;
  bio: string | null;
  avatar_url: string | null;
}

export interface MediaUploadResponse {
  object_key: string;
  presigned_url: string;
  bytes?: number;
  media_type?: 'image' | 'video';
}

/** Everything here is counted from the database by GET /me/stats. */
export interface MyStats {
  posts: number; posts_this_week: number;
  achievements: number; achievements_this_month: number;
  study_groups: number; study_groups_this_month: number;
  followers: number; following: number;
  exams_taken: number; exams_this_week: number;
  avg_accuracy: number | null; best_score_pct: number | null;
  favorite_equations: number;
}
export interface TrendingTag { tag: string; posts: number }

/** Upload refused for size; the paywall has been opened if upgrading would help. */
/** GET /me: the account's email and whether it's confirmed (posting and the AI tutor need it). */
export interface Me {
  user_id: number;
  username: string;
  email: string;
  fullname?: string;
  bio?: string | null;
  email_verified: boolean;
  verification_required?: boolean;
  avatar_url?: string | null;
}

export class UploadTooLargeError extends Error {}

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

  public static getAuthHeaders(): HeadersInit {
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

  // ---- Social sign-in (Google via Supabase Auth, PKCE). The backend says which providers are on. ----
  private static PKCE_KEY = 'outstagram_pkce_verifier';

  static async getAuthProviders(): Promise<{ supabase_url: string | null; providers: string[] }> {
    try {
      const r = await fetch(`${API_BASE_URL}/auth/providers`);
      if (r.ok) return await r.json();
    } catch { /* older backend or offline: no social buttons */ }
    return { supabase_url: null, providers: [] };
  }

  static async startSocialLogin(supabaseUrl: string, provider: string): Promise<void> {
    const b64url = (bytes: Uint8Array) =>
      btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
    const challenge = b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
    sessionStorage.setItem(this.PKCE_KEY, verifier);
    const params = new URLSearchParams({
      provider,
      redirect_to: window.location.origin + window.location.pathname,
      code_challenge: challenge,
      code_challenge_method: 's256',
    });
    window.location.assign(`${supabaseUrl}/auth/v1/authorize?${params}`);
  }

  /** On return from the provider: exchanges ?code= for an outsie session. Null when this isn't a callback. */
  static async completeSocialLogin(): Promise<AuthResponse | null> {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const providerError = url.searchParams.get('error_description') || url.searchParams.get('error');
    const verifier = sessionStorage.getItem(this.PKCE_KEY);
    if (!code && !providerError) return null;
    // Strip the OAuth params so a refresh doesn't replay them
    for (const k of ['code', 'error', 'error_code', 'error_description', 'state']) url.searchParams.delete(k);
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    sessionStorage.removeItem(this.PKCE_KEY);
    if (providerError) throw new Error(providerError);
    if (!verifier) throw new Error('Sign-in session expired, please try again');
    const r = await fetch(`${API_BASE_URL}/auth/supabase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
    });
    if (!r.ok) {
      let detail = 'Sign-in failed, please try again';
      try { const j = await r.json(); if (typeof j.detail === 'string') detail = j.detail; } catch { /* not JSON */ }
      throw new Error(detail);
    }
    const data = (await r.json()) as AuthResponse;
    this.setAuthToken(data.access_token);
    return data;
  }

  // ---- Emailed 6-digit codes: sign in, forgot password, confirm email (outsie asks Supabase to send them) ----

  private static async json<T>(path: string, body: unknown, auth = false): Promise<T | null> {
    const r = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: auth ? this.getAuthHeaders() : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!r.ok) {
      let detail = `Request failed (${r.status})`;
      try {
        const j = await r.json();
        detail = typeof j.detail === 'string' ? j.detail : (j.detail?.message ?? (Array.isArray(j.detail) ? j.detail[0]?.msg : detail));
      } catch { /* not JSON */ }
      throw new Error(detail);
    }
    return r.status === 204 ? null : ((await r.json()) as T);
  }

  static async emailCodeStart(email: string): Promise<void> {
    await this.json('/auth/email/start', { email: email.trim().toLowerCase() });
  }

  static async emailCodeSignIn(email: string, code: string): Promise<AuthResponse> {
    const data = (await this.json<AuthResponse>('/auth/email/verify', { email: email.trim().toLowerCase(), code }))!;
    this.setAuthToken(data.access_token);
    return data;
  }

  /** Magic link from the code email: signs in (a forgot-password link also returns reset_token), or for a
   * change-email link, changes that account's email without signing in. */
  static async emailLinkSignIn(link: { token_hash?: string; access_token?: string }): Promise<EmailLinkResult> {
    const data = (await this.json<EmailLinkResult>('/auth/email/link', link))!;
    if (data.access_token) this.setAuthToken(data.access_token);
    return data;
  }

  static async resetPasswordWithLink(resetToken: string, newPassword: string): Promise<AuthResponse> {
    const data = (await this.json<AuthResponse>('/auth/password/reset-link', { reset_token: resetToken, new_password: newPassword }))!;
    this.setAuthToken(data.access_token);
    return data;
  }

  static async forgotPassword(email: string): Promise<void> {
    await this.json('/auth/password/forgot', { email: email.trim().toLowerCase() });
  }

  static async resetPassword(email: string, code: string, newPassword: string): Promise<AuthResponse> {
    const data = (await this.json<AuthResponse>('/auth/password/reset', {
      email: email.trim().toLowerCase(), code, new_password: newPassword,
    }))!;
    this.setAuthToken(data.access_token);
    return data;
  }

  static async getMe(): Promise<Me> {
    const r = await fetchWithHandling(`${API_BASE_URL}/me`, { headers: this.getAuthHeaders() });
    return (await handleResponse<Me>(r))!;
  }

  /** Profile photo: the server crops it to a 512 px square. Needs a confirmed email. */
  static async setAvatar(file: File): Promise<string | null> {
    const form = new FormData();
    form.append('file', file);
    const token = Cookies.get('outstagram_token');
    const r = await fetchWithHandling(`${API_BASE_URL}/me/avatar`, {
      method: 'PUT', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form,
    });
    return (await handleResponse<{ avatar_url: string | null }>(r))?.avatar_url ?? null;
  }

  static async removeAvatar(): Promise<void> {
    const r = await fetchWithHandling(`${API_BASE_URL}/me/avatar`, { method: 'DELETE', headers: this.getAuthHeaders() });
    await handleResponse(r);
  }

  static async sendVerifyCode(): Promise<void> {
    const r = await fetchWithHandling(`${API_BASE_URL}/me/email/verify/start`, { method: 'POST', headers: this.getAuthHeaders() });
    await handleResponse(r);
  }

  static async verifyEmail(code: string): Promise<Me> {
    const r = await fetchWithHandling(`${API_BASE_URL}/me/email/verify`, {
      method: 'POST', headers: this.getAuthHeaders(), body: JSON.stringify({ code }),
    });
    return (await handleResponse<Me>(r))!;
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
    // post limit (402) / videos on Free (403): open the upgrade sheet
    const { paywallFrom } = await import('../features/billing/billing');
    const pw = await paywallFrom(response);
    if (pw) throw new UploadTooLargeError(pw.message || 'Upgrade needed');

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

    const tooLarge = async (response: Response) => {
        if (response.status !== 413) return;
        const { paywallFrom } = await import('../features/billing/billing');
        const d = await paywallFrom(response);
        const body = d ?? (await response.json().catch(() => ({})))?.detail;
        throw new UploadTooLargeError(body?.message || 'File too large');
    };

    // One file per request: a post's photos together can pass Cloud Run's 32 MB request cap (20 MB each on Contributor).
    if (files.length > 1) {
        const out: MediaUrl[] = [];
        for (const f of files) {
            const one = await this.uploadImages([f]);
            if (!one) return null;
            out.push(...one);
        }
        return out;
    }
    if (files.length === 1) {
        formData.append('file', files[0]);
        const response = await fetchWithHandling(`${API_BASE_URL}/media-upload`, {
            method: 'POST',
            headers,
            body: formData,
        });
        await tooLarge(response);

        const result = await handleResponse<MediaUploadResponse>(response);
        if (!result) return null;
        return [{
            url: result.presigned_url,
            media_type: result.media_type ?? getMediaType(result.object_key),
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
        await tooLarge(response);

        const results = await handleResponse<MediaUploadResponse[]>(response);
        if (!results) return null;
        return results.map(result => ({
            url: result.presigned_url,
            media_type: result.media_type ?? getMediaType(result.object_key),
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

  static async getMyStats(): Promise<MyStats | null> {
    const response = await fetchWithHandling(`${API_BASE_URL}/me/stats`, { headers: this.getAuthHeaders() });
    return handleResponse<MyStats>(response);
  }

  static async getTrending(days = 30): Promise<TrendingTag[]> {
    const response = await fetchWithHandling(`${API_BASE_URL}/trending?days=${days}`, { headers: this.getAuthHeaders() });
    return (await handleResponse<TrendingTag[]>(response)) ?? [];
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

  /** Unfollow, or cancel a pending request. */
  static async unfollowUser(username: string): Promise<void> {
    const r = await fetchWithHandling(`${API_BASE_URL}/users/${encodeURIComponent(username)}/follow`, {
      method: 'DELETE', headers: this.getAuthHeaders(),
    });
    if (!r.ok && r.status !== 404) throw new Error((await r.json().catch(() => null))?.detail || 'Could not unfollow');
  }

  /** `which`: followers or following; 30 per page. */
  static async getFollowList(username: string, which: 'followers' | 'following', page = 1): Promise<FollowUser[]> {
    const r = await fetchWithHandling(`${API_BASE_URL}/users/${encodeURIComponent(username)}/${which}/${page}`, {
      headers: this.getAuthHeaders(),
    });
    return (await handleResponse<FollowUser[]>(r)) ?? [];
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

  /** Decline a follow request addressed to you (they can ask again later). */
  static async rejectFollowRequest(requestId: number): Promise<void> {
    const r = await fetchWithHandling(`${API_BASE_URL}/request-reject/${requestId}`, {
      method: 'POST', headers: this.getAuthHeaders(),
    });
    await handleResponse(r);
  }

  /** Edit your name (1–60) and/or bio (≤ 160; "" clears it). Returns the GET /me body. */
  static async updateProfile(changes: { fullname?: string; bio?: string }): Promise<Me> {
    const r = await fetchWithHandling(`${API_BASE_URL}/me`, {
      method: 'PUT', headers: this.getAuthHeaders(), body: JSON.stringify(changes),
    });
    return (await handleResponse<Me>(r))!;
  }

  /** Delete a comment: allowed for its author and for the post's author. */
  static async deleteComment(postId: string, commentId: number): Promise<void> {
    const r = await fetchWithHandling(`${API_BASE_URL}/posts/${encodeURIComponent(postId)}/comments/${commentId}`, {
      method: 'DELETE', headers: this.getAuthHeaders(),
    });
    await handleResponse(r);
  }

  /** Username prefix or name substring; never includes yourself. */
  static async searchUsers(q: string, limit = 20): Promise<UserSearchResult[]> {
    const r = await fetchWithHandling(`${API_BASE_URL}/users/search?q=${encodeURIComponent(q)}&limit=${limit}`, {
      headers: this.getAuthHeaders(),
    });
    return (await handleResponse<UserSearchResult[]>(r)) ?? [];
  }
}
