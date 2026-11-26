// Admin panel API client. Auth: Google via Supabase PKCE -> POST /admin/session -> 2h admin JWT (sessionStorage).
// The server decides who is an admin (OUTSIE_ADMIN_EMAILS); this bundle is public and holds no secrets.
import { API_BASE_URL } from '../../services/api';

const TOKEN_KEY = 'outsie_admin_token';
export const ADMIN_PKCE_KEY = 'outsie_admin_pkce';

export type Session = { token: string; email: string; expires_at: string };

export function session(): Session | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(TOKEN_KEY) || 'null') as Session | null;
    if (s && new Date(s.expires_at).getTime() > Date.now() + 30_000) return s;
  } catch { /* corrupt */ }
  sessionStorage.removeItem(TOKEN_KEY);
  return null;
}

export function signOut() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export class AdminError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function detail(j: unknown, fallback: string): string {
  const d = (j as { detail?: unknown })?.detail;
  if (typeof d === 'string') return d;
  if (d && typeof d === 'object' && 'message' in d) return String((d as { message: unknown }).message);
  if (Array.isArray(d) && d[0]?.msg) return String(d[0].msg);
  return fallback;
}

export async function call<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const s = session();
  if (!s) throw new AdminError(401, 'Signed out');
  const { json, ...rest } = init;
  const r = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: { Authorization: `Bearer ${s.token}`, ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  if (r.status === 204) return undefined as T;
  let j: unknown = null;
  try { j = await r.json(); } catch { /* empty */ }
  if (!r.ok) {
    if (r.status === 401) signOut();
    throw new AdminError(r.status, detail(j, `Request failed (${r.status})`));
  }
  return j as T;
}

// ---- sign-in --------------------------------------------------------------------------------------

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function adminUrl(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/admin/`;
}

export async function startGoogle(): Promise<void> {
  const r = await fetch(`${API_BASE_URL}/auth/providers`);
  const p = (await r.json()) as { supabase_url: string | null; providers: string[] };
  if (!p.supabase_url) throw new Error('Google sign-in is not configured on the server');
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  sessionStorage.setItem(ADMIN_PKCE_KEY, verifier);
  const params = new URLSearchParams({ provider: 'google', redirect_to: adminUrl(), code_challenge: challenge,
    code_challenge_method: 's256' });
  window.location.assign(`${p.supabase_url}/auth/v1/authorize?${params}`);
}

/** Finishes the Google redirect (?code=). Null when this page load isn't a callback. */
export async function completeGoogle(): Promise<Session | null> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const err = url.searchParams.get('error_description') || url.searchParams.get('error');
  if (!code && !err) return null;
  for (const k of ['code', 'error', 'error_code', 'error_description', 'state']) url.searchParams.delete(k);
  window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  const verifier = sessionStorage.getItem(ADMIN_PKCE_KEY);
  sessionStorage.removeItem(ADMIN_PKCE_KEY);
  if (err) throw new Error(err);
  if (!verifier) throw new Error('Sign-in expired, try again');
  const r = await fetch(`${API_BASE_URL}/admin/session`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
  });
  let j: unknown = null;
  try { j = await r.json(); } catch { /* empty */ }
  if (!r.ok) throw new Error(detail(j, 'Not an admin account'));
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify(j));
  return j as Session;
}

// ---- types (mirror outstagram/src/repository/admin.py) ---------------------------------------------

export type Risk = { score: number; reasons: string[] };

export type UserRow = {
  user_id: number; username: string; fullname: string; email: string; avatar_url: string | null;
  created_at: string | null; email_verified: boolean; frozen: boolean; frozen_at: string | null;
  frozen_reason: string | null; plan: string; posts: number; comments: number; risk: Risk;
};

export type Flag = {
  id: number; kind: string; target_id: string; target_user_id: number | null; source: string;
  reporter_user_id: number | null; reporter?: string | null; labels: string[]; score: number; note: string | null;
  status: string; created_at: string; resolved_at: string | null; resolved_by: string | null;
};

export type AdminPost = {
  post_id: string; caption: string | null; post_category: string; datetime_posted: string;
  author_user_id: number | null; author: string | null; author_frozen: boolean; author_avatar_url: string | null;
  media: { url: string; media_type: string }[]; like_count: number; comment_count: number;
  scan: { score: number; labels: string[]; providers: string; scanned_at: string } | null; open_flags: number;
};

export type AuditEntry = {
  id: number; admin: string; action: string; target_kind: string; target_id: string;
  detail: Record<string, unknown>; created_at: string;
};

export type UserDetail = UserRow & {
  bio: string | null; date_of_birth: string | null; email_verified_at: string | null; followers: number;
  following: number; plan_valid_until: string | null; posts_recent: AdminPost[];
  comments_recent: { comment_id: number; post_id: string; content: string; datetime_commented: string }[];
  payments: { order_id: string; plan: string; amount: number; currency: string; status: string; created: string; paid: string | null }[];
  flags: Flag[]; actions: AuditEntry[]; ai_prompts_24h: number; exam_attempts: number; active_sessions: number;
};

export type QueueItem = {
  kind: 'post' | 'comment' | 'user'; target_id: string; score: number; labels: string[]; sources: string[];
  flags: Flag[]; user: { user_id: number; username: string; frozen: boolean; avatar_url: string | null; risk: Risk } | null;
  gone: boolean; post?: AdminPost | null;
  comment?: { comment_id: number; post_id: string; content: string; datetime_commented: string } | null;
};

export type Overview = {
  users: { total: number; new_24h: number; new_7d: number; verified: number; frozen: number; paid: number };
  posts: { total: number; new_24h: number; new_7d: number; unscanned: number };
  comments: { total: number; new_24h: number };
  likes_24h: number; exams_24h: number; ai_prompts_24h: number; revenue_30d_paise: number;
  queue: { open: number; post?: number; comment?: number; user?: number }; suspicious: number;
  moderation: { rules: boolean; ml: boolean; ml_model: string | null; vision: boolean; autoscan: boolean; threshold: number;
    vision_usage?: { month: string; used: number; cap: number; remaining: number; exhausted: boolean; near: boolean } };
  mail: boolean; you: string;
};

export type MailResult = { sent: boolean; error?: string } | null;
