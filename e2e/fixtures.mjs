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

const attemptsList = [
  { attempt_id: 'att-0', exam_id: null, exam_title: 'GATE Physics Mock', score: 41.67, max_score: 100, accuracy: 58, total_questions: 65, total_time_seconds: 9800, datetime_taken: ago(30) },
  { attempt_id: 'att-00', exam_id: null, exam_title: 'Electromagnetic Theory · quick practice', score: 7, max_score: 10, accuracy: 70, total_questions: 10, total_time_seconds: 1500, datetime_taken: ago(80) },
];

// Two questions per topic (MCQ/MSQ/NAT rotate), ids unique per topic so scoring keys never collide.
let n = 0;
const sample = (url) => {
  const topic = new URL(url).searchParams.get('topic') || 'topic';
  const name = topic.replace(/_/g, ' ');
  return [0, 1].map((k) => {
    const i = n++;
    const kind = ['MCQ', 'MSQ', 'NAT'][i % 3];
    const base = { id: `${topic}-${k}`, topic: name, difficulty: 'medium', type: kind,
      explanation: 'Using $E_n = \\hbar\\omega\\left(n + \\tfrac{1}{2}\\right)$ with $n = 0$ gives the zero-point energy.' };
    if (kind === 'NAT') return { ...base, question: `(${name}) Compute $\\frac{E_1}{E_0}$ for the 1D harmonic oscillator.`, answer_range: { min: 2.99, max: 3.01 } };
    return { ...base,
      question: `(${name}) For a particle in the potential $V(x) = \\tfrac{1}{2} m \\omega^2 x^2$, which ${kind === 'MSQ' ? 'statements are' : 'statement is'} correct about the ground state $\\psi_0(x) \\propto e^{-m\\omega x^2 / 2\\hbar}$?`,
      options: [
        { label: 1, value: 'Its energy is zero' },
        { label: 2, value: 'Its energy is $\\hbar\\omega/2$' },
        { label: 3, value: 'It saturates $\\Delta x\\, \\Delta p = \\hbar/2$' },
        { label: 4, value: 'It has one node' },
      ],
      ...(kind === 'MSQ' ? { answer_labels: [2, 3] } : { answer_label: 2 }) };
  });
};

export const chatReply = {
  message: { role: 'assistant', datetime_sent: ago(0),
    content: '### 1. Why not zero?\nA classical oscillator can rest at $x = 0$, but quantum mechanically $[\\hat x, \\hat p] = i\\hbar$ forbids $\\Delta x = \\Delta p = 0$ [1].\n\n### 2. Step-by-step\n1. **Uncertainty:** $\\Delta x\\,\\Delta p \\ge \\hbar/2$\n2. **Minimise** $\\langle H \\rangle$ under that constraint:\n\n$$E_0 = \\frac{\\hbar\\omega}{2}.$$\n\nSo option A ignores the zero-point energy [2].',
    citations: [{ n: 1, doc: 'Griffiths QM', section: 'The Harmonic Oscillator' }, { n: 2, doc: 'Sakurai', section: 'Simple Harmonic Oscillator' }] },
  quota: { limit: 10, used: 4, remaining: 6, window_seconds: 3600, resets_at: null },
};

const sse = (events) => ({ __raw: events.map(([e, d]) => `event: ${e}\ndata: ${JSON.stringify(d)}\n\n`).join(''), type: 'text/event-stream' });
const streamReply = sse([
  ['status', { text: 'Checking the textbooks…' }],
  ['meta', { citations: chatReply.message.citations, skills: ['physics'] }],
  ...chatReply.message.content.match(/[\s\S]{1,40}/g).map((t) => ['delta', { text: t }]),
  ['done', chatReply],
]);

export const stats = { posts: 1, posts_this_week: 1, achievements: 1, achievements_this_month: 1, study_groups: 0, study_groups_this_month: 0,
  followers: 12, following: 9, exams_taken: 2, exams_this_week: 1, avg_accuracy: 64, best_score_pct: 70, favorite_equations: 2 };
