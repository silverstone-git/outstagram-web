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

## For Future Contributors

We welcome contributions to Froutstagram! To ensure a smooth development process, please adhere to the following guidelines:

-   **Code Style:** Follow the existing code style and conventions. We use ESLint to enforce a consistent style, so make sure to run the linter before submitting any changes.
-   **Branching:** Create a new branch for each feature or bug fix. Use a descriptive branch name (e.g., `feature/add-comments` or `fix/login-bug`).
-   **Pull Requests:** Open a pull request with a clear description of the changes you've made. Make sure to reference any related issues.

---

*This entire project was vibe coded using the Gemini CLI.*