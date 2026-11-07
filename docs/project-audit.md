# GhostLedger implementation and readiness audit

Baseline review: 2026-11-07. The reproduced findings below describe behavior before the current repair pass. This status table records the latest local verification from 2026-11-08.

## Assessment

The baseline review reproduced failures in imports, ledger edits, account history, analytics, settings, privacy, input validation, and packaging. The repair pass now covers the core local workflows with backend regressions and one end-to-end browser workflow. On 2026-11-08, a clean `npm ci`, lint, build, all 53 backend tests, the end-to-end workflow, and `npm audit` completed successfully; the audit reported zero vulnerabilities.

The clean install and checks ran on Node 22.12.0, while the repository requires Node 22.13.0 or newer in the 22.x line. npm completed with engine warnings, so repeat the release checks on a supported Node version. A production-server smoke check returned 200 for `/`, `/ledger`, and `/api/health`, and 404 for an unknown API path. Docker Compose configuration parses, but Docker Engine is unavailable for image startup and volume-persistence verification. A manual browser walkthrough and screenshot were not completed because the computer-use browser guard could not verify the current Opera URL. Hosted CI has not been run.

The findings and raw observations below are retained as a record of what was reproduced. They are historical unless the status table lists them as remaining.

All probes and regressions used synthetic fixtures and disposable SQLite databases. The user's finance database has not been opened or changed during this work.

## Continuation findings and new scope on 2026-11-08

The user has requested a working optional AI assistant. The source currently has no backend chat/provider route; the assistant appends a fixed local unavailability response and Settings only persists provider preferences. AI is now required by `prompt.md`, and its current unavailable state must remain explicit until implementation and verification are complete.

A source review also found missing account balance/name/type editing and category renaming in Settings, hardcoded date-descending ledger sorting, no ledger UI for the supported account/date filters, and accepted theme/language/currency setting keys without application-preference consumers in the reviewed frontend. These are continuation tasks rather than failures reproduced by new runtime tests. The previous test results below have not been rerun for this documentation update.

The user has deferred supported-Node verification, live Docker startup/persistence, hosted CI, the manual visual walkthrough/screenshot, and the Word brief update. They remain full-release verification gates; they do not block the newly requested product work. Other master-spec roadmap items remain separate from the core-plus-AI scope.

## Current remediation status