const freeLimits = { ai_prompts_per_hour: 10, tutor_threads: 10, tutor_bytes: 100000, media_bytes: 200000 };
export const billing = { plan: 'free', valid_until: null, limits: freeLimits, free_limits: freeLimits,
  pro_limits: { ai_prompts_per_hour: 60, tutor_threads: 1000, tutor_bytes: 25000000, media_bytes: 15000000 },
  usage: { ai: { limit: 10, used: 3, remaining: 7, resets_at: null }, tutor_threads: 2, tutor_bytes: 41000 },
  payments_enabled: true, test_mode: true, price: { amount: 9900, currency: 'INR', days: 30 } };

// [method, regex on pathname+search, body or (url) => body]; a body {__raw, type} is sent verbatim.
const followRequests = [
  { request_id: 41, requester_user_id: 2, requested_user_id: 1, datetime_requested: ago(2), status: 'pending', requester_username: 'meera', requester_avatar_url: null },
  { request_id: 42, requester_user_id: 4, requested_user_id: 1, datetime_requested: ago(30), status: 'pending', requester_username: 'rohan_physics_2027', requester_avatar_url: null },
];
const comments = [
  { comment_id: 7, post_id: 'p1', content: 'Congrats! Which book did you use for QM?', author_user_id: 2, author: 'meera', author_avatar_url: null, datetime_commented: ago(2) },
  { comment_id: 8, post_id: 'p1', content: 'Griffiths, then Sakurai for the harder bits.', author_user_id: 1, author: 'aryan', author_avatar_url: null, datetime_commented: ago(1) },
];
const searchResults = [
  { user_id: 2, username: 'meera', fullname: 'Meera Iyer', bio: null, avatar_url: null },
  { user_id: 5, username: 'meghna.s', fullname: 'Meghna Sharma', bio: 'CSIR NET 2026', avatar_url: null },
];
const me = { user_id: 1, username: user.username, fullname: user.fullname, bio: user.bio, email: 'aryan@example.com',
  email_verified: true, verification_required: true, avatar_url: null };


// --- admin panel mocks (/admin/) ---
const adminPost = (id, author, caption, score, labels, extra = {}) => ({
  post_id: id, caption, post_category: 'Lifestyle', datetime_posted: ago(1), author_user_id: author === 'quickcash99' ? 7 : 3, author,
  author_frozen: false, author_avatar_url: null, media: [], like_count: 2, comment_count: 1,
  scan: { score, labels, providers: 'rules,ml', scanned_at: ago(1) }, open_flags: labels.length ? 2 : 0, ...extra });
const spam = adminPost('p-spam', 'quickcash99', 'BUY FOLLOWERS 💸 crypto giveaway, DM me on telegram https://x.xyz https://y.xyz https://z.xyz', 0.93, ['scam', 'spam']);
const risk7 = { score: 7, reasons: ['2 open auto-flags', 'reported by 2 users', 'email not confirmed', 'random-looking username'] };
const adminUser = { user_id: 7, username: 'quickcash99', fullname: 'Quick Cash', email: 'qc99@example.com', avatar_url: null,
  created_at: ago(1), email_verified: false, frozen: false, frozen_at: null, frozen_reason: null, plan: 'free', posts: 4, comments: 31, risk: risk7 };
const flag = (id, source, score, labels, note, reporter = null) => ({ id, kind: 'post', target_id: 'p-spam', target_user_id: 7, source,
  reporter_user_id: reporter ? 9 : null, reporter, labels, score, note, status: 'open', created_at: ago(1), resolved_at: null, resolved_by: null });
