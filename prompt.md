# GhostLedger: finish the local product and implement the AI assistant

## Objective

Finish the remaining product workflows and implement a working optional AI assistant. Preserve the local ledger repairs already delivered. Include privacy, data ownership, meaningful regression coverage, and accurate documentation in this work.

Read the audit, current source, README, architecture documents, and existing tests before implementing. The audit contains reproduced failures; existing completion notes and passing builds are not proof that a user workflow works.

Follow the continuation priorities below first. The original audit requirements in sections 1–15 remain the regression contract; investigate them when evidence warrants it rather than rebuilding completed features. Complete each new workflow from frontend through API to storage and verify it before marking it done.

## Current baseline and meaning of finished

As recorded in `NEXT.md` and `docs/project-audit.md`, the previous repair pass delivered ledger CRUD, supported CSV parsing and duplicate review, atomic import/undo, financial metrics, migrations, persisted rules/settings, backups/restore/export/purge, local request protections, root installation/build tooling, and a selected browser workflow.

The previous local run passed `npm ci`, formatting, lint, production builds, 53 backend tests, one end-to-end browser workflow, production-server smoke checks, Compose configuration parsing, and an npm audit with zero reported vulnerabilities. These are dated results, not proof of the current dependency tree or of untested behavior. Record fresh results when implementation changes justify them.

Source review on 2026-11-08 identified remaining product work:

- There is no backend AI/chat route or provider adapter. `Assistant.tsx` stores messages and appends a fixed unavailability notice. `ProviderPreferences` only saves configuration. The message “Preferences saved. The AI backend is still unavailable.” is accurate today and must be replaced by real functionality, not hidden or reworded to suggest success.
- Provider selection currently shares an OpenAI endpoint default. Implement provider-specific configuration and prevent sending one provider's credentials to another provider's endpoint.
- Settings offers account creation and activation/deactivation, but no editing of an existing account's balance/name/type. A balance-snapshot model requires a usable balance-update workflow. Categories can be created/deleted but not renamed through the UI.
- Ledger requests are hardcoded to date descending. User-controlled sorting and the useful account/date filters supported by the API are not exposed.
- `theme`, `language`, and `currency` are accepted by the settings API, but the reviewed frontend does not consume them as application preferences. Audit these contracts; do not count stored values as working preferences.

“Finished” for this continuation means the repaired local finance product plus the optional AI assistant and the product gaps below. It does not mean every item in `master_prompt.md` has shipped. Additional bank adapters, bulk ledger operations, richer rule conditions/actions, and user confirmation of recurring patterns remain explicit roadmap items unless separately implemented and verified. Maintain a delivered/remaining/deferred scope matrix so this distinction stays visible.

## Deferred environment checks

The user has explicitly deferred these checks. Keep them documented, preserve the related safeguards, and do not install or reconfigure host tools to complete them in this continuation:

- Supported-Node verification: the system runtime is 22.12.0, below the declared 22.13.0 minimum in the 22.x line.
- Actual Docker image build/start, health, and data persistence through restart/rebuild; Docker Engine is unavailable.
- Hosted GitHub Actions execution.
- Manual desktop/mobile visual walkthrough and screenshot capture; Computer Use previously stopped because it could not verify Opera's current URL.
- Updating/rendering the tracked Word architecture brief; the required DOCX renderer is unavailable. Maintain the Markdown architecture documents now.

These remain release sign-off items, not newly completed work. Proceed with the product implementation and local checks that are available. A full release-complete claim must wait for the deferred evidence.

## Continuation priority A: deliver a real optional AI assistant

### A1. Provider service and real configuration

