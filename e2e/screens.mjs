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
// Screens reached by clicking the labelled bottom-nav buttons; null = login (signed out).
const screens = [['login', null], ['home', 'Home'], ['explore', 'Explore'], ['new-post', 'New post'], ['profile', 'Profile']];

const report = { base: BASE, api: API.origin, shots: [], consoleErrors: [], pageErrors: [], unmocked: [], overflow: [] };
const browser = await chromium.launch();
for (const [vpName, vp] of Object.entries(viewports)) {
  for (const [name, nav] of screens) {
    const ctx = await browser.newContext({ ...vp, colorScheme: 'dark' });
    await ctx.route(`${API.origin}/**`, (route) => {
      const u = new URL(route.request().url());
      const key = u.pathname.replace(API.pathname.replace(/\/$/, ''), '') + u.search;
      const hit = routes.find(([m, re]) => m === route.request().method() && re.test(key));
      if (!hit) { report.unmocked.push(`${route.request().method()} ${key}`); return route.fulfill({ status: 404, body: '{}' }); }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(hit[2]) });
    });
    if (nav) {
      await ctx.addCookies([{ name: 'outstagram_token', value: 'test-token', url: ORIGIN }]);
      await ctx.addInitScript((u) => localStorage.setItem('outstagram_user', JSON.stringify(u)), user);
    }
    const page = await ctx.newPage();
    page.on('console', (m) => m.type() === 'error' && report.consoleErrors.push(`${vpName}/${name}: ${m.text()}`));
    page.on('pageerror', (e) => report.pageErrors.push(`${vpName}/${name}: ${e.message}`));
    await page.goto(ORIGIN + BASE, { waitUntil: 'networkidle' });
    if (nav) { await page.getByRole('button', { name: nav, exact: true }).click(); await page.waitForLoadState('networkidle'); }
    await page.waitForTimeout(400);
    // Mobile-friendliness check: nothing should be wider than the viewport.
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    if (sw > vp.viewport.width) report.overflow.push(`${vpName}/${name}: scrollWidth ${sw} > ${vp.viewport.width}`);
    const file = `${vpName}-${name}.png`;
    await page.screenshot({ path: path.join(OUT, file), fullPage: true });
    report.shots.push(file);
    await ctx.close();
  }
}
await browser.close();
server.close();
report.unmocked = [...new Set(report.unmocked)];
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ shots: report.shots.length, consoleErrors: report.consoleErrors.length,
  pageErrors: report.pageErrors.length, overflow: report.overflow, unmocked: report.unmocked }, null, 2));
if (report.pageErrors.length) process.exitCode = 1;
