# Roadmap: Outstagram + Pariksha + agentcyto

Covers outstagram-web, the outstagram backend (`outsie`), pariksha and the agentcyto integration.
Last updated: 2026-11-22.

## Done (on feature branches, not yet in production)

- [x] agentcyto `POST /api/retrieve`: stateless, LLM-planned KB retrieval for server-to-server use (`feat/retrieve-api`)
- [x] Backend: exam attempts, per-question AI tutor, 10 prompts/hour cap, KB-grounded admin generation, owner-only post deletion, CI integration test (`outstagram` `feat/ai-exams`)
- [x] Staging: Cloud Run `outsie-staging` with its own `outsie_staging` database, question bank copied from production
- [x] Web: CI build + Playwright phone/desktop screenshots + preview at https://aryan.cfd/outstagram/ (`feat/ci-pipeline`)
- [x] Web: native Exams tab with runner, results review, AI tutor drawer, share to feed (`feat/exams-tab`)

## Next

- [ ] Production rollout: add `LITELLM_MASTER_KEY` (Secret Manager) to `outsie`, allow the live web origin in CORS, merge `feat/ai-exams` to `main`, merge the web branches
- [ ] AI tutor speed (~23 s per reply): stream replies (SSE), and/or use lexical retrieval for chat (`AI_RETRIEVAL_LLM=0`) and keep LLM-planned retrieval for generation
- [ ] Pariksha admin panel: call `POST /api/question_bank/generate` instead of the Vite dev-server middleware + ChromaDB CLI
- [ ] Mobile polish of existing screens: cramped dashboard stat cards, "Post Achievement" overflowing its button
- [ ] Feed/Dashboard compare `post_category === 'exam_result'`, but the API returns `"Exam Result"`, so exam-result icons and colours never show
- [ ] Make lint blocking in CI once the existing lint debt is fixed

## Later

- [ ] **Sign in with GitHub** (OAuth): backend callback that issues the usual outsie JWT; link to an existing account by verified email
- [ ] **Sign in with Google** (OAuth / Google Identity Services): same flow as GitHub
- [ ] outstagram-app (Android): build in CI (APK artifacts), reuse the exam engine and the AI tutor API
- [ ] Custom exam builder in the Exams tab (pariksha's advanced preset editor)
- [ ] Per-user rate limiting on other expensive endpoints (media upload)
- [ ] `POST /pariksha` is unauthenticated (the standalone pariksha site has no login); revisit once pariksha users can sign in
- [ ] Stop tracking `__pycache__/*.pyc` in the outstagram repo