- Introduce a typed provider interface and working OpenAI, Anthropic, Groq, and Ollama adapters corresponding to the options already in Settings. Keep provider transport, retrieval/business logic, controller validation, and persistence separate.
- Check current official provider documentation during implementation. Do not assume model names, API shapes, SDK versions, endpoint defaults, or model availability from old examples. Do not add provider names to the UI unless the adapter works.
- Add validated backend routes for provider status, connection testing, and chat. Add separate credential write/delete routes only if credentials are configured through the UI. Return typed errors and status without secret readback.
- Keep AI disabled by default and the ledger usable without credentials or a running local model. Distinguish disabled, unconfigured, ready, unreachable, and failed states. Saving preferences is not a successful connection test.
- Provide provider-specific endpoint/model defaults or validated required fields. Switching providers must not retain incompatible endpoints, models, or credentials accidentally. Treat Ollama model availability separately from server reachability.
- Make Test Connection issue a small harmless provider request and accurately report authentication, missing model, unavailable service, quota/rate limit, timeout, and invalid response failures. It must not send ledger data.
- Cloud credentials belong in process environment variables or a separate local secret store with appropriate POSIX permissions/Windows ACLs. Never put them in SQLite, browser storage, chat history, generic settings, finance backups, logs, exceptions, source control, or Docker build context. Expose only configured/unconfigured state, and allow replacement/removal without readback.
- Validate provider URLs, allowed schemes/hosts, redirects, and request destinations. Use fixed official cloud origins by default; support local Ollama deliberately. Prevent arbitrary server-side network access and credential forwarding to unrelated hosts. Document any deliberate custom/remote endpoint mode.

### A2. Ground answers in the actual ledger

- Build a read-only context/retrieval service through existing repositories and analytics services. Use validated filters and prepared queries; never execute SQL or commands supplied by a model.
- Support the existing suggested questions: spending/category summaries, monthly burn rate, recurring/subscription estimates, and unusual transactions. Add deterministic anomaly criteria with a documented comparison period and minimum-history rules; label flags as estimates for review.
- Resolve explicit date ranges and follow-up questions consistently. Show the period, filters, currencies, data cutoff, and any context truncation used. Ask for clarification when a range or account is genuinely ambiguous.
- Calculate financial numbers in application code. Reuse the established snapshot balance, burn-rate, recurring, rounding, and currency semantics. Show supporting totals and relevant transaction references so answers can be checked; prevent cross-currency totals or unsupported numerical claims.
- Use aggregate context first. Include only the minimum necessary transaction fields and rows for the question, bound row/history/context/output sizes, and disclose truncation. Do not send the whole database, backup files, or unbounded history to a provider.
- When no relevant records or insufficient history exists, explain that accurately. Treat imported descriptions, merchant names, notes, chat text, and model output as untrusted data; they must not override instructions, access secrets, trigger tools, or mutate the ledger.
- Before sending finance context to a cloud provider, require an explicit opt-in that identifies the provider and types of data shared. Show the current destination/mode and allow withdrawal; a provider/destination change must not silently reuse consent. Local Ollama should work without a cloud dependency. Do not transmit actual user financial data during implementation verification.

### A3. Connect the assistant UI end to end

- Replace the canned reply with the real backend request and provider response. Suggested prompts must invoke the same real flow. Update Settings, assistant status, introductory messages, footer text, accessibility labels, and success messages to derive from actual readiness.
- Stream responses through a documented, bounded protocol with loading state, Stop/cancel, timeout, and disconnection handling. Abort upstream work when cancelled or disconnected. Distinguish partial, failed, cancelled, and completed messages; do not persist failures as successful analyses.
- Prevent duplicate requests, support a deliberate retry, keep typed input recoverable after errors, and handle provider changes during an active request predictably. Support Enter to send, Shift+Enter for a newline, and accessible status/error announcements.
- Preserve current local history across navigation/reload with bounded storage and safe migration/recovery. Treat historical unavailability notices as historical messages. Clear chat must also clear associated local conversation state; cancellation/clear must prevent a late response from repopulating cleared history.
- Render responses safely. If Markdown is used, disallow raw HTML and unsafe links; avoid external image loads or other generated content that leaks financial context.

### A4. Prove the integration and document setup

