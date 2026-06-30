# GhostLedger Architecture

## Overview

GhostLedger is a local-first personal finance application built as a monorepo with a Vite + React frontend and an Express + TypeScript backend. SQLite serves as the database with Drizzle ORM for type-safe schema management and migrations.

## Repository Structure

```
ghostledger/
├── frontend/          # React + Vite + TypeScript + TailwindCSS
│   ├── src/
│   │   ├── pages/     # Route-level page components
│   │   ├── components/ # Reusable UI components
│   │   ├── hooks/     # Custom React hooks
│   │   ├── services/  # API client wrappers
│   │   ├── types/     # Shared TypeScript interfaces
│   │   └── utils/     # Utility functions
├── backend/           # Express + TypeScript API
│   ├── src/
│   │   ├── routes/    # Thin route declarations
│   │   ├── controllers/ # Request handling and response formatting
│   │   ├── services/  # Business logic layer
│   │   ├── repositories/ # Database access (Drizzle ORM)
│   │   ├── database/  # Schemas, migrations, seeds
│   │   ├── middleware/ # Validation, error handling, security
│   │   ├── config/    # Environment and application configuration
│   │   └── types/     # Shared backend types
├── docs/              # Architecture documentation
├── docker/            # Dockerfile and compose configuration
└── .github/           # CI workflows
```

## Backend Architecture

The backend follows a layered architecture pattern:

```
routes → controllers → services → repositories → database
```

### Layers

- **Routes**: Map HTTP methods and paths to controllers. Thin and declarative.
- **Controllers**: Parse requests, set status codes, orchestrate services.
- **Services**: Business logic — categorization, duplicate checks, import workflows.
- **Repositories**: Focused database access — hide SQL/ORM from services.
- **Database**: Drizzle schemas, migrations, indexes, constraints.
- **Middleware**: Validation, error handling, rate limiting, security headers.

### API Response Format

All endpoints return a consistent shape:

Success:
```json
{ "success": true, "data": { ... } }
```

Error:
```json
{ "success": false, "error": "description" }
```

## Frontend Architecture

- **Route-level pages** in `pages/` directory
- **Reusable components** in `components/` directory
- **Custom hooks** for shared state and data fetching logic
- **API services** for typed HTTP client wrappers
- **Shared types** mirroring backend response shapes

### Key Libraries

- **React Router** for client-side routing
- **React Query (TanStack Query)** for server state management and caching
- **Axios** for HTTP requests with interceptors for error handling
- **TailwindCSS** for utility-first styling with a custom dark theme

## Database

SQLite with Drizzle ORM provides:

- Type-safe schema definitions
- Automated migration generation
- Direct filesystem persistence — no server process
- WAL journal mode for concurrent reads

## Design System

- **Dark theme** — minimal, dense, professional aesthetic
- **Color tokens** defined in Tailwind config for consistency
- **Persistent left sidebar** with route navigation
- **Status bar** showing API and database health

## Security

- Helmet for HTTP security headers
- CORS configured for specific origins
- Zod validation on all input boundaries
- Parameterized queries via Drizzle ORM
- CSP headers
- No API keys in source or database

## Development

- `npm run dev` from root starts both frontend and backend concurrently
- Vite dev server proxies `/api` requests to the Express backend
- Backend uses `tsx` for watch-mode TypeScript execution