const adminRoutes = [
  ['POST', /^\/admin\/session/, { token: 'admin-token', email: 'admin@example.com', expires_at: new Date(Date.now() + 7200e3).toISOString() }],
  ['GET', /^\/admin\/overview/, { users: { total: 128, new_24h: 6, new_7d: 31, verified: 110, frozen: 2, paid: 9 },
    posts: { total: 540, new_24h: 22, new_7d: 140, unscanned: 12 }, comments: { total: 1900, new_24h: 80 }, likes_24h: 410,
    exams_24h: 57, ai_prompts_24h: 230, revenue_30d_paise: 89100, queue: { open: 3, post: 2, comment: 1 }, suspicious: 1,
    moderation: { rules: true, ml: true, ml_model: 'gemini-flash-lite', vision: true, autoscan: true, threshold: 0.6,
      vision_usage: { month: '2026-11', used: 900, cap: 900, remaining: 0, exhausted: true, near: true } }, mail: true, you: 'admin@example.com' }],
  ['GET', /^\/admin\/moderation\/queue/, { total: 2, items: [
    { kind: 'post', target_id: 'p-spam', score: 0.93, labels: ['scam', 'spam'], sources: ['ml', 'report', 'rules'], gone: false, post: spam,
      user: { user_id: 7, username: 'quickcash99', frozen: false, avatar_url: null, risk: risk7 },
      flags: [flag(1, 'ml', 0.93, ['scam'], 'Selling followers and crypto scheme'), flag(2, 'rules', 1, ['scam', 'spam'], '3 links; scam words: buy followers, crypto, giveaway, telegram'),
        flag(3, 'report', 0.5, ['spam'], 'spam: keeps posting this', 'meera')] },
    { kind: 'comment', target_id: '42', score: 0.81, labels: ['harassment'], sources: ['ml'], gone: false,
      comment: { comment_id: 42, post_id: 'p1', content: 'nobody likes you, just quit', datetime_commented: ago(2) },
      user: { user_id: 3, username: 'troll_acc', frozen: false, avatar_url: null, risk: { score: 2, reasons: ['1 open auto-flag'] } },
      flags: [{ ...flag(4, 'ml', 0.81, ['harassment'], 'Insulting another user'), kind: 'comment', target_id: '42' }] },
  ] }],
  ['GET', /^\/admin\/users\/\d+/, { ...adminUser, bio: 'earn daily', date_of_birth: '2001-01-01', email_verified_at: null, followers: 0, following: 212,
    plan_valid_until: null, posts_recent: [spam], comments_recent: [{ comment_id: 50, post_id: 'p1', content: 'check my bio 💸', datetime_commented: ago(1) }],
    payments: [], flags: [flag(1, 'ml', 0.93, ['scam'], 'Selling followers')], actions: [], ai_prompts_24h: 0, exam_attempts: 0, active_sessions: 2 }],
  ['GET', /^\/admin\/users/, { total: 2, users: [adminUser, { ...adminUser, user_id: 1, username: 'aryan', fullname: 'Aryan Demo', email: 'aryan@example.com',
    email_verified: true, plan: 'pro', posts: 12, comments: 40, created_at: ago(40), risk: { score: 0, reasons: [] } }] }],
  ['GET', /^\/admin\/posts/, { total: 2, posts: [spam, adminPost('p-ok', 'aryan', 'Finally cracked the harmonic oscillator ladder operators', 0.04, [])] }],
  ['GET', /^\/admin\/audit/, { total: 2, actions: [
    { id: 2, admin: 'admin@example.com', action: 'delete_post', target_kind: 'post', target_id: 'p-old', detail: { reason: 'spam', author: 'quickcash99' }, created_at: ago(1) },
    { id: 1, admin: 'admin@example.com', action: 'freeze', target_kind: 'user', target_id: '5', detail: { reason: 'scam ring', username: 'freecoins' }, created_at: ago(3) }] }],
  ['POST', /^\/posts\/[^/]+\/report/, { reported: true }],
  ['DELETE', /^\/posts\/[^/]+$/, { deleted: true }],
];