| Prompt priority / baseline finding | Current implementation and evidence                                                                                                                                                  | Status                                                                                                                                                                                                                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. CSV normalization               | Explicit Chase US and HDFC date conventions, strict numeric/date validation, signed direction, synthetic examples, and parser regressions.                                           | Implemented; parser regressions pass in the 53-test backend suite.                                                                                                                                                                                                                  |
| 2. Import lifecycle                | Atomic repository commit/undo, retry conflict, duplicate review, keep/skip, retained counts, rollback regression, and a StrictMode guard for initial file selection.                 | Backend regressions and browser workflow pass; browser coverage verifies one selection creates one batch, duplicate review, confirmation, history, and undo.                                                                                                                        |
| 3. Ledger mutations                | Full edit modal including category, CRUD errors, and centralized query invalidation.                                                                                                 | Backend suite and browser create/edit/category/delete flow pass.                                                                                                                                                                                                                    |
| 4. Account history                 | Restrict deletion when linked transactions exist; migration preserves existing rows; currency cannot relabel history.                                                                | Migration and account regressions pass.                                                                                                                                                                                                                                             |
| 5. Financial metrics               | Snapshot-based net worth, currency grouping, six complete months for burn rate, actual category-month totals, recurring heuristic boundaries, and integer-cent aggregates.           | Known-answer metric regressions pass in the backend suite.                                                                                                                                                                                                                          |
| 6. Rules and settings              | Persisted rule CRUD/priority/toggle, settings hydration, account/category setup, truthful AI unavailability, safe local chat history, and live database health.                      | Backend suite and browser persistence checks pass.                                                                                                                                                                                                                                  |
| 7. Validation and limits           | Zod route/body/query schemas, consistent validation errors, 5 MB/25,000-row limits, compatible JSON body ceiling, recoverable import state, and rate/resource bounds.                | Backend validation regressions and browser import flow pass.                                                                                                                                                                                                                        |
| 8. Backup, restore, export, purge  | WAL-aware SQLite snapshot, integrity/schema checks, recovery snapshot, formula-safe CSV export, and explicit purge confirmation.                                                     | Backend ownership regressions and browser backup/restore/export round trip pass.                                                                                                                                                                                                    |
| 9. Migrations and repositories     | Ordered SQLite migration history is authoritative; test setup uses the same runner; CSV commit and rollback persistence lives behind ImportRepository. Drizzle remnants are removed. | Migration regressions and the complete backend suite pass.                                                                                                                                                                                                                          |
| 10. Privacy                        | Loopback defaults, deliberate remote flag, host/origin checks, settings allowlist, legacy-secret cleanup, local fonts, security headers, upload and private-file limits.             | Source and regression checks pass; a packet-level offline request capture was not performed.                                                                                                                                                                                        |
| 11. Installation                   | Root npm workspaces, coherent root lock, `.env.example`, project-root environment loading, native dependency documentation, and runtime dependency groups.                           | `npm ci` succeeds with zero audit findings. This host is on Node 22.12.0, below the declared 22.13.0 minimum, and npm reports engine warnings; repeat on a supported Node version.                                                                                                  |
| 12. Docker delivery                | Root Compose, non-root multi-stage image, SPA/API serving, health check, named volume, and loopback port default.                                                                    | `docker compose config --quiet` passes. The compiled production server serves `/` and `/ledger`, returns `/api/health`, and keeps unknown API paths as 404s. Docker image build, container health, restart, and persistence remain unverified because Docker Engine is unavailable. |
| 13. Accessibility/responsive       | Modal focus trap/Escape/return, associated labels, named controls, keyboard file selection, responsive sidebar/table overflow.                                                       | Browser test verifies modal focus/Escape/return, basic keyboard use, and mobile viewport without horizontal overflow. Manual on-screen walkthrough and screenshot remain pending because browser access was blocked by the URL safety guard.                                        |
| 14. Release checks                 | Formatting, root lint, production builds, backend tests, isolated Chromium workflow, and dependency audit.                                                                           | `npm run format:check`, `npm run lint`, `npm run build`, `npm test`, and `npm run test:e2e` pass; `npm audit` reports zero vulnerabilities. Route-level lazy loading reduced the main chunk to 297.83 kB; the largest page chunk is 418.23 kB. GitHub-hosted CI has not run.        |
| 15. Documentation                  | README, architecture, status, audit checklist, contribution/security guidance, examples, and technical brief should match delivered behavior.                                        | README, architecture, status, contributor guidance, and Markdown technical brief now reflect the implementation. The tracked Word brief still needs an update and render review; this host has no LibreOffice renderer.                                                             |

Latest local verification: `npm ci` completed with engine warnings under Node 22.12.0; `npm run format:check` and `npm run lint` passed; `npm test` passed 53 tests across 11 files; `npm run build` passed with no chunk-size warning (297.83 kB main chunk, 418.23 kB largest page chunk); `npm run test:e2e` passed one full browser workflow; `npm audit --json` reported zero vulnerabilities; and a production-server smoke check passed for the app shell, a deep link, health, and unknown API behavior. Docker Engine, hosted CI, supported-Node verification, manual browser review, and screenshot capture remain open.

## Evidence and limits

- At the time of the baseline review, 32 backend tests across seven files and both production builds passed; those results did not cover the reproduced workflow failures.
- Additional probes exercised the compiled Express application and services with Supertest and an isolated database. The results below are observed behavior, not just predictions from source inspection.
- At baseline, `npm run lint` failed because root ESLint dependencies were missing. Root dependencies have since been added and lint now passes without warnings.
- The README's root-level `docker compose config` fails with `no configuration file provided: not found`.
- `docker compose -f docker/docker-compose.yml config` succeeded at baseline; the root `compose.yaml` has since been added with a loopback publication default.
- At the time of the baseline review, Docker image startup, browser workflows, and hosted CI had not completed. Current results and remaining checks are recorded above.