- Add focused provider contract tests using mocked network transport for all four adapters, plus retrieval fixtures with known financial answers, empty data, mixed currencies, date windows, context caps, prompt injection attempts, and malformed provider responses.
- Test missing/invalid credentials, missing local models, refused connections, quota/rate errors, timeouts, cancellation/disconnect, oversized requests, secret redaction, destination validation, and cloud opt-in. CI must not require real credentials, paid calls, downloaded models, or user finance records.
- Add browser coverage for configuration/status, a real frontend-to-backend chat flow using a deterministic fake provider server, streamed output, cancel/retry, suggested prompts, and history reload/clear. A fake transport proves app wiring, not live model integration.
- Separately perform a live smoke test with a configured provider and synthetic finance data when authorized credentials or an existing local Ollama model are available. Verify the adapter's status/connection/chat path. Record each provider as live-verified, contract-tested only, or blocked; never claim live success from mocks. Do not solicit keys in chat, incur paid API usage, or download large models implicitly.
- Document provider setup, required local prerequisites, environment/secret configuration, model selection, local versus cloud behavior, consent, data sent, timeouts/limits, troubleshooting, and Docker host-to-Ollama configuration without assuming an unavailable Engine works.

## Continuation priority B: close the remaining local product gaps

- Add account editing for balance snapshots and supported metadata, with validation, pending/error/success state and immediate dashboard/sidebar refresh. Preserve history and the existing guard against relabeling transaction currency. Keep activation/deactivation usable and explain its Net Worth effect.
- Add category rename/edit controls with safe handling of linked transactions/rules and type changes. Do not silently change the meaning of historical transactions or remove rules during an ordinary rename.
- Add accessible ledger sort controls, validated server-side sort allowlists, stable ordering for ties, and account/date-range filters. Preserve pagination/filter state correctly and handle deleting the last row of a page.
- Review every rendered action and accepted preference. Implement what is exposed or explicitly restrict/remove unsupported options from the active contract without destroying legacy data. Do not add exchange-rate conversion or localization merely because an unused setting key exists.
- Recheck failure recovery, stale-data refresh, destructive confirmation/recovery, input labels, keyboard flows, and narrow-screen usability across the new controls. Preserve the current visual design.
- Compare the actual source and existing regression cases with the audit's claims. Add missing tests only where they verify a meaningful unresolved failure; do not treat one broad happy-path browser test as exhaustive release coverage.

## Continuation priority C: reconcile evidence and documentation

- Update `NEXT.md`, `docs/project-audit.md`, README, architecture notes, `instruction.md`, and the Markdown architecture brief when functionality is delivered. The old instruction that AI is out of scope is superseded by this prompt; the currently shipped code is still unavailable until implemented.
- Maintain separate statuses for implemented, locally verified, live-provider verified, environment-deferred, and roadmap work. Keep prior audit history clearly historical.
- Run formatting, lint, builds, backend tests, appropriate browser checks, and a fresh dependency audit after relevant changes. Keep installation/workspace locks coherent; preserve existing user changes and data.
- Report exact commands/results, provider verification level, limitations, and remaining release checks. Update test counts from actual output. Do not repeat costly checks without a new change or unresolved concern.

## Working rules

- Preserve existing user data and unrelated working-tree changes. Use disposable databases and synthetic statements for verification.
- Preserve the current visual design. Make the accessibility, responsive layout, error handling, and usability corrections needed to finish existing workflows.
- Continue through routine implementation decisions autonomously. Document significant domain and architecture choices.
- Keep SQLite, TypeScript, React/Vite, and Express. Keep business logic in services and persistence operations behind repositories.
- Use parameterized queries and explicit request/response types. Do not use database entity types such as `Partial<Transaction>` as write contracts.
- Resolve conflicting documentation about Drizzle and raw SQL. Establish one authoritative migration/schema process and describe the actual implementation accurately.
- Every active control must perform its stated action and report success or failure honestly. A rendered UI, compiled file, or mocked response is not a completed feature.
- AI provider integration is required in this continuation. Keep AI optional, preserve local history, and report actual configuration/readiness without fake responses or readiness claims.
- Additional bank adapters, bulk actions, expanded rule actions, and other master-spec features must be accurately marked as future scope if not implemented. Distinguish delivered features from the roadmap.

## Baseline requirements: financial correctness and preservation

### 1. Correct CSV normalization and validation