export const routes = [
  ...adminRoutes,
  ['POST', /^\/auth\/email\/link/, { access_token: 'test-token', token_type: 'bearer', user, created: false, next: null }],
  ['POST', /^\/exam-attempts\/[^/]+\/chat\/stream/, streamReply],
  ['GET', /^\/me\/stats/, stats],
  ['GET', /^\/trending/, [{ tag: '#ExamPrep', posts: 14 }, { tag: '#Physics', posts: 9 }, { tag: '#StudyGroup', posts: 4 }]],
  ['GET', /^\/ai\/skills/, { skills: [{ skill: 'physics', title: 'Physics', documents: 13 }, { skill: 'history', title: 'History', documents: 3 }, { skill: 'geography', title: 'Geography', documents: 2 }], default: 'physics' }],
  ['GET', /^\/ai\/chats/, { threads: [
    { attempt_id: 'att-0', question_id: 'q1', exam_title: 'GATE Physics Mock', question: 'Ground-state energy of $V = \\tfrac12 m\\omega^2 x^2$?', messages: 4, bytes: 2400, last_at: ago(5), last_preview: 'Because…' },
  ], usage: { threads: 2, bytes: 41000, max_threads: 10, max_bytes: 100000, plan: 'free' } }],
  ['GET', /^\/ai\/options/, { plan: 'free', allowed: false, efforts: ['auto', 'low', 'medium', 'high'],
    models: [{ id: 'gemini-flash-lite', label: 'Flash Lite · fastest', plan: 'pro', available: false },
      { id: 'gemini-flash', label: 'Gemini Flash · smarter', plan: 'pro', available: false },
      { id: 'heavy', label: 'Heavy · strongest (can take a minute)', plan: 'contributor', available: false }],
    byok: { allowed: false, per_hour: 300, note: 'Your key stays on this device.', providers: [
      { id: 'openai', api_type: 'openai', label: 'OpenAI', base_url: 'https://api.openai.com/v1', models_hint: 'model id' },
      { id: 'anthropic', api_type: 'anthropic', label: 'Anthropic (Claude)', base_url: 'https://api.anthropic.com', models_hint: 'claude-sonnet-5-5' }] },
    context: { passages: 8, chars: 16000, history_turns: 12 },
    upgrade: { code: 'ai_options', message: 'Choosing the model, the thinking level and using your own API key come with Pro or Contributor.', upgrade: true } }],
  ['GET', /^\/favorites\/equations/, [
    { id: 1, latex: 'E_0 = \\frac{\\hbar\\omega}{2}', display: true, skill: 'physics', context: 'Harmonic oscillator ground state', datetime_created: ago(2) },
    { id: 2, latex: '\\nabla \\cdot \\mathbf{E} = \\rho/\\varepsilon_0', display: false, skill: 'physics', context: "Gauss's law", datetime_created: ago(9) },
  ]],
  ['POST', /^\/favorites\/equations/, { id: 3, latex: 'x', display: false, datetime_created: ago(0) }],
  ['GET', /^\/billing\/status/, billing],
  ['GET', /^\/billing\/plans/, { currency: 'INR', plans: [
    { id: 'free', price: 0, days: null, limits: freeLimits },
    { id: 'pro', price: 99, days: 30, limits: { ai_prompts_per_hour: 60, tutor_threads: 1000, tutor_bytes: 25000000, media_bytes: 15000000 } }] }],
  ['GET', /^\/api\/question_bank\/topics$/, [{ name: 'Quantum Mechanics', slug: 'quantum_mechanics', count: 120 }, { name: 'Electrodynamics', slug: 'electrodynamics', count: 80 }]],
  ['GET', /^\/auth\/providers/, { supabase_url: null, providers: [] }],
  ['GET', /^\/api\/question_bank\/sample/, sample],
  ['GET', /^\/ai\/quota/, { limit: 10, used: 3, remaining: 7, window_seconds: 3600, resets_at: null }],
  ['GET', /^\/exam-attempts\?/, attemptsList],
  ['POST', /^\/exam-attempts$/, { ...attemptsList[0], attempt_id: 'att-1', exam_title: 'Quantum Mechanics · quick practice' }],
  ['GET', /^\/exam-attempts\/[^/]+\/chat/, []],
  ['POST', /^\/exam-attempts\/[^/]+\/chat/, chatReply],
  ['GET', /^\/pariksha\?page=/, [
    { exam_id: 'c1', exam_title: 'Mathematical Methods – Complex Analysis Drill', datetime_uploaded: ago(100) },
    { exam_id: 'c2', exam_title: 'Statistical Mechanics: Ensembles and Partition Functions (long title to test truncation on phones)', datetime_uploaded: ago(200) },
  ]],
  ['GET', /^\/dashboard\/\d+/, posts.filter((p) => p.author_user_id === 1)],
  ['GET', /^\/feed/, posts],
  ['GET', /^\/users\/[^/]+\/posts\/\d+/, posts.filter((p) => p.author_user_id === 1)],
  ['GET', /^\/users\/search\?/, searchResults],
  ['GET', /^\/me$/, me],
  ['PUT', /^\/me$/, me],
  ['GET', /^\/users\/[^/]+$/, profile],
  ['GET', /^\/follow-requests/, followRequests],
  ['GET', /^\/posts\/p\d$/, posts[0]],
  ['GET', /^\/posts\/[^/]+\/comments\/\d+/, comments],
  ['GET', /^\/posts\/[^/]+\/likes\/\d+/, []],
  ['GET', /^\/pariksha(\?|$)/, []],
  ['GET', /^\/api\/question_bank\/groups/, ['pg_physics']],
];
