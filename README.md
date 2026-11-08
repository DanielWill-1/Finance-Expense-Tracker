# GhostLedger

GhostLedger is a local-first personal finance ledger. The React application talks to an Express API backed by SQLite. No sign-in, cloud account, telemetry service, or AI provider is required for the ledger.

The default network binding is loopback. Your database and recovery backups are local files. Keep an independent backup if the data matters; a single-machine local database is not a substitute for an off-device backup.

## Delivered

- Manual income and expense entry, editing, deletion, account assignment, and category assignment.
- Account and category setup from Settings.
- CSV preview, validation, rule-based category suggestions, duplicate review, transactional confirmation, history, and undo.
- Dashboard cash flow, category totals, recent transactions, largest expenses, six-month burn rate, and recurring payment estimates.
- Persisted categorization rules and settings.
- SQLite backup, validated restore with a recovery copy, signed-amount CSV export, and confirmed data purge.
- Optional AI analysis through OpenAI, Anthropic, Groq, or a local Ollama server. The feature is disabled by default and requires a successful connection test before chat.
- Account snapshot/name/type editing, category renaming that preserves links, and ledger sort, account, and date-range filters.

## Limits and roadmap

- Built-in statement formats are HDFC, Chase, and a generic CSV layout. Other bank adapters are future work.
- Generic slash dates that could mean either month/day or day/month are rejected for review. ISO dates are recommended.
- Recurring payments are estimates. Detection looks for at least three expense entries in three different months, monthly gaps of 26–35 days, and amounts within 5% of the group average. Upcoming dates are projected one month from the last entry and shown only when they fall within 45 days.
- AI provider adapters and end-to-end wiring are covered by synthetic contract and browser tests. No provider has been live-verified in this environment; live model behavior, rate limits, and service availability remain provider-dependent.
- Bulk ledger actions, richer rule conditions/actions, and user confirmation of recurring patterns are not implemented.
- Account balances are user-maintained snapshots. Adding or editing a transaction does not change an account balance.

## Financial model

- A transaction uses the currency of its assigned account. An unassigned transaction uses INR.
- An account's currency cannot be changed after it has transactions, because doing so would relabel its history.
- Net Worth is the sum of active account balance snapshots grouped by currency. Negative balances represent liabilities. Transactions are not added to those balances. The single-value Net Worth field is null when active accounts use multiple currencies; the UI shows the separate currency values.
- Income, expenses, and net savings cover all ledger transactions unless a date range is supplied to the API. Values are kept separate by currency.
- Savings rate is net savings divided by income for the same period; it is zero when income is zero.
- Monthly burn is expense total for the six most recent completed calendar months divided by six.
- Category percentages are calculated within each currency. Monthly trend values are actual totals. A percent change is null when the first month has no baseline and the final month has spending.
- Amounts are rounded to two decimal places. SQLite aggregate queries sum integer cents.

## Requirements

- Node.js 20.19.x or 22.13.x and later patch releases within those major versions.
- npm 10 or newer.
- A C++ build toolchain and Python 3 may be needed if npm cannot use a prebuilt better-sqlite3 binary. On Windows, install the Microsoft C++ Build Tools; on Linux, install make and g++.
- Docker Engine and the Docker Compose plugin for the container workflow.

The project uses npm workspaces and one root package lock. Do not run npm install separately inside backend or frontend.

## Install and run

```powershell
Copy-Item .env.example .env
npm ci
npm run dev
```

Open the Vite app at http://127.0.0.1:5173. The API listens at http://127.0.0.1:3001. A new database is empty; create an account and categories from Settings, or add optional synthetic demo records with npm run db:seed.

Root commands:

| Command              | Purpose                                                   |
| -------------------- | --------------------------------------------------------- |
| npm run dev          | Run the frontend and backend in development               |
| npm run build        | Build the frontend and backend                            |
| npm start            | Start the built backend and serve the production frontend |
| npm test             | Run backend tests against disposable SQLite databases     |
| npm run lint         | Run frontend and backend ESLint                           |
| npm run format:check | Check formatting with Prettier                            |
| npm run db:migrate   | Apply pending schema migrations                           |
| npm run db:seed      | Add optional sample data                                  |
| npm run test:e2e     | Run the browser workflows                                 |

For production serving outside Docker, run npm run build, then start with NODE_ENV=production. The API remains loopback-only by default.

## Configuration and storage

The backend loads the project-root .env file in both source and compiled execution. Process environment variables take precedence for application configuration. For AI keys specifically, a key saved in Settings takes priority over its matching environment variable. The example file contains no credentials.