## Baseline findings reproduced before remediation

### 1. Bank parsing can silently change dates and amounts — high priority

Sources: `backend/src/services/parsers/bankParsers.ts:3`, `:20`, `:57`, `:102`.

Observed:

| Input                    | Expected interpretation | Actual result                  |
| ------------------------ | ----------------------- | ------------------------------ |
| Chase `11/05/2026`       | November 5, 2026        | May 11, 2026                   |
| HDFC debit `1,234.56`    | 1234.56                 | 1                              |
| Generic amount `100oops` | Validation failure      | 100, with no validation errors |

The shared date parser assumes day/month/year for Chase's US dates. HDFC uses `parseFloat` directly on formatted amounts. The general number parser also accepts a valid prefix followed by junk. The new calendar validation cannot detect a correctly formatted but incorrectly interpreted date or amount.

Required outcome: explicit date conventions per bank; complete-string amount validation; tested handling of grouping separators, currency symbols, signs, and debit/credit columns. Retain source row numbers and useful validation messages.

### 2. Import commits are repeatable and duplicate flags do not control insertion — high priority

Sources: `backend/src/services/csvImportService.ts:172`, `:230`; `frontend/src/components/ImportModal.tsx:97`; `backend/src/services/duplicateDetectionService.ts:11`.

Observed: confirming one batch twice returns HTTP 200 twice and inserts two copies. Confirming that batch after undo also returns HTTP 200. The commit operation checks existence but does not require `status = preview` or guard the state change inside the transaction.

Separately, the UI sends duplicate-flagged rows along with all other valid rows. There is no explicit keep/skip decision. Detection compares against existing transactions only, so duplicates inside the uploaded file are not caught. External IDs are accepted in types but not actually used for matching. Completed history counts reset skipped and duplicate counts to zero.

Required outcome: an atomic batch state transition; a defined response to retries; explicit duplicate review; correct history counts; tests covering retries, repeat files, duplicates within a file, undo, and import after undo.

### 3. Ledger category edits silently fail, and several mutations leave analytics stale — high priority

Sources: `frontend/src/pages/Ledger.tsx:55`, `:61`, `:68`, `:153`; `backend/src/validators/transaction.ts:27`; `frontend/src/components/ImportHistory.tsx:15`.

The ledger submits `category_id`, while the API expects `categoryId`. Zod strips the unknown property, so the request succeeds while the category stays unchanged. An isolated request reproduced HTTP 200 with the original category retained.

Inline edits, ledger deletion, and undo invalidate only ledger/history queries. They do not invalidate summary, charts, recent transactions, or recurring/expense queries. The separate transaction modal invalidates them, but its edit mode is not wired into the ledger; only the add mode is mounted in `AppLayout.tsx`.

Required outcome: explicit typed request DTOs rather than `Partial<Transaction>` for writes; a working create/edit path; consistent cache invalidation after every mutation; visible errors when a mutation fails. The README's "full create/edit modal" claim needs correction until the edit flow is reachable.

### 4. Account deletion silently removes linked financial history — high priority

Sources: `backend/src/database/connection.ts:59`; `backend/src/repositories/accountRepository.ts:95`.

The account foreign key uses `ON DELETE CASCADE`. An isolated account deletion also deleted its linked transaction; fetching that transaction afterwards returned 404.

Required outcome: choose and document an archival policy, such as deactivating accounts or rejecting deletion when transactions exist. Destructive removal of financial history needs an explicit workflow and regression coverage.

### 5. Financial metric labels overstate the calculations — high priority

Sources: `backend/src/services/analyticsService.ts:69`, `:77`, `:147`, `:168`; `backend/src/services/recurringDetectionService.ts:55`, `:86`; `frontend/src/pages/Dashboard.tsx:190`.

Observed: an account with a 50,000 balance and no transactions produces Net Worth = 0. After one 100 expense, Net Worth = -100 and Burn Rate = 8.33.

