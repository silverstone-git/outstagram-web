# QA test suite and improvement loop (plan)

Written 2026-11-26 while the user was on the server (no phone or laptop QA possible). Covers the features shipped
the same day: tutor model / thinking / BYOK, the equation menu and saved-equation jump-back, LaTeX in posts,
account export / delete, admin delete modes, admin refresh spinners, mobile follow-request badge + notifications,
follower-count refresh, and mobile caching.

## 1. What already runs automatically

| Layer | Where | What it covers |
|---|---|---|
| Backend integration | `outstagram/tests/test_*.py` in GitHub Actions (Postgres service) | Every endpoint, incl. `test_account_ai.py`: options paywall, model chain + `reasoning_effort`, bigger retrieval for paid plans, BYOK streaming + own cap + key never stored, favourite sources, export, self-delete, admin keep-content vs nuke |
| Web | `outstagram-web` CI: build + Playwright screenshots (`e2e/screens.mjs`, phone + desktop) | Equation menu in tutor and exam review, tutor settings panel, every main screen; overflow check |
| Mobile | `outstagram-mobile` CI: `flutter analyze`, `flutter test`, staging APK | `test/equations_ai_test.dart` (tutor choices, saved-equation routes, stream events) + the older suites |

## 2. Manual QA checklist (next time on a laptop + phone)

Use test accounts `cyto+<tag>@aryan.cfd` (mail lands on the local mailserver). Do staging first, then prod.

**Tutor (web + app)**
- [ ] Free account: the settings show the lock and open the paywall; a prompt still works with defaults.
- [ ] Pro account (set via admin → Plans): pick Gemini Flash + High; the reply says which model answered; quota drops by one.
- [ ] Heavy shows a lock for Pro, works for Contributor.
- [ ] BYOK with a real OpenAI, Anthropic and Gemini key: Check lists models; replies stream; the hourly AI counter does **not** move; a wrong key shows the provider's error and the prompt isn't counted.
- [ ] Paid answer cites more passages than a free one (needs agentcyto `feat/retrieve-context-size` deployed).

**Equations**
- [ ] Long-press / right-click in a tutor reply, a question, an option, an explanation and a post caption: the page blurs, the equation lifts, the menu offers Save / Copy LaTeX / Copy for Markdown.
- [ ] Inside the tutor drawer (web) the menu works and the drawer stays open.
- [ ] Saved equations → tap each kind: lands on the right reply / question / post and the equation pulses.
- [ ] Captions: `$x^2$` renders; "₹5 or $5 and $10" stays plain text; composer preview matches the feed.

**Account**
- [ ] Download my data (web + app): the JSON opens and has posts, attempts with tutor chats, favourites, follows, no password hash.
- [ ] Delete my account: wrong username keeps the button disabled; after deleting, sign-in fails and the posts are gone.
- [ ] Admin: delete with "keep posts" → posts show `deleted_user`; nuke → posts and media files gone (check the bucket).
- [ ] Admin refresh buttons spin; tables show the thin progress bar while reloading.

**Mobile social + caching**
- [ ] From a second account, request to follow: within a minute (app open) the Activity tab shows a badge and a notification appears; tapping it opens Activity.
- [ ] Approve → your follower count updates on the Profile tab without a restart; pull-to-refresh on a profile updates the counts.
- [ ] Cold start offline: feed, explore and your profile show the last posts with images; online again, they refresh.
- [ ] Scroll a long feed twice: images don't reload the second time (stable cache keys).

## 3. Improvement loop

1. **Collect**: after each deploy, read Cloud Run errors (`tool/qa/qa.sh errors` in the mobile repo), the web e2e
   `report.json` (console errors, unmocked calls, overflow) and admin-panel reports.
2. **Reproduce in CI first**: every bug found by hand gets a failing test (backend integration test, a Playwright
   step in `e2e/screens.mjs`, or a Flutter widget test) before the fix.
3. **Fix on a branch, PR, CI green, merge**: prod deploys from `main` (outsie via Cloud Build, web via Vercel, the
   app via `publish-apk`).
4. **Verify on prod** with a `cyto+<tag>` account, then tick the item off here and in `TODO.md`.
5. **Weekly**: re-run section 2 on the phone; any step that keeps needing manual checks becomes an automated one
   (candidates: a Playwright flow against staging with a real Pro test user; Flutter `integration_test` on an
   emulator in CI for the follow-request badge and the equation menu).

## 4. Gaps to automate next

- An end-to-end staging run (real outsie-staging + agentcyto) instead of mocked fixtures, nightly.
- A BYOK contract test against each provider with a cheap model (needs provider keys as CI secrets; user's call).
- Android emulator job: equation long-press → menu, Saved equations → pulse, notification permission flow.
- Lint: make web lint blocking once the `react-refresh/only-export-components` debt is cleared.
