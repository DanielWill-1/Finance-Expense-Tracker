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
- Assistant provider transport, ledger context construction, request validation, and settings persistence are separated into provider adapters, context/service layers, route/controller validation, and repositories.

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

OpenAI, Anthropic, and Groq credentials can be entered in Settings and are stored in a separate backend JSON file outside SQLite and finance backups. POSIX directories/files use `0700`/`0600`; Windows ACLs grant access to the current user. Docker mounts a separate `ghostledger-secrets` volume. A Settings key takes priority over its matching backend environment variable; removing it restores that fallback. The credential API returns only configured state and source, never the key. Ollama has no credential. Cloud destinations are fixed to their provider origins. The Ollama endpoint is restricted to HTTP on local/Docker-host names. Redirects are rejected. Legacy `theme`, `currency`, and `language` setting rows are not active application preferences or returned by the settings API; ordinary settings updates preserve those rows.

The Docker image excludes environment files, database files, backups, and development artifacts. It runs as a non-root user and serves the frontend/API together.

## Frontend data flow

TanStack Query owns API state. Mutations invalidate the ledger, analytics, recurring, largest-expense, and sidebar queries that can change. Route pages are lazy-loaded so the dashboard charts do not inflate the initial JavaScript bundle. Chat history is stored in browser localStorage, bounded to 100 messages, and safely recovered if stored data is invalid. The assistant UI streams text from the backend, supports cancellation/retry, and distinguishes pending, partial, failed, cancelled, and completed responses.

## Assistant data flow

`/api/assistant` validates credential status/write/delete, harmless connection tests, and chat requests. Credential values stay inside the backend store and provider adapter. The assistant service requires AI to be enabled, a selected model, configured credentials where applicable, explicit consent for cloud providers, and a successful connection test within the prior 15 minutes. Connection tests contain no ledger context. Chat uses the existing repositories and analytics/recurring services to compute a bounded, read-only context before calling the selected adapter. The provider cannot run SQL or mutate application state.

Chat context is capped at 16,000 serialized characters and includes aggregates plus at most ten compact transaction references. The `meta` event also returns bounded application totals, category totals, and references for an expandable evidence panel; that evidence stays in the browser's bounded local history. Notes and database files are excluded. Questions are limited to 1,000 characters, supplied history to six messages of up to 800 characters each, and provider output to 12,000 characters. Chat calls time out after 60 seconds; tests time out after 20 seconds. Stream events are `meta`, `delta`, `done`, and `error`. Cancelling or disconnecting aborts the upstream request. Cloud requests send the question, bounded recent chat, and selected ledger context to the displayed fixed provider destination; provider-specific consent can be withdrawn. Ollama runs on the restricted local endpoint and needs no cloud consent.

Dialogs use modal semantics, Escape handling, focus trapping, and focus restoration. The responsive sidebar narrows at mobile widths; ledger tables scroll horizontally.

## Deferred work

Live model behavior has not been verified for any provider. OpenAI, Anthropic, Groq, and Ollama have mocked adapter contract tests; the frontend/backend path has a deterministic fake-provider browser test. These verify application wiring, not live provider service or model quality. Supported-Node verification, actual Docker image startup/persistence, hosted CI, manual visual review/screenshot, and updating/rendering the Word architecture brief remain open release checks. More bank-specific parsers, bulk ledger actions, advanced rule conditions/actions, and user review of recurring suggestions remain roadmap items. See README.md for setup and provider details.
