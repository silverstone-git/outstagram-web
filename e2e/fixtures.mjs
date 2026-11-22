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
    content: 'A classical oscillator can rest at $x = 0$, but quantum mechanically $[\\hat x, \\hat p] = i\\hbar$ forbids $\\Delta x = \\Delta p = 0$ [1].\n\nMinimising $\\langle H \\rangle$ subject to $\\Delta x\\,\\Delta p \\ge \\hbar/2$ gives $$E_0 = \\frac{\\hbar\\omega}{2}.$$ So option A ignores the zero-point energy [2].',
    citations: [{ n: 1, doc: 'Griffiths QM', section: 'The Harmonic Oscillator' }, { n: 2, doc: 'Sakurai', section: 'Simple Harmonic Oscillator' }] },
  quota: { limit: 10, used: 4, remaining: 6, window_seconds: 3600, resets_at: null },
};

// [method, regex on pathname+search, body or (url) => body]
export const routes = [
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
  ['GET', /^\/users\/[^/]+$/, profile],
  ['GET', /^\/follow-requests/, []],
  ['GET', /^\/posts\/p\d$/, posts[0]],
  ['GET', /^\/posts\/[^/]+\/(likes|comments)\/\d+/, []],
  ['GET', /^\/pariksha(\?|$)/, []],
  ['GET', /^\/api\/question_bank\/groups/, ['pg_physics']],
];
