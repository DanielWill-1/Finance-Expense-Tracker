We are beginning Phase 1 of GhostLedger.

Do not implement any finance functionality yet.

Your goal is to build a production-quality project foundation.

Project Overview

GhostLedger is a local-first personal finance application built as a Vite + React + TypeScript frontend and an Express + TypeScript backend using SQLite and Drizzle ORM.

The codebase must be structured like a real startup project.

Requirements

Frontend

- React
- Vite
- TypeScript
- TailwindCSS
- React Router
- Axios
- React Query
- Dark theme
- Responsive layout
- Sidebar navigation

Backend

- Express
- TypeScript
- Drizzle ORM
- SQLite
- Zod
- Helmet
- CORS
- Morgan
- dotenv

Project Structure

ghostledger/

frontend/

backend/

docs/

docker/

README.md

Tasks

1. Initialize the entire monorepo.

2. Configure TypeScript for frontend and backend.

3. Configure TailwindCSS.

4. Configure React Router.

5. Configure Express.

6. Configure Drizzle ORM.

7. Configure SQLite.

8. Create environment configuration.

9. Configure ESLint.

10. Configure Prettier.

11. Configure Docker.

12. Configure Docker Compose.

13. Create a shared API response structure.

14. Create reusable frontend layout.

15. Create empty pages:

Dashboard

Ledger

AI Assistant

Settings

16. Create sidebar navigation.

17. Implement backend health endpoint

GET /api/health

18. Connect frontend to backend and display backend health status.

19. Ensure everything compiles.

20. Ensure npm run dev starts the entire application.

Rules

Do not generate placeholder code.

Do not generate TODO comments.

Do not skip files.

Generate every file completely.

After finishing Phase 1 provide:

- complete directory tree
- explanation of architecture
- instructions to run locally

Stop after Phase 1.
Do not begin implementing finance features.