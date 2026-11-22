// Deterministic API fixtures so screenshots never depend on a live backend.
const now = Date.parse('2026-11-20T10:00:00Z');
const ago = (h) => new Date(now - h * 3600e3).toISOString();

export const user = { user_id: 1, username: 'aryan', fullname: 'Aryan Demo', bio: 'PG physics aspirant' };

const img = (seed) =>
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="hsl(${seed * 67 % 360},55%,45%)"/><text x="50%" y="50%" font-size="64" fill="white" text-anchor="middle" font-family="sans-serif">post ${seed}</text></svg>`);

export const posts = [
  { post_id: 'p1', author: 'aryan', author_user_id: 1, post_category: 'exam_result', highlighted_by_author: true, is_liked: false,
    caption: 'GATE Physics mock #4 done 📊 72/100. Quantum finally clicking!', datetime_posted: ago(3), media_urls: [{ post_id: 'p1', url: img(1) }] },
  { post_id: 'p2', author: 'meera', author_user_id: 2, post_category: 'academic', highlighted_by_author: false, is_liked: true,
    caption: 'Notes on the hydrogen atom, with every derivation step written out.', datetime_posted: ago(20), media_urls: [{ post_id: 'p2', url: img(2) }] },
  { post_id: 'p3', author: 'kabir', author_user_id: 3, post_category: 'achievement', highlighted_by_author: false, is_liked: false,
    caption: 'Cleared CSIR NET 🎉 thank you all!', datetime_posted: ago(50), media_urls: [] },
];

export const profile = { user_id: 1, fullname: user.fullname, username: user.username, bio: user.bio,
  posts_count: 1, followers_count: 12, following_count: 9, they_follow_you: 0, you_follow_them: 0 };

// [method, regex on pathname+search, body]
export const routes = [
  ['GET', /^\/dashboard\/\d+/, posts.filter((p) => p.author_user_id === 1)],
  ['GET', /^\/feed/, posts],
  ['GET', /^\/users\/[^/]+\/posts\/\d+/, posts.filter((p) => p.author_user_id === 1)],
  ['GET', /^\/users\/[^/]+$/, profile],
  ['GET', /^\/follow-requests/, []],
  ['GET', /^\/posts\/p\d$/, posts[0]],
  ['GET', /^\/posts\/[^/]+\/(likes|comments)\/\d+/, []],
  ['GET', /^\/pariksha(\?|$)/, []],
  ['GET', /^\/api\/question_bank\/groups/, ['pg_physics']],
];
