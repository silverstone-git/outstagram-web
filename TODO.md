# Roadmap: Outstagram + Pariksha + agentcyto

Covers outstagram-web, the outstagram backend (`outsie`), pariksha and the agentcyto integration.
Last updated: 2026-11-23.

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

## Next

- [ ] Production rollout: add `LITELLM_MASTER_KEY` (Secret Manager) to `outsie`, allow the live web origin in CORS, merge `feat/ai-exams` to `main`, merge the web branches
- [x] Staging Razorpay: run `outstagram/scripts/setup-razorpay-staging.sh` (secrets + deploy), add the webhook in the Razorpay test dashboard, deploy the web preview, test with UPI `success@razorpay`
- [x] agentcyto box: deploy `feat/kb-skills` (`docker compose up -d bff` with the new `../repo` mount) and add the nginx `location = /agentcyto/api/kb/skills` exemption (docs/knowledge-base.md §9.0)
- [ ] Add subject content: `repo/history/`, `repo/geography/`, `repo/chemistry/` Markdown → ingest; question-bank groups for non-physics subjects so Quick practice offers them
- [ ] Production Razorpay: live keys (after KYC) in Secret Manager for `outsie`, webhook to `https://outsie.aryan.cfd/billing/razorpay/webhook`
- [ ] Make lint blocking in CI once the existing lint debt is fixed

## Later

- [ ] **Sign in with GitHub** (OAuth): backend callback that issues the usual outsie JWT; link to an existing account by verified email
- [ ] **Sign in with Google** (OAuth / Google Identity Services): same flow as GitHub
- [ ] outstagram-app (Android): build in CI (APK artifacts), reuse the exam engine and the AI tutor API
- [ ] Custom exam builder in the Exams tab (pariksha's advanced preset editor)
- [ ] Per-user rate limiting on other expensive endpoints (media upload)
- [ ] Video compression (currently only images are compressed; free videos must already be ≤ 200 kB)
- [ ] Razorpay Subscriptions (auto-renewing Pro) instead of a 30-day pass; refunds/cancellation handling
- [ ] "Liked" and "Saved" tabs on Profile are still empty placeholders
- [ ] `POST /pariksha` is unauthenticated (the standalone pariksha site has no login); revisit once pariksha users can sign in
- [x] Stop tracking `__pycache__/*.pyc` in the outstagram repo