- Net Worth is assigned cumulative net savings; account balances and liabilities are ignored. The sidebar and dashboard now agree, but they agree on the wrong concept.
- Burn Rate always divides lifetime expenses by 12, regardless of the selected period or available history. The dashboard does not currently render that metric despite the README listing it.
- Spending trends allocate each month's total expenses using an all-time category percentage. They do not query actual category spending by month, and `changePercent` is always zero.
- Upcoming recurring returns detected recurring groups rather than calculating upcoming due dates. Detection does not enforce an expense-only policy or verify a monthly cadence.
- Largest expenses always return `categoryName: null` despite the repository query joining categories.
- The dashboard filters out null category names, hiding legitimate uncategorized spending from the category chart.
- Account currencies can differ, but totals are combined and the UI formats everything as INR. Monetary values use floating-point REAL without a defined rounding policy.

Required outcome: define each metric, date window, opening/current balance meaning, currency policy, and monetary precision; calculate the metric accordingly or use an accurate label. Add numerical fixtures with known expected answers.

### 6. Rule management and several settings controls are presentation-only — high priority

Sources: `frontend/src/pages/Settings.tsx:38`, `:42`, `:54`, `:116`, `:129`, `:151`, `:202`, `:213`, `:217`.

The rule engine and rules API exist, but the settings screen displays four hardcoded rules in component state. Removing one changes only that local list. New Rule has no handler. This screen cannot create or manage the persisted rules used during imports.

LLM settings are fetched but never loaded into the form. Save omits the API key, while Test Connection has no handler. Database health is hardcoded. Backup DB and Purge Data have no handlers. Backup, restore, and CSV export routes do not exist. There is also no user-facing account/category management flow for a fresh database.

Required outcome: wire the documented core settings workflows to real APIs, provide honest loading/success/error states, and clearly mark planned capabilities. Saved settings must survive navigation and reload in both storage and form values.

### 7. The documented production installation does not deliver a usable website — high priority

Sources: `docker/docker-compose.yml:1`; `docker/Dockerfile:16`; `backend/src/app.ts:11`; root `package.json:6`; `backend/src/config/env.ts:5`.

- Root `docker compose up` cannot find the nested compose file.
- The image copies `frontend/dist`, but Express has no static frontend route or SPA fallback, and no separate frontend service is defined. An isolated request to the compiled Express app's `/` returned 404.
- Root `npm install` installs root tools only: there are no npm workspaces or child-install scripts. On a fresh checkout the documented root quick start leaves frontend/backend dependencies uninstalled.
- Environment loading resolves to `backend/src/.env` in development and `backend/dist/.env` in compiled code, rather than the advertised project `.env` or existing `backend/.env`.
- `better-sqlite3` is a runtime requirement listed in `devDependencies`. A normal production install that omits development packages will lack it. The Docker image currently avoids that failure only by copying all development dependencies too.

Required outcome: one documented, reproducible installation; a production server that serves the app and API; working environment configuration; persistent volume restart verification; correct runtime dependencies and declared Node requirements.

### 8. Local privacy and credential claims need enforceable boundaries — high priority

Sources: `backend/src/index.ts:4`; `docker/docker-compose.yml:7`; `backend/src/controllers/settingsController.ts:9`, `:22`; `backend/src/repositories/settingsRepository.ts:34`; `frontend/index.html:8`; `backend/src/routes/imports.ts:7`.

- The server listens without a loopback host restriction and Compose publishes on all host interfaces. Because there is no authentication, another machine that can reach the port can call the API. CORS does not authorize non-browser requests.
- Generic settings accept arbitrary keys and return all values. A fake `ai_api_key` was stored in the finance SQLite database and returned by GET settings, contradicting the documented rule that keys never enter that database. This is an allowed API path; the current UI does not itself save the key.
- The frontend loads Google Fonts, so runtime rendering makes external requests. No telemetry or financial-data upload implementation was found in the reviewed source, but a fully offline/no-external-dependency claim is too strong.
- There is no `.dockerignore`, so local databases, environment files, dependencies, and uploads can enter the Docker build context/cache. Upload storage is not ignored by Git. A rejected filename can return before the upload file is removed; process crashes can also leave sensitive statement files behind.

