# Froutstagram

Froutstagram is a single-page social media application designed for students to share their academic achievements, study materials, and collaborate on projects. It provides a platform for students to connect with their peers, showcase their work, and build a community around learning.

## Software Stack

This project is built with a modern web development stack, ensuring a fast, scalable, and maintainable application.

-   **Frontend:** [React](https://react.dev/) with [Vite](https://vitejs.dev/)
-   **Language:** [TypeScript](https://www.typescriptlang.org/)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
-   **Package Manager:** [Bun](https://bun.sh/)

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

Make sure you have [Bun](https://bun.sh/) installed on your machine.

### Installation

1.  Clone the repo:
    ```sh
    git clone https://github.com/your_username/froutstagram.git
    ```
2.  Install dependencies:
    ```sh
    bun install
    ```

### Environment Variables

To connect to a specific backend API, create a `.env` file in the root of the project and add the following environment variable:

```
VITE_API_BASE_URL=http://your-api-url.com
```

If you do not create a `.env` file or set this variable, the application will default to `http://localhost:3000` for the API base URL.

Optional:

- `VITE_BASE`: path the build is served under (default `/`; previews use `/outstagram/`).
- `VITE_API_R2_PUBLIC_ENDPOINT`: public R2 URL for question images.

### Running the Application

-   **Development:**
    To run the app in development mode with hot-reloading, use the following command:
    ```sh
    bun run dev
    ```

-   **Production:**
    To build the application for production, run:
    ```sh
    bun run build
    ```
    This will create a `dist` folder with the optimized production build. To preview the production build locally, you can run:
    ```sh
    bun run preview
    ```

## Exams (Pariksha inside Outstagram)

The **Exams** tab (`src/features/exams/`) is the Pariksha exam engine, built into the app:

- `engine.ts`: ported from pariksha with the same scoring (sections, negative marks, `maxAttempts`). Also preset mocks (GATE, CSIR NET, TIFR, BARC) and quick practice, both sampled from the backend question bank.
- `ExamRunner.tsx`: mobile-first exam screen with a sticky timer, large tap targets, a bottom-sheet question palette, flagging and auto-submit.
- `ExamResults.tsx` + `QuestionChat.tsx`: score and topic breakdown, a filtered review, and an **AI tutor** for every question. Replies are grounded in the agentcyto textbooks with citations, and each user gets 10 prompts per hour.
- `examApi.ts`: `/exam-attempts`, `/exam-attempts/{id}/chat`, `/ai/quota`, `/pariksha`.
- `Latex.tsx`: KaTeX rendering, copied from pariksha.

## CI, screenshots and previews

Nothing needs to be built locally (the dev server has very little RAM). Every push runs `.github/workflows/ci.yml`:

1. `bun install`, lint (advisory for now), type-check and build with `VITE_BASE=/outstagram/` and `VITE_API_BASE_URL` = repo variable `PREVIEW_API_BASE_URL` (currently `outsie-staging`).
2. `e2e/screens.mjs` serves `dist`, fakes the API with `e2e/fixtures.mjs`, drives real flows (feed, profile, exams, a practice exam, results, the AI tutor) and saves phone (390×844) and desktop screenshots. Each screen gets a viewport shot and a full-page shot. `report.json` lists console/page errors, API calls with no fixture, and horizontal overflow. Page errors fail the job.
3. `dist` and `screenshots` are uploaded as artifacts.

```sh
scripts/preview.sh shots   # download screenshots + report of this branch's latest run
scripts/preview.sh deploy  # publish that run's dist to https://aryan.cfd/outstagram/
```

When you add a screen or an API call, add a flow to `e2e/screens.mjs` and a fixture to `e2e/fixtures.mjs`.

See `TODO.md` for the roadmap.

## For Future Contributors

We welcome contributions to Froutstagram! To ensure a smooth development process, please adhere to the following guidelines:

-   **Code Style:** Follow the existing code style and conventions. We use ESLint to enforce a consistent style, so make sure to run the linter before submitting any changes.
-   **Branching:** Create a new branch for each feature or bug fix. Use a descriptive branch name (e.g., `feature/add-comments` or `fix/login-bug`).
-   **Pull Requests:** Open a pull request with a clear description of the changes you've made. Make sure to reference any related issues.

---

*This entire project was vibe coded using the Gemini CLI.*

## AI tutor, plans and theme (2026-11-23)

- **Tutor** (`src/features/exams/QuestionChat.tsx`): streams replies from `POST /exam-attempts/{id}/chat/stream`, renders them with `TutorMarkdown` (react-markdown + remark-gfm + remark-math + rehype-katex). Skill chips pick which knowledge-bank subjects (agentcyto skills) to search. Long-press (touch) or right-click an equation to save it; saved equations and tutor history live on the Exams tab (`TutorLibrary.tsx`).
- **Paywall** (`src/features/billing/`): `openPaywall()` / `paywallFrom(response)` open one upgrade sheet (mounted in `App.tsx`) on the prompt counter, `429 ai_quota`, `402 tutor_*` and `413 media_too_large`. Pay runs Razorpay Checkout (`checkout.razorpay.com/v1/checkout.js`) and verifies server-side.
- **Uploads**: photos are compressed in the browser (`src/lib/compress.ts`) before the plan's per-file limit is checked.
- **Theme**: `src/lib/theme.tsx` toggles `.dark` on `<html>` (dark is the default; light palette in `:root`), remembered in `localStorage` and applied before first paint by a script in `index.html`.
- **Numbers**: Dashboard and Profile read `GET /me/stats` and `GET /trending`; nothing is hard-coded.

## Social (2026-11-25)

- **Follow requests** (`src/components/Requests.tsx`): bell with a count in the Home header; Approve or Decline (`POST /request-approve|request-reject/{id}`). The count refreshes when the tab regains focus (no push on the web).
- **Edit profile** (`src/components/EditProfile.tsx`): name (1–60) and bio (≤ 160) via `PUT /me`; the new values are stored in `localStorage` so the header updates without signing in again.
- **Delete comments** (`src/components/PostView.tsx`): the comment's author and the post's author see a trash button (`DELETE /posts/{id}/comments/{comment_id}`). Comments show the author's username, linked to their profile.
- **People search** (`src/components/UserSearch.tsx`): top of Explore, `GET /users/search` with a 250 ms debounce; Escape clears.
- Profiles, follow/unfollow and follower lists: `src/components/UserProfile.tsx`.

## Public pages

Signed-out visitors see a landing page (`src/features/public/`). `/pricing`, `/terms`, `/privacy`, `/refunds` and `/contact` are real URLs on any static host: the build copies `index.html` into each folder and the app renders the page from the pathname. Prices come from outsie's public `GET /billing/plans`; contact details live in `src/features/public/routes.ts`.
