# GhostLedger Architecture

## Runtime

GhostLedger is an npm-workspaces monorepo:

- frontend is React, TypeScript, and Vite.
- backend is Express and TypeScript.
- better-sqlite3 provides the local SQLite connection.
- Zod validates request bodies, route identifiers, query parameters, settings, and import rows.

The development frontend runs at 127.0.0.1:5173 and proxies API requests to 127.0.0.1:3001. Production Express serves the built frontend and API from the same origin. Unknown API paths retain JSON 404 responses; application routes fall back to the frontend entry point.

## Backend boundaries

```text
routes -> controllers -> services -> repositories -> SQLite
```

- Routes bind endpoints, upload constraints, and small middleware such as rate limits.
- Controllers validate incoming data and shape responses.
- Services own financial and import workflows.
- Repositories own parameterized SQLite queries and writes.
- Database migrations are the authoritative schema history.

The query layer uses prepared better-sqlite3 statements. Drizzle is not used for schema management or queries. Migrations are ordered TypeScript functions recorded in schema_migrations; they run on startup and through the explicit migration command.

## Database and lifecycle

The default development database is backend/data/ghostledger.db. DATABASE_URL overrides that path; relative paths are resolved from the backend directory. WAL mode is enabled and foreign-key checks are on.

Current migrations create the initial schema, change account deletion from cascading to restricted while preserving transactions, and remove legacy secret-shaped settings. Restore accepts only a database with the current migration version and exact current table columns.

The server closes SQLite on SIGINT and SIGTERM. Tests close both the application connection and their fixture handle, then remove disposable database and journal files.

## Financial semantics

- Account balances are current snapshots entered by the user; transactions do not change them.
- Net Worth sums active account balances by currency. Negative balances represent liabilities. A scalar total is available only when active balances use one currency.
- Transaction currency comes from its account, or defaults to INR when no account is assigned. Account currency cannot be changed once it has transaction history.
- Amounts allow two decimal places and aggregate through integer cents.
- Cash-flow summaries use all time unless a date range is supplied. Burn rate uses the six previous complete calendar months.
- Categories, spending trends, merchant totals, expense ranking, and charts keep currencies separate.
- Recurring detection is a monthly-expense heuristic. Upcoming dates are forecasts, not verified bills.

## Privacy boundaries

The backend binds to loopback by default. Host and origin checks protect local mutation requests; CORS is configured for development and is not authentication. Remote mode requires ALLOW_REMOTE=true and is documented as an explicit operator choice.

Generic settings are allowlisted and do not accept API keys. Legacy secret-shaped setting keys are deleted by migration without logging values. The app does not make external font requests. CSV uploads are memory-backed, while restore files use a restricted temporary directory and are removed after use. Recovery backups are kept beside the database.

The Docker image excludes environment files, database files, backups, and development artifacts. It runs as a non-root user and serves the frontend/API together.

## Frontend data flow

TanStack Query owns API state. Mutations invalidate the ledger, analytics, recurring, largest-expense, and sidebar queries that can change. Route pages are lazy-loaded so the dashboard charts do not inflate the initial JavaScript bundle. Chat history is stored in browser localStorage and safely falls back to the default notice if stored data is invalid.

Dialogs use modal semantics, Escape handling, focus trapping, and focus restoration. The responsive sidebar narrows at mobile widths; ledger tables scroll horizontally.

## Deferred work

AI providers, more bank-specific parsers, bulk ledger actions, advanced rule conditions/actions, and user review of recurring suggestions are not implemented. See README.md for the supported formats, installation, data ownership workflow, and verification commands.