Required outcome: loopback-only defaults with deliberate opt-in for remote use; an allowlisted non-secret settings schema; separate credential storage with no readback in generic settings; local font assets; excluded private/build data; upload cleanup on every path.

### 9. Input validation and import limits remain incomplete — medium priority

Sources: `backend/src/controllers/importController.ts:46`; `backend/src/controllers/rulesController.ts:23`; `backend/src/controllers/settingsController.ts:22`; `backend/src/app.ts:13`; `backend/src/middleware/errorHandler.ts:6`; `frontend/src/components/ImportModal.tsx:57`, `:74`.

Observed:

- Confirming an import with `rows: [null]` returns 500 rather than a validation response.
- Creating a rule with `enabled: "false"` returns 201 and saves it as enabled.
- A 1,000-row confirmation payload exceeds Express's default JSON limit and returns a generic 500. This is inconsistent with the advertised 50 MB CSV upload workflow.

Rules and settings bypass their intended Zod validation boundaries; several analytics query values are manually coerced without range validation. Foreign key failures and malformed JSON/upload errors are not mapped to useful client errors. There is no import rate limit or row-count/work bound. Parsing and matching run synchronously; duplicate checking scans existing rows per imported row and the rule engine reloads rules for every row. Some analytics/detection paths silently stop at 100,000 transactions.

On upload/confirm failure, the import UI sets an error but does not return from `previewing`/`importing` to an editable state, leaving a loading view displayed.

Required outcome: runtime schemas for every API boundary, consistent 4xx responses, compatible file/body/row limits, recoverable preview failures, and bounded import work. Test representative large statements instead of relying on the upload size setting.

### 10. Schema changes are not managed by migrations — medium priority

Sources: `backend/src/database/connection.ts:19`, `:108`; `backend/src/database/migrate.ts:1`; `instruction.md:28`; `docs/architecture.md:5`.

The database initializes via `CREATE TABLE IF NOT EXISTS` at startup. The migrate command imports that initializer and closes the connection. There are no tracked migration files or version history. Existing tables will not receive future column/constraint changes through this mechanism.

Drizzle schemas, runtime SQL, and test setup SQL describe the schema independently. CSV import also executes SQL directly in the service, despite the documented repository boundary. Documentation disagrees about whether raw SQL or Drizzle should be used for queries.

Required outcome: versioned migrations with upgrade tests and a single authoritative schema process; document the actual query strategy and move persistence operations behind repositories. A wholesale query rewrite is not required to fix the migration problem.

## Baseline project gaps recorded before the repair pass

The following table records the original gaps that motivated this work. Use the current remediation table at the top of this document for present-day status.

| Area                      | Current gap                                                                                                         | Useful completion criterion                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Data ownership            | No working backup, restore, or CSV export                                                                           | Explicit backup/restore round trip, WAL-safe snapshotting, validated restore, safe CSV quoting and formula handling                  |
| Fresh installation        | No account/category onboarding; separate dependency installs undocumented                                           | New checkout to usable empty ledger using only README instructions                                                                   |
| Test coverage             | Backend CRUD tests do not cover the complete UI or most bank/duplicate/recurring workflows                          | Browser tests for import/retry/edit/undo/settings and numerical/parser fixtures                                                      |
| Test lifecycle            | Test helper closes its own DB handle, but app imports open a second connection; the app changes journal mode to WAL | Close the application connection and remove all temporary database files reliably                                                    |
| Tooling                   | Lint command fails; no tracked CI workflow                                                                          | Reproducible install, lint, build, backend tests, selected browser flows, and migration checks in CI                                 |
| Accessibility             | Modals lack dialog/focus/Escape behavior; many icon controls lack names; labels lack input association              | Keyboard-only completion of core workflows, automated checks plus manual review                                                      |
| Responsive layout         | Fixed 256px sidebar and permanent content margin                                                                    | Usable navigation, tables, forms, and dialogs at narrow screen sizes                                                                 |
| Offline operation         | Google Fonts requests at runtime                                                                                    | Core app remains fully usable with external network access disabled                                                                  |
| Release packaging         | No verified full Docker startup, health check, graceful shutdown, or documented recovery                            | Build/start/restart/persistence check with a repeatable release command                                                              |
| Contributor documentation | No CI/contribution/security guidance, bank-format fixtures, or screenshots                                          | Accurate setup, supported CSV examples, troubleshooting, data location/recovery instructions, screenshots, and contribution guidance |
| Dependencies              | Declared frontend table/form/Markdown libraries are not used                                                        | Keep dependencies and architecture claims aligned with actual implementation; run a dependency advisory audit                        |