- Give each bank parser an explicit date convention. Chase US dates must not be interpreted as day/month/year. Handle ambiguous generic dates through a documented explicit convention or user choice.
- Correct formatted amount parsing, including grouping separators, currency symbols, signs, parentheses, and debit/credit columns where supported.
- Reject invalid numeric values in full rather than accepting a `parseFloat` prefix. `100oops` must not become `100`.
- Validate real calendar dates, finite positive amounts, transaction type, required text, and referenced account/category IDs at preview and commit boundaries.
- Preserve source row numbers and clear errors. Invalid rows must remain visible and must never be silently committed.
- Establish supported formats with synthetic fixtures. Do not claim support for unverified bank exports.

Required regressions: Chase `11/05/2026` becomes `2026-11-05`; HDFC `1,234.56` becomes exactly `1234.56`; malformed numerics, `INVALID_DATE`, impossible dates, non-finite amounts, and missing required values are rejected. Verify income/expense direction for supported formats.

### 2. Make import confirmation safe to retry

- Enforce the batch lifecycle and insertion within the same database transaction.
- Repeated confirmation must not insert rows again. Define whether a retry returns the original result or a conflict.
- A rolled-back batch must not be silently recommitted; deliberate reimport must use an explicit new workflow.
- Detect duplicates against existing transactions and within the file. Use external IDs when supplied and account/type-aware matching to avoid false matches.
- Provide explicit keep/skip decisions for flagged duplicates instead of importing every flagged row.
- Keep preview, submitted rows, committed rows, and imported/skipped/duplicate history counts consistent.
- Verify rollback when any commit operation fails.

Required checks: repeated confirm, repeat upload, duplicates within one file, explicit duplicate decisions, undo, confirm after undo, and accurate history counts.

### 3. Finish ledger editing and refresh behavior

- Fix the `category_id` versus `categoryId` mismatch so an accepted category edit changes the saved category.
- Wire the full transaction edit flow into the ledger, including fields the UI claims are editable.
- Keep manual creation functional with validation, save errors, pending state, and immediate refresh.
- Refresh ledger, summary, charts, recent transactions, recurring results, largest expenses, and sidebar values after create, edit, delete, import, and undo as applicable.
- Surface mutation errors instead of reporting successful no-op writes or leaving stale values.

### 4. Preserve history when accounts change

- Replace implicit cascade deletion of transactions with an explicit preservation policy, such as archival or rejecting account deletion while transactions exist.
- Apply the change through a migration that preserves existing data.
- Keep destructive history removal in a deliberate workflow with clear confirmation and a recovery option.
- Test that account changes cannot unexpectedly erase ledger history.

### 5. Make financial metrics accurate

- Define opening/current balances, liabilities, transaction effects, date windows, and currency semantics. Document the chosen model.
- Calculate Net Worth from that balance model rather than assigning net savings. Do not double count opening balances and transactions. Use the same backend source in sidebar and dashboard.
- Calculate burn rate for a defined period instead of dividing lifetime expenses by 12. Display it if the release claims it.
- Query actual category spending by month for trends and calculate meaningful changes rather than constant placeholders.
- Distinguish recurring detection from upcoming due-date forecasts. Apply appropriate expense, cadence, and date-window checks and show the basis of estimates.
- Return category names for largest expenses and include uncategorized spending in the category breakdown.
- Establish a monetary precision policy. Use exact minor-unit or decimal arithmetic where appropriate and migrate existing values safely if storage changes.
- Do not sum different currencies into a misleading total. Implement a coherent currency policy without a mandatory cloud service.
- Keep analytics finite and structurally valid. Malformed legacy data must not crash any dashboard component.

Required checks: known-answer fixtures for balances, income/expenses, date filters, short/long histories, categories, recurring patterns, rounding, and currency handling.

## Baseline requirements: core user workflows

### 6. Connect rules and settings to persisted state

- Replace hardcoded rules with API-backed create, edit, enable/disable, priority, and delete operations.
- Apply persisted rules in deterministic priority order during import. Validate conditions and regular expressions and bound resource use.
- Load saved settings into form values and preserve them across navigation and reload.
- Replace hardcoded database health with real health information.
- Provide account/category setup and management for a fresh database without requiring demo finance records or direct API calls.
- Correct AI readiness/configuration wording. Configuring a provider must not imply an absent AI backend works.
- Preserve local chat history across navigation and reload, with safe recovery from malformed stored history.