- HOST defaults to 127.0.0.1.
- PORT defaults to 3001.
- ALLOW_REMOTE defaults to false.
- DATABASE_URL defaults to ./data/ghostledger.db relative to the backend directory. The database uses WAL mode.
- Docker Compose publishes 127.0.0.1:3001 and stores the database in the ghostledger-data named volume.
- Docker Compose stores Settings-entered AI keys in a separate `ghostledger-secrets` named volume.
- Docker Compose also accepts BIND_ADDRESS and HOST_PORT. Keep BIND_ADDRESS at 127.0.0.1 for local use.
- Outside Docker, AI keys are kept outside the project: `%LOCALAPPDATA%\GhostLedger` on Windows, `~/Library/Application Support/GhostLedger` on macOS, or `$XDG_CONFIG_HOME/ghostledger` (default `~/.config/ghostledger`) on Linux. The directory and file use current-user-only permissions/ACLs.

To intentionally expose the application on a network, set ALLOW_REMOTE=true and configure BIND_ADDRESS to a reachable interface. This removes the local-only host check; it does not add user authentication. Use this only on a network you control.

SQLite schema changes run as ordered migrations during startup. Migration history is stored in schema_migrations. The repository uses parameterized better-sqlite3 queries; Drizzle is not the schema or query authority.

The active preferences API supports the AI assistant provider, model, enabled state, and provider-specific cloud consent. Unsupported legacy `theme`, `language`, and `currency` keys are not exposed as application preferences; existing stored values are left intact unless removed by an existing privacy migration.

## Optional AI assistant

The ledger works without AI setup. AI starts disabled. To set up a cloud provider, open **Settings → AI assistant**, choose OpenAI, Anthropic, or Groq, paste its API key into the password field, and select **Save API key**. The app saves it in a private backend credential file; the key field clears and the value cannot be read back. You can replace or remove the saved key there. Then choose a model identifier available to that provider, enable AI, review and grant cloud-data consent, and select **Save preferences** followed by **Test connection**. Nothing is sent to the provider until you submit a question.

You can instead configure an environment key as a fallback by adding only the matching provider key to the ignored project-root `.env` file (or backend process environment), then restarting the backend:

```dotenv
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GROQ_API_KEY=
```

Keys are never stored in SQLite, returned by the API, written to browser storage, or included in chat history or finance backups. A Settings key takes priority over an environment key for the same provider; removing the saved key restores the environment fallback if one exists. The status endpoint reports only configured/unconfigured and source (`settings` or `environment`). Do not paste keys into chat or support requests. The test request sends only a harmless `Reply with exactly READY.` prompt and reports that no ledger data was sent.

