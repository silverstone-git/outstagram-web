# Roadmap: Outstagram + Pariksha + agentcyto

Covers outstagram-web, the outstagram backend (`outsie`), pariksha and the agentcyto integration.
Last updated: 2026-11-26.

## Done (on feature branches, not yet in production)

- [x] agentcyto `POST /api/retrieve`: stateless, LLM-planned KB retrieval for server-to-server use (`feat/retrieve-api`)
- [x] Backend: exam attempts, per-question AI tutor, 10 prompts/hour cap, KB-grounded admin generation, owner-only post deletion, CI integration test (`outstagram` `feat/ai-exams`)
- [x] Staging: Cloud Run `outsie-staging` with its own `outsie_staging` database, question bank copied from production
- [x] Web: CI build + Playwright phone/desktop screenshots + preview at https://aryan.cfd/outstagram/ (`feat/ci-pipeline`)
- [x] Web: native Exams tab with runner, results review, AI tutor drawer, share to feed (`feat/exams-tab`)
- [x] Tutor answers render Markdown + KaTeX; replies stream (SSE); tutor uses lexical retrieval for speed (`outstagram feat/skills-billing`, `outstagram-web feat/tutor-billing-theme`)
- [x] Tutor history per user: list, reopen, delete; free limit 10 chats / 100 kB
- [x] Long-press an equation to favourite it; "Saved equations" on the Exams tab
- [x] Light/dark mode toggle (remembered per device)
- [x] Dashboard/Profile: no placeholder numbers (`/me/stats`, `/trending`); fake data only via the staging-only `/admin/demo-data`
- [x] Mobile polish: dashboard stat cards and action buttons no longer overflow; tutor drawer header no longer overlaps the chat
- [x] Feed/Dashboard category mismatch (`"Exam Result"` vs `exam_result`) fixed with `categoryKey()`
- [x] Razorpay Pro pass (test mode): paywall on the prompt counter, AI limit, tutor history limit and oversized media; orders, signature verify, webhook
- [x] Media compression: browser (canvas → WebP/JPEG) and server (Pillow → WebP) before the 200 kB free limit applies
- [x] agentcyto KB skills: one folder per subject under `repo/` (physics, history, geography, …); admin Skills panel; chats and `/api/retrieve` can attach a whole skill; outstagram tutor shows skill chips (`agentcyto feat/kb-skills`)
- [x] Pariksha admin: "Cloud" generation via `POST /api/question_bank/generate` with skill + audience (`pariksha feat/cloud-generate`)
- [x] CI build/type-check for pariksha and agentcyto's frontend
- [x] Admin over the internet: Pariksha `/?admin` with Google sign-in, allow-listed on outsie (`OUTSIE_ADMIN_EMAILS`, 2h admin token); no default admin secret; review/delete questions, upload JSON, new groups (`outstagram feat/admin-google`, `pariksha feat/cloud-admin`)
- [x] KB admin in agentcyto behind outsie Google sign-in (X-Admin-Token checked via `/admin/whoami`); Markdown upload/delete into `repo/<skill>/`; the hard-coded admin password is gone (`agentcyto feat/kb-admin-gate`)
- [x] Pariksha admin: edit/add questions, download bank JSON, exam types (server presets), publish exams, community exam moderation (`outstagram feat/admin-google`, `pariksha feat/cloud-admin`)
- [x] Landing page for signed-out visitors + `/pricing` (live from `GET /billing/plans`), `/terms`, `/privacy`, `/refunds`, `/contact` (`outstagram-web feat/landing-legal`)