## Current documentation claim matrix

| Claim or roadmap item                                               | Current assessment                                                                                                                                                   |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React/Vite/TypeScript, Express, SQLite, prepared repository queries | Implemented; migrations and SQL repository boundaries are documented in `docs/architecture.md`.                                                                      |
| Local storage without sign-in, telemetry, or mandatory cloud AI     | Implemented with loopback defaults. Remote mode does not provide authentication.                                                                                     |
| Transaction, account, and category CRUD                             | Implemented through the UI and API, with validation and account-history protection.                                                                                  |
| CSV preview, rules, duplicates, commit, history, and undo           | Implemented for HDFC, Chase, and the documented generic layout; backend and browser regressions pass.                                                                |
| Additional bank formats                                             | Future scope; only HDFC, Chase, and generic examples are claimed as supported.                                                                                       |
| Rule management and settings                                        | Persisted in the API and covered by backend/browser checks.                                                                                                          |
| Transaction create/edit/delete and category assignment              | Implemented and exercised in the browser workflow.                                                                                                                   |
| Financial metrics                                                   | Defined in the README; currency-aware calculations, six-month burn rate, and recurring estimates have known-answer regressions.                                      |
| Root Docker Compose setup                                           | Compose configuration parses. Live image startup and data persistence have not been verified because Docker Engine is unavailable.                                   |
| API validation                                                      | Zod validates request bodies, route parameters, query values, settings, and import rows; backend regressions pass.                                                   |
| Versioned migrations                                                | Ordered TypeScript migrations are recorded in `schema_migrations`; upgrade tests pass.                                                                               |
| Credential boundary                                                 | Generic settings reject secret-shaped keys; legacy secret-shaped settings are cleaned by migration.                                                                  |
| AI backend                                                          | Unavailable and labeled honestly; local chat history is supported. Provider integrations remain future scope.                                                        |
| Backup, restore, CSV export, and purge                              | Implemented and covered by backend tests; browser verifies backup/restore/export round trip.                                                                         |
| Accessibility and responsive layout                                 | Core dialogs, keyboard paths, and mobile overflow are covered in the browser suite; manual visual review remains open.                                               |
| Release verification                                                | 53 backend tests and one end-to-end browser test pass; npm audit reports zero vulnerabilities. Supported-Node, Docker, hosted CI, and screenshot checks remain open. |

The master specification also includes additional bank adapters, bulk ledger actions, amount/account rule conditions, tags/review actions, and user confirmation of recurring patterns. These are not implemented. They should be explicitly marked as future scope rather than included in a blanket statement that every document is complete.

## Baseline implementation order

This was the suggested order before the repair pass began. The status table and remaining checks above supersede it.

1. **Protect correctness and history:** bank parsing, atomic import lifecycle and duplicate decisions, category writes, deletion policy, and consistent refresh after every mutation. Add regression cases for the observed failures.
2. **Make the local product usable and honest:** accurate metric definitions, persistent rules UI, settings hydration, account/category setup, import error recovery, and clear AI availability wording.
3. **Complete local ownership and delivery:** backups/restore/export, loopback defaults, credential boundaries, private-file exclusions, offline assets, migrations, and working production/Docker setup.
4. **Establish release evidence:** fix lint, add CI and selected browser workflows, validate clean installation and persistent storage, finish keyboard/mobile checks, then update README/architecture/status documents and screenshots to match verified behavior.

AI providers can remain explicitly planned while the core local finance product is completed. Adding more visible features before correcting the observed integrity and delivery failures would leave the main readiness gaps unresolved.
