// Builds nothing: serves ../dist under BASE, fakes the API, and screenshots each screen at
// phone + desktop size. Output: e2e/out/<viewport>-<screen>.png and e2e/out/report.json.
// Usage: node e2e/screens.mjs   (env: BASE=/outstagram/, API=<VITE_API_BASE_URL used for the build>)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { routes, user } from './fixtures.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(here, '../dist');
const OUT = path.resolve(here, 'out');
const BASE = process.env.BASE || '/';
const API = new URL(process.env.API || 'http://localhost:3000');
fs.mkdirSync(OUT, { recursive: true });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!p.startsWith(BASE)) { res.writeHead(404).end(); return; }
  let f = path.join(DIST, p.slice(BASE.length));
  if (!f.startsWith(DIST)) { res.writeHead(403).end(); return; }
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'index.html');
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(4173, '127.0.0.1', r));
const ORIGIN = 'http://127.0.0.1:4173';

const viewports = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1280, height: 800 } },
};
const nav = (label) => async (page) => {
  await page.getByRole('button', { name: label, exact: true }).click();
  await page.waitForLoadState('networkidle');
};
const startPractice = async (page) => {
  await nav('Exams')(page);
  await page.getByRole('button', { name: 'Quantum Mechanics', exact: true }).click();
  await page.getByText('Q1', { exact: false }).first().waitFor();
};
// Questions are shuffled, so answer whatever type comes up.
const adminOpen = (after) => async (p) => {
  await p.evaluate(() => sessionStorage.setItem('outsie_admin_token', JSON.stringify({ token: 'admin-token', email: 'admin@example.com',
    expires_at: new Date(Date.now() + 7200e3).toISOString() })));
  await p.goto(ORIGIN + BASE + 'admin/', { waitUntil: 'networkidle' });
  await p.getByText('Review queue').first().waitFor();
  if (after) await after(p);
  await p.waitForTimeout(300);
};
const adminTab = (name) => adminOpen(async (p) => { await p.getByRole('tab', { name: new RegExp(`^${name}`) }).click(); await p.waitForLoadState('networkidle'); });
const answerCurrent = async (page) => {
  if (await page.getByRole('radio').count()) await page.getByRole('radio').nth(1).click();
  else if (await page.getByRole('checkbox').count()) await page.getByRole('checkbox').nth(1).click();
  else await page.locator('input[inputmode=decimal]').fill('3');
};
const answerAndSubmit = async (page) => {
  await startPractice(page);
  await answerCurrent(page);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Finish', exact: true }).first().click();
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await page.getByText('Score', { exact: true }).waitFor();
  await page.waitForLoadState('networkidle');
};
// [name, signed-in?, steps]. Steps drive the real UI; only the public pages are opened by URL.
const screens = [
  ['landing', false, null],
  ['login', false, async (p) => { await p.getByRole('button', { name: 'Log in' }).click(); await p.getByText('By continuing you agree').waitFor(); }],
  ['pricing', false, async (p) => { await p.goto(ORIGIN + BASE + 'pricing/', { waitUntil: 'networkidle' }); await p.getByText('Pro pass', { exact: true }).waitFor(); }],
  ['refunds', false, async (p) => { await p.goto(ORIGIN + BASE + 'refunds/', { waitUntil: 'networkidle' }); }],
  ['magic-link', false, async (p) => { await p.goto(ORIGIN + BASE + 'signin/?h=' + 'ab'.repeat(28), { waitUntil: 'networkidle' }); await p.getByText('Finish signing in').waitFor(); }],
  ['magic-link-done', false, async (p) => {
    await p.goto(ORIGIN + BASE + 'signin/?h=' + 'ab'.repeat(28), { waitUntil: 'networkidle' });
    await p.getByRole('button', { name: 'Continue to Outstagram' }).click();
    await p.getByRole('button', { name: 'Home', exact: true }).waitFor();
    if (new URL(p.url()).search) throw new Error('link params left in the URL: ' + p.url());
  }],
  ['contact', false, async (p) => { await p.goto(ORIGIN + BASE + 'contact/', { waitUntil: 'networkidle' }); }],
  ['home', true, nav('Home')],
  ['home-light', true, async (p) => { await nav('Home')(p); await p.getByRole('switch', { name: /light mode/i }).first().click(); await p.waitForTimeout(300); }],
  ['explore', true, nav('Explore')],
  ['new-post', true, nav('New post')],
  ['profile', true, nav('Profile')],
  ['exams', true, nav('Exams')],
  ['exam-question', true, async (p) => { await startPractice(p); await answerCurrent(p); }],
  ['exam-palette', true, async (p) => { await startPractice(p); await p.getByRole('button', { name: /^\d+\/\d+$/ }).click(); await p.waitForTimeout(400); }],
  ['exam-results', true, async (p) => { await answerAndSubmit(p); await p.locator('article button[aria-expanded]').first().click(); }],
  ['exam-chat', true, async (p) => {
    await answerAndSubmit(p);
    await p.locator('article button[aria-expanded]').first().click();
    await p.getByRole('button', { name: 'Ask the AI tutor' }).click();
    await p.getByRole('button', { name: 'Why is my answer wrong?' }).click();
    await p.getByText('ignores the zero-point energy', { exact: false }).waitFor();
    await p.waitForTimeout(400);
  }],
  ['exam-chat-favourite', true, async (p) => {
    await answerAndSubmit(p);
    await p.locator('article button[aria-expanded]').first().click();
    await p.getByRole('button', { name: 'Ask the AI tutor' }).click();
    await p.getByRole('button', { name: 'Why is my answer wrong?' }).click();
    await p.getByText('ignores the zero-point energy', { exact: false }).waitFor();
    if (await p.locator('.md h3').count() < 2) throw new Error('markdown headings not rendered');
    await p.locator('.md .katex-display').first().click({ button: 'right' });
    // the equation menu: lifted equation over a blurred page
    await p.getByRole('button', { name: 'Copy LaTeX' }).waitFor();
    await p.waitForTimeout(400);
  }],
  ['exam-review-equation', true, async (p) => {
    await answerAndSubmit(p);
    await p.locator('article button[aria-expanded]').first().click();
    await p.locator('article .katex').first().click({ button: 'right' });
    await p.getByRole('button', { name: 'Copy LaTeX' }).waitFor();
    await p.waitForTimeout(300);
  }],
  ['tutor-settings', true, async (p) => {
    await answerAndSubmit(p);
    await p.locator('article button[aria-expanded]').first().click();
    await p.getByRole('button', { name: 'Ask the AI tutor' }).click();
    await p.getByRole('button', { name: /^Model$/ }).click();
    await p.getByText('Tutor settings').waitFor();
    await p.waitForTimeout(300);
  }],
  ['requests', true, async (p) => { await nav('Home')(p); await p.getByRole('button', { name: /^Follow requests/ }).click(); await p.getByText('@meera').waitFor(); await p.waitForTimeout(300); }],
  ['search', true, async (p) => { await nav('Explore')(p); await p.getByRole('searchbox', { name: 'Search people' }).fill('me'); await p.getByText('@meghna.s').waitFor(); }],
  ['edit-profile', true, async (p) => { await nav('Profile')(p); await p.getByRole('button', { name: 'Edit profile' }).click(); await p.getByLabel('Bio').waitFor(); await p.waitForTimeout(300); }],
  ['post-comments', true, async (p) => { await nav('Home')(p); await p.getByText('GATE Physics mock #4').first().click(); await p.getByText('Griffiths, then Sakurai').waitFor(); }],
  ['delete-comment', true, async (p) => {
    await nav('Home')(p); await p.getByText('GATE Physics mock #4').first().click();
    await p.getByText('Griffiths, then Sakurai').waitFor();
    if (await p.getByRole('button', { name: 'Delete comment' }).count() !== 2) throw new Error('post author should be able to delete both comments');
    await p.getByRole('button', { name: 'Delete comment' }).last().dispatchEvent('click');
    await p.getByText('Delete this comment?').waitFor(); await p.waitForTimeout(300);
  }],
  ['report-post', true, async (p) => { await nav('Explore')(p); await p.getByRole('button', { name: 'More' }).first().click(); await p.getByRole('menuitem', { name: 'Report post' }).click(); await p.getByText('Report this post').waitFor(); }],
  ['admin-signin', false, async (p) => { await p.goto(ORIGIN + BASE + 'admin/', { waitUntil: 'networkidle' }); await p.getByText('Continue with Google').waitFor(); }],
  ['admin-overview', false, adminOpen(null)],
  ['admin-queue', false, adminTab('Review queue')],
  ['admin-users', false, adminTab('Users')],
  ['admin-user', false, async (p) => { await adminTab('Users')(p); await p.getByText('@quickcash99').first().click(); await p.getByText('Why it looks suspicious').waitFor(); await p.waitForTimeout(400); }],
  ['admin-freeze', false, async (p) => { await adminTab('Users')(p); await p.getByRole('button', { name: 'Freeze' }).first().click(); await p.getByText('Notify by email').waitFor(); }],
  ['admin-posts', false, adminTab('Posts')],
  ['admin-audit', false, adminTab('Audit log')],
  ['paywall', true, async (p) => { await nav('Exams')(p); await p.getByRole('button', { name: /AI prompts left this hour/ }).click(); await p.getByText('Get Pro · ₹99').waitFor(); await p.waitForTimeout(400); }],
];