### 7. Recover from errors and enforce input limits

- Apply runtime Zod schemas to API bodies, route parameters, queries, settings, and CSV commit rows. Reject invalid shapes/types before business logic runs.
- Map malformed JSON, oversized bodies/uploads, invalid rows, foreign key failures, and conflicts to consistent, useful 4xx responses.
- Return upload/confirmation failures to an editable or retryable state instead of leaving the UI on a spinner.
- Align CSV file size, row count, confirmation payload, and server body limits. Demonstrate the documented supported import size with a realistic fixture.
- Bound import work and add appropriate rate/resource limits. Load rules once per batch and avoid scanning all transactions for every imported row when an index/map/query can answer the check.
- Remove silent analytics/detection truncation at 100,000 rows or introduce explicit limits that do not misrepresent totals.

### 8. Implement backup, restore, export, and safe purge

- Add working database backup/restore APIs and UI. Use a consistent SQLite backup mechanism that accounts for WAL mode.
- Validate backup format, schema compatibility, and integrity before restoring. Create a recovery backup and replace data safely; failed restore must leave the current database usable.
- Add CSV export with correct quoting, stable documented columns, and protection against spreadsheet formula execution when exported values are opened elsewhere.
- Make purge explicit about the records removed, require confirmation, and provide a backup/recovery path.
- Verify backup/restore and export round trips using disposable data, including corrupt/incompatible input and failure cases.

### 9. Add versioned migrations and proper database lifecycle

- Replace ad hoc startup table creation with tracked, ordered migrations and schema version history.
- Support an empty database and upgrades of the existing database without dropping user records.
- Keep constraints, application types, migrations, and test fixtures consistent through one authoritative process.
- Move CSV persistence queries behind repositories.
- Close server/database connections cleanly on shutdown and in test teardown. Do not leave test databases or WAL sidecars locked by a second application connection.
- Test empty-database initialization, existing-schema upgrades, migration failure, and recovery.

## Baseline requirements: privacy, installation, and Docker delivery

### 10. Enforce local privacy and credential boundaries

- Bind development and local production APIs to loopback by default. Docker port publication must default to loopback too; remote-access modes must be deliberate and documented.
- Enforce appropriate origin/host and request protections for local mutation endpoints. Do not treat CORS as authentication.
- Allowlist non-secret settings. Prevent API keys from entering the finance database or generic settings responses.
- If credential configuration is retained, use a separate local secret/config mechanism with appropriate file permissions and no secret readback, logging, or Git inclusion.
- Handle legacy secret settings safely without printing their contents.
- Serve fonts/assets locally so core runtime operation works without external network requests or telemetry.
- Add `.dockerignore` and Git exclusions for environment files, databases, statement uploads, temporary files, backups, and dependencies.
- Clean uploaded files on success, validation failure, and rejected filenames; define bounded cleanup for abandoned uploads.
- Apply security headers and a suitable CSP to the served application as well as the API.

### 11. Make local installation reproducible

- Provide one root installation flow that installs root, frontend, and backend dependencies. Choose npm workspaces or explicit setup scripts and keep lockfiles coherent.
- Declare/document supported Node/npm versions and native dependency prerequisites.
- Put runtime dependencies such as `better-sqlite3` in the correct dependency group.
- Load environment configuration from a documented location in source and compiled execution, with clear precedence and a safe `.env.example`.
- Provide working root development, build, test, lint, migration, and production-start commands.
- A fresh installation must reach a usable empty ledger using only documented steps. Demo data must be optional.
- Document storage locations, backups, upgrades, troubleshooting, and recovery.

### 12. Deliver working Docker and production serving