## Next
- [x] **Admin panel** at `/admin/` (web) + `/admin/*` API (outsie): review queue (rules + Gemini + optional Cloud Vision + user reports), users with risk scores, freeze/unfreeze with email, post/comment removal (bulk), plans, audit log; Report post menu; PUT /posts made author-only (`feat/admin-panel` in both repos)
- [ ] Admin panel rollout: SMTP for notices (`outstagram/scripts/setup-admin-mail.sh outsie <env file>`, same SMTP as Supabase), re-run `scripts/supabase-lockdown.sql` (tables `moderationflag`, `moderationscan`, `adminaction`), add `https://outstagram.aryan.cfd/admin/` to Supabase redirect URLs (optional: the root fallback works), optionally `--vision` for Cloud Vision SafeSearch
- [ ] Mobile: ⋮ → Report on posts/comments/profiles (`POST /posts|comments/{id}/report`, `/users/{name}/report`) and handle `403 account_frozen` (sign out, show the message)
- [ ] Admin panel later: report button on comments and profiles in the web app, appeal inbox (replies to notices go to OUTSIE_MAIL_REPLY_TO today), IP/device signals for ban evasion, broadcast email


- [ ] Admin rollout: set `OUTSIE_ADMIN_EMAILS` on `outsie` (+ staging), add `https://pariksha.aryan.cfd/**` to Supabase Auth redirect URLs and the pariksha origin to `OUTSTAGRAM_ALLOWED_ORIGINS`, rotate `PARIKSHA_ADMIN_SECRET` to 32+ chars (or unset it)
- [ ] agentcyto box: deploy `feat/kb-admin-gate` (`docker compose up -d bff`), make `repo/` writable by the container's APP_UID, add `https://t.aryan.cfd/agentcyto/**` to Supabase redirect URLs
- [ ] outsie: after deploying, re-run `scripts/supabase-lockdown.sql` (new `exampreset` table)
- [x] Policies: legal name (Aryan Sidhwani, sole proprietor) on Terms, Contact and footer
- [ ] Policies: registered address — deliberately left off until the company is registered (Razorpay KYC may push back); have the Terms/Privacy/Refunds text reviewed

- [ ] Production rollout: add `LITELLM_MASTER_KEY` (Secret Manager) to `outsie`, allow the live web origin in CORS, merge `feat/ai-exams` to `main`, merge the web branches
- [x] Staging Razorpay: run `outstagram/scripts/setup-razorpay-staging.sh` (secrets + deploy), add the webhook in the Razorpay test dashboard, deploy the web preview, test with UPI `success@razorpay`
- [x] agentcyto box: deploy `feat/kb-skills` (`docker compose up -d bff` with the new `../repo` mount) and add the nginx `location = /agentcyto/api/kb/skills` exemption (docs/knowledge-base.md §9.0)
- [ ] Add subject content: `repo/history/`, `repo/geography/`, `repo/chemistry/` Markdown → ingest; question-bank groups for non-physics subjects so Quick practice offers them
- [ ] Production Razorpay: live keys (after KYC) in Secret Manager for `outsie`, webhook to `https://outsie.aryan.cfd/billing/razorpay/webhook`
- [ ] Make lint blocking in CI once the existing lint debt is fixed

## Later

- [x] DB moved from Neon (Frankfurt) to Supabase (Tokyo, prod `outsie` + staging `outsie-staging`), 2026-11-23. Delete the Neon project after ~1 week once nothing regresses
- [ ] **Sign in with GitHub**: enable the provider in both Supabase projects, add `github` to `OUTSTAGRAM_SOCIAL_PROVIDERS` on Cloud Run (code already handles it)
- [x] **Sign in with Google** via Supabase Auth (PKCE; backend `/auth/supabase` links by verified email), live on prod + staging 2026-11-23. Google OAuth app is in test mode: publish it in Google Cloud console before opening to everyone
- [ ] outstagram-app (Android): build in CI (APK artifacts), reuse the exam engine and the AI tutor API
- [ ] Custom exam builder in the Exams tab (pariksha's advanced preset editor)
- [ ] Per-user rate limiting on other expensive endpoints (media upload)
- [ ] Video compression (currently only images are compressed; free videos must already be ≤ 200 kB)
- [ ] Razorpay Subscriptions (auto-renewing Pro) instead of a 30-day pass; refunds/cancellation handling
- [ ] "Liked" and "Saved" tabs on Profile are still empty placeholders
- [ ] `POST /pariksha` is unauthenticated (the standalone pariksha site has no login); revisit once pariksha users can sign in
- [x] Stop tracking `__pycache__/*.pyc` in the outstagram repo