const report = { base: BASE, api: API.origin, shots: [], consoleErrors: [], pageErrors: [], unmocked: [], overflow: [] };
const browser = await chromium.launch();
for (const [vpName, vp] of Object.entries(viewports)) {
  for (const [name, signedIn, steps] of screens) {
    const ctx = await browser.newContext({ ...vp, colorScheme: 'dark' });
    await ctx.route(`${API.origin}/**`, (route) => {
      const u = new URL(route.request().url());
      const key = u.pathname.replace(API.pathname.replace(/\/$/, ''), '') + u.search;
      const hit = routes.find(([m, re]) => m === route.request().method() && re.test(key));
      if (!hit) { report.unmocked.push(`${route.request().method()} ${key}`); return route.fulfill({ status: 404, body: '{}' }); }
      const body = typeof hit[2] === 'function' ? hit[2](route.request().url()) : hit[2];
      if (body && body.__raw) return route.fulfill({ status: 200, contentType: body.type, body: body.__raw });
      return route.fulfill({ status: route.request().method() === 'POST' ? 201 : 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    if (signedIn) {
      await ctx.addCookies([{ name: 'outstagram_token', value: 'test-token', url: ORIGIN }]);
      await ctx.addInitScript((u) => localStorage.setItem('outstagram_user', JSON.stringify(u)), user);
    }
    const page = await ctx.newPage();
    page.on('console', (m) => m.type() === 'error' && report.consoleErrors.push(`${vpName}/${name}: ${m.text()}`));
    page.on('pageerror', (e) => report.pageErrors.push(`${vpName}/${name}: ${e.message}`));
    await page.goto(ORIGIN + BASE, { waitUntil: 'networkidle' });
    try {
      if (steps) await steps(page);
    } catch (e) {
      report.pageErrors.push(`${vpName}/${name}: step failed: ${e.message.split('\n')[0]}`);
    }
    await page.waitForTimeout(400);
    // Mobile-friendliness check: nothing should be wider than the viewport.
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    if (sw > vp.viewport.width) report.overflow.push(`${vpName}/${name}: scrollWidth ${sw} > ${vp.viewport.width}`);
    const file = `${vpName}-${name}.png`;
    // Viewport shot = what the user actually sees (fixed bars in place); full-page for long screens.
    await page.screenshot({ path: path.join(OUT, file) });
    await page.screenshot({ path: path.join(OUT, `${vpName}-${name}.full.png`), fullPage: true });
    report.shots.push(file);
    await ctx.close();
  }
}
await browser.close();
server.close();
report.unmocked = [...new Set(report.unmocked)];
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ shots: report.shots.length, consoleErrors: report.consoleErrors.length,
  pageErrors: report.pageErrors, overflow: report.overflow, unmocked: report.unmocked }, null, 2));
if (report.pageErrors.length) process.exitCode = 1;