- Make root `docker compose up --build` work with a discoverable Compose configuration.
- Serve the built frontend and API in production. Support direct navigation/refresh on application routes while keeping unknown API routes as API errors.
- Persist SQLite and required local configuration in suitable volumes. Verify data survives container restart and rebuild.
- Correct image dependencies/build layout, exclude private files and development artifacts, and use an appropriate non-root runtime user.
- Add health checks and graceful shutdown. Keep database permissions compatible with mounted storage.
- Verify the actual image build and running application, not just Compose syntax or TypeScript compilation.
- Test a fresh project volume, then restart/rebuild against existing synthetic data to verify persistence.
- Document Docker prerequisites and startup/recovery commands. Do not install or reconfigure host Docker tooling as an incidental application change.

## Baseline requirements: release quality and truthful documentation

### 13. Complete accessibility and responsive behavior

- Make navigation and main content usable at narrow widths, including the fixed sidebar, ledger, forms, and dialogs.
- Give dialogs appropriate semantics, focus handling, Escape behavior, and focus return.
- Associate labels/inputs, name icon-only controls, expose validation errors accessibly, and make important actions usable without hover.
- Make advertised drag/drop surfaces handle drops and provide equivalent keyboard/file-picker actions.
- Verify keyboard-only core workflows and representative desktop/mobile viewports while preserving the existing design.

### 14. Establish release checks

- Fix ESLint dependency/configuration resolution so root lint works from a clean installation.
- Add CI for reproducible installation, lint, production builds, backend tests, migrations, and selected browser workflows.
- Add focused regressions for audit failures and browser coverage for import/retry/duplicate review, create/edit/delete, category changes, undo, rules/settings persistence, and backup/restore/export.
- Use disposable databases and synthetic fixtures. Tests must not access real finance records or require cloud AI credentials.
- Audit dependencies and address findings based on actual exposure; avoid unrelated major upgrades without justification.
- Keep dependencies consistent with actual usage and documented architecture.
- Run checks appropriate to each change. Broaden or repeat them when failures or new changes warrant it.

### 15. Align project claims with verified behavior

- Update README, architecture notes, status/resume notes, and related documentation as items are verified.
- Resolve contradictions about migrations, SQL/Drizzle, validation, settings, privacy, setup, and feature completion.
- Correct test counts and add supported CSV examples, API examples, configuration instructions, screenshots, contribution guidance, and security reporting guidance.
- Distinguish delivered capabilities, estimates/heuristics, known limits, and future roadmap items.
- Finish active controls or accurately identify unavailable capabilities. Remove false readiness claims.
- Do not claim every master-spec feature is complete while any required AI integration or explicitly deferred bank adapters, bulk operations, or expanded rules remain unfinished.

## Completion criteria and reporting

For each completed item, record what changed, why, affected files, verification performed, and remaining limitations. Maintain a repair checklist tied to `docs/project-audit.md` so no finding is silently omitted.

Before declaring the local release complete, verify:

1. All reproduced audit failures have passing regression coverage or a documented, verified resolution.
2. Financial calculations match known-answer fixtures and existing user data can migrate without loss.
3. Core workflows work through the real UI and API, including error recovery and refresh behavior.
4. Backup/restore/export work and destructive actions preserve an explicit recovery path.
5. Root install/dev/build/test/lint commands work from the documented starting state.
6. The actual Docker build/start flow serves the application, passes health checks, defaults to local access, and preserves data through restart/rebuild.
7. Core runtime operation works offline and secrets/private files are excluded from generic settings, logs, Git, and image build context.
8. CI, selected browser checks, keyboard interaction, and responsive layouts have been verified.
9. Documentation matches delivered behavior and lists deferred features or checks that could not be run.
10. The optional AI assistant works from Settings through backend retrieval and a provider to a grounded answer, with correct readiness, credentials, consent, cancellation, history, and failure recovery. Report live-provider evidence separately from mocked contract/browser tests.
11. Account/category editing, balance-snapshot updates, ledger sorting/filtering, and the remaining exposed controls work through the real UI and API without regressing the preserved baseline.

The user-deferred environment checks above remain required for full release sign-off, but must not block delivery of the available product work. End this continuation with a precise account of what is implemented and what evidence remains; do not label the release fully complete while deferred gates are unverified.

Never substitute a successful build, backend-only tests, mocked data, or Compose configuration parsing for verification of the full documented product.