For local use, install and start Ollama separately, pull a model yourself, and select its exact local model name in Settings. The local backend default is `http://127.0.0.1:11434`; `OLLAMA_BASE_URL` can select a supported HTTP localhost endpoint. Remote hosts and HTTPS custom endpoints are rejected. Compose defaults to `http://host.docker.internal:11434` and maps `host.docker.internal` to the Docker host gateway. If Ollama is on the host, configure it to listen on an address reachable from the container (Ollama documents `OLLAMA_HOST`); restrict port 11434 with the host firewall so it is available only to the intended local/container network. A host `.env` override must use `http://host.docker.internal:11434`, not `127.0.0.1`, inside Compose. This host-to-container path has not been runtime-verified because Docker Engine is unavailable here. See [Ollama server configuration](https://docs.ollama.com/faq) and [Docker Compose host networking](https://docs.docker.com/compose/how-tos/networking/).

For cloud chat, the provider receives the submitted question, up to six recent conversation messages, and a bounded ledger context. That context can include the selected period and account filter, dates, descriptions, merchants, categories, amounts, currencies, aggregate totals, and up to ten transaction references. Notes, database files, credentials, and unrelated database tables are excluded. Context is capped at 16,000 serialized characters; the provider answer is capped at 12,000 characters. The Settings consent names the provider and data types, and changing provider clears the saved consent. You can withdraw consent in Settings. Ollama requests stay on the selected local server and do not require cloud consent.

The assistant supports explicit ISO date ranges, `YYYY-MM` months, named months with a year, this/last month, year-to-date, and bounded recent day/month windows. A month name without a year asks for clarification. Account references use an exact active account-name match; ambiguous references ask which account. Amounts are calculated by GhostLedger and remain separated by currency. Each reply shows its period, filters, currencies, data cutoff, context truncation, calculated totals, category totals, and compact transaction references in an expandable evidence panel. Chat history retains those references only in this browser. Anomaly flags are review estimates: at least 3x the category/currency median from the preceding six calendar months, with at least eight prior expense records in that group. Recurring estimates use the application's documented monthly heuristic. The assistant cannot query SQL or mutate the ledger.

Connection tests time out after 20 seconds; chat streams time out after 60 seconds. A successful connection test is held in process memory for 15 minutes, so restarting the backend requires another test. Status distinguishes disabled, unconfigured, untested, ready, unreachable, and failed. Ollama reachability and model availability are reported separately. Credential management exposes `GET`, `PUT`, and `DELETE /api/assistant/credentials/:provider`; responses never contain the key. The API also exposes `GET /api/assistant/status`, `POST /api/assistant/test`, and streaming `POST /api/assistant/chat` (`meta`, `delta`, `done`, or `error` events). Chat questions and history are validated and bounded; browser history stays local to that browser.

Provider API references: [OpenAI Responses](https://platform.openai.com/docs/api-reference/responses/create), [Anthropic Messages](https://platform.claude.com/docs/en/api/messages), [Groq API](https://console.groq.com/docs/api-reference), and [Ollama Chat API](https://docs.ollama.com/api/chat).

Current evidence status: all four adapters have mocked provider contract tests; the frontend-to-backend path has a deterministic loopback fake-provider browser test. This proves local wiring only. Live provider smoke tests require separate authorization and configured credentials or an already-installed local model; none is claimed as complete.

## CSV import

CSV uploads are limited to 5 MB and 25,000 data rows. The preview shows source row numbers, parse/validation errors, duplicate matches, and category selections. Rows with errors are not committed. Duplicate rows are skipped unless explicitly marked to keep. Confirmation is atomic and a processed batch cannot be recommitted; undo removes only that completed batch.

Supported examples are synthetic and live in docs/examples:

- HDFC: Date, Narration, Debit, Credit; dates are day/month/year.
- Chase: Posting Date, Description, Amount; dates are month/day/year.
- Generic: date, description, amount; use ISO dates and signed amounts (negative for expenses, positive for income).

Example API request:

```http
POST /api/import
Content-Type: multipart/form-data

file=<statement.csv>
```

The response contains a preview and batch ID. Confirm with POST /api/import/:id/confirm and a JSON body containing rows and optional accountId. Use POST /api/import/:id/undo to undo a completed import. Never upload real financial records to a shared or remote instance.

## Data ownership

- Download a SQLite backup from Settings. Snapshotting uses SQLite's backup API, which includes committed WAL changes.
- Restore accepts a GhostLedger backup from the current schema version. It checks SQLite integrity, exact table columns, foreign keys, and legacy secret-shaped settings. A recovery snapshot is created before replacement.
- Recovery snapshots are stored in a backups directory beside the database. The ten newest GhostLedger recovery snapshots are retained.
- CSV export has stable columns: date, description, signed amount, type, merchant, category, account, currency, external_id, and notes. Text cells that could start spreadsheet formulas are prefixed for safety.
- Purge requires typing PURGE and creates a recovery snapshot first. It removes transactions, import history, rules, categories, accounts, and settings.

Back up before upgrades. Backups from another schema version must first be restored into a compatible GhostLedger release and migrated there.

## Docker

Docker Desktop (or Docker Engine) and the Compose plugin are required.

```powershell
docker compose up --build
```

Open http://127.0.0.1:3001. Compose builds and serves the frontend with the API, runs the container as a non-root user, checks /api/health, and persists the database in ghostledger-data. Stop and restart with docker compose down and docker compose up -d. The named volume survives container rebuilds.

Do not use docker compose down -v unless you intend to delete the persisted volume. Download a backup from Settings before destructive volume operations.

## Verification

```powershell
npm ci
npm run format:check
npm run lint
npm run build
npm test
npm run test:e2e
```

Backend tests create disposable databases and synthetic rows. Browser tests use a separate disposable database. No test needs finance records or cloud AI credentials. Docker image build and persistence checks require a running Docker daemon.

## API groups

- Health: GET /api/health
- Transactions, accounts, categories: CRUD endpoints under /api/transactions, /api/accounts, and /api/categories
- Analytics: summary, monthly, weekly, category, spending-trend, recurring, and expense endpoints under /api/analytics
- Settings and rules: /api/settings and /api/rules
- Assistant status, test, and streaming chat: /api/assistant/status, /api/assistant/test, and /api/assistant/chat
- Import: /api/import
- Data ownership: /api/data/backup, /api/data/restore, /api/data/export.csv, and DELETE /api/data

All API bodies, route identifiers, and supported query parameters are validated with Zod. Success and error payloads use a consistent JSON envelope.

## Troubleshooting

- If better-sqlite3 fails to install, verify the Node version and native build prerequisites, then rerun npm ci.
- If the browser cannot reach the API, check that the backend is listening on port 3001 and that .env has HOST=127.0.0.1.
- If a CSV has ambiguous dates or unsupported columns, convert the dates to ISO YYYY-MM-DD and use date, description, amount headers.
- If restore rejects a file, it may be corrupt or from a different GhostLedger schema version. The current database is left in place on validation failure.
- If Docker reports that it cannot connect to its engine, start Docker Desktop or the Docker Engine service, then retry.

## Contributing and security

See CONTRIBUTING.md for setup and change checks. Report security issues privately using the process in SECURITY.md.

## License

MIT. See LICENSE.
