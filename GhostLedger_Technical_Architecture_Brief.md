# GhostLedger Technical Architecture Brief

Updated: 2026-11-08

## Purpose

This brief describes the implementation in this repository and separates it from the longer-term product roadmap. The README contains setup instructions; `docs/architecture.md` describes runtime boundaries; `docs/project-audit.md` records the repair evidence and release gaps.

## Product summary

GhostLedger is a local-first personal finance ledger for one user on a local machine. A React and TypeScript frontend communicates with an Express API. SQLite stores accounts, categories, transactions, import history, rules, and settings. No sign-in, telemetry service, cloud account, or AI provider is required for ledger use.

The application supports manual transaction entry and editing, account/category setup, CSV review and import, persisted categorization rules, analytics, optional AI analysis through OpenAI, Anthropic, Groq, or local Ollama, database backup/restore, CSV export, and confirmed purge. AI is disabled by default; cloud analysis requires provider-specific consent and a successful connection test. Other bank formats, bulk actions, expanded rule actions, and recurring-payment confirmation are future scope.

## Runtime architecture

```text
React + TypeScript + Vite
          │ same-origin API in production; proxy in development
          ▼
Express routes → controllers → services → repositories → SQLite
```

- Routes register endpoints, upload limits, and middleware.
- Controllers validate request boundaries and shape responses.
- Services own financial and import workflows.
- Repositories own prepared SQLite queries and writes.
- Ordered TypeScript migrations are the schema authority and are recorded in `schema_migrations`.
- The database layer uses `better-sqlite3` with parameterized SQL. Drizzle is not used.
- AI transport, read-only financial context construction, request validation, and configuration persistence are separated into adapters, services, controllers/routes, and repositories.

The development UI defaults to `127.0.0.1:5173`; the API defaults to `127.0.0.1:3001`. Production Express serves the built frontend and API together. Known application routes support direct navigation; unknown API paths return JSON errors.

## Data and financial semantics

- Account balances are user-maintained current snapshots. Transactions do not change account balances.
- Net Worth sums active account snapshots by currency. Negative balances represent liabilities. The scalar value is unavailable when accounts span currencies.
- A transaction uses its account currency, or INR when it has no account. Account currency cannot change after transactions are linked.
- Amounts accept two decimal places. Aggregates convert values to integer cents and keep currencies separate.
- Income, expenses, and net savings cover all transactions unless a date range is supplied. Monthly burn uses expenses from the six most recent completed calendar months.
- Recurring detection is a heuristic based on repeated monthly expenses. Upcoming dates are estimates, not confirmed bills.

## CSV import scope

Built-in formats are HDFC, Chase, and a generic layout. HDFC dates use day/month/year; Chase dates use month/day/year; ambiguous generic slash dates are rejected, and ISO dates are recommended. Synthetic examples are in `docs/examples`. Other bank adapters are not verified or claimed.

A preview validates dates, amounts, required fields, and account/category references while retaining source row numbers. Duplicate rows receive explicit keep/skip choices. Confirmation and undo use database transactions, and processed batches cannot be confirmed again.

## Privacy and ownership

The API binds to loopback by default. Remote mode is an explicit operator choice and does not add authentication. CORS is not authentication. Generic settings are allowlisted; API keys are not accepted into the finance database. Legacy secret-shaped settings are removed without logging their values. Fonts are bundled locally.

Cloud provider keys can be entered in Settings and are stored in a separate backend credential file with current-user-only permissions/ACLs; matching backend environment variables remain a fallback. The credential API returns presence and source only. Keys are excluded from SQLite, backups, logs, and browser storage. Cloud origins are fixed, Ollama is restricted to approved local HTTP hosts, and redirects are rejected. Connection tests send only a harmless prompt. Cloud chat sends the question, up to six recent messages, and a bounded context with aggregate data and at most ten compact transaction references. Notes, database files, and credentials are excluded. Context is capped at 16,000 characters and responses at 12,000. Chat history remains in browser localStorage, bounded to 100 messages.

SQLite backups use the database backup API to include committed WAL data. Restore validates integrity and schema compatibility and creates a recovery snapshot before replacement. CSV export uses stable columns and protects formula-like text. Purge requires explicit confirmation and creates a recovery snapshot first.

## Local verification and limits

On 2026-11-08, `npm run format:check`, `npm run build`, `npm run lint`, `npm test` (76 tests across 13 files), `npm run test:e2e` (two isolated browser workflows), and `npm audit --json` passed; the audit reported zero vulnerabilities across 563 dependency records. Both Compose files parsed. A production-mode `npm start` smoke served `/ledger`, `/api/health`, and `/api/assistant/status`; an unknown API route returned 404. The assistant browser flow uses a loopback fake provider and synthetic finance data; all four provider adapters have mocked contract tests. No provider has been live-verified. The previous clean install and release checks ran on Node 22.12.0, below the repository minimum of Node 22.13.0 in the 22.x line. Repeat release checks on a supported Node version.

Docker Engine is unavailable here, so image build, live health checks, and persistence across restart/rebuild have not been verified. Manual browser review and screenshot capture were explicitly deferred. Hosted CI has not been run. The tracked Word version of this brief remains unchanged pending its deferred update and render review.

## Roadmap

Live-provider verification remains open for OpenAI, Anthropic, Groq, and Ollama; only mocked adapter contracts and the fake-provider browser flow are verified. Supported-Node, Docker runtime/persistence, hosted CI, manual visual review, and Word-brief rendering remain release checks. More bank-specific parsers, bulk ledger actions, richer rule conditions and actions, and user confirmation of recurring suggestions remain roadmap work. See `README.md` for current setup and provider details.
