# GhostLedger repository guidance

These instructions describe the current implementation. Read `README.md`, `docs/architecture.md`, and `docs/project-audit.md` before changing product behavior. `prompt.md` contains the current repair requirements. `master_prompt.md` records broader product goals and is not a list of shipped features.

## Architecture

Keep the existing layered backend:

```text
routes → controllers → services → repositories → SQLite
```

- Routes bind URLs, middleware, and controllers. They do not access SQLite.
- Controllers validate request data and map service results to the API response format.
- Services own business rules and workflows.
- Repositories own parameterized `better-sqlite3` queries and writes.
- Use prepared SQL. Drizzle is not used by this project.
- Make schema changes through ordered TypeScript migrations recorded in `schema_migrations`. Keep startup and `npm run db:migrate` on the same migration runner.
- Use explicit request and response contracts. Do not use database entity types such as `Partial<Transaction>` as write contracts.

Validate request bodies, route parameters, query values, settings, and imported rows with Zod. Map validation and storage failures to consistent useful API errors. Do not log credentials, financial rows, or full uploaded statement contents.

## Frontend

Use functional React components and hooks. Keep pages, components, hooks, services, and types in the existing `frontend/src` structure. Use React Router for navigation, TanStack Query for API state and invalidation, Recharts for charts, and PapaParse for CSV handling. Preserve the current visual design and keep layouts keyboard-accessible and responsive.

Avoid adding dependencies for features that are not used. The current project does not use TanStack Table, React Hook Form, or `react-markdown`. Use route-level lazy loading for page modules when it keeps the initial client bundle smaller without complicating user flows.

## Product scope

The optional AI assistant supports OpenAI, Anthropic, Groq, and local Ollama. Keep it disabled by default; a cloud provider requires provider-specific opt-in and a successful recent connection test. Cloud credentials can be entered in Settings and stored in a separate user-private backend file, or supplied through backend process environment variables. Never put keys in SQLite, browser storage, chat history, generic settings, backups, logs, or source control. Keep fixed cloud destinations, local-only Ollama host validation, bounded read-only context, and bounded streaming output. A mocked adapter or fake-provider browser test does not count as a live-provider verification.

Account balance/name/type editing, category renaming, and ledger account/date filters and sort controls are supported product workflows. Account currency cannot change after transactions use it. Category rename must preserve transaction and rule links; reject category type changes when linked records would change meaning. `theme`, `language`, and `currency` are not active application preferences; preserve legacy values unless an explicit migration or privacy requirement removes them.

Current supported import formats are HDFC, Chase, and the documented generic CSV layout. Do not claim support for other banks without synthetic format fixtures and parser verification. Bulk ledger actions, expanded rule actions, and user confirmation of recurring suggestions remain future work.

## Privacy and data safety

Keep local API and Docker publication defaults on loopback. Any remote mode must be explicit and documented; it does not add authentication. CORS is not authentication. Do not store provider keys in the finance SQLite database or return secret values through generic settings APIs. Keep uploads, databases, backups, and environment files out of Git and Docker build context.

Never use the user's finance database for tests or demos. Use synthetic fixtures and disposable SQLite paths. Preserve existing data when adding migrations or destructive workflows. Use parameterized SQL and protect CSV exports from formula execution.

## Verification

Run checks appropriate to each change from the repository root:

```powershell
npm ci
npm run format:check
npm run lint
npm run build
npm test
npm run test:e2e
```

Backend tests use Vitest and Supertest. The browser suite uses an isolated database and synthetic data. The Docker Compose syntax check is `docker compose config --quiet`; live image and persistence checks require a running Docker Engine.

Report what changed and which checks passed. Keep implemented, locally verified, live-provider verified, environment-deferred, and roadmap status distinct. State any environment mismatch, unavailable infrastructure, or unverified behavior instead of calling it complete. Do not wait for further approval when the user has already requested the implementation and no required decision is missing.
