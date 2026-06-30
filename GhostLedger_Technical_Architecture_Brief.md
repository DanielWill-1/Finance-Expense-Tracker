**TECHNICAL ARCHITECTURE BRIEF**

**GhostLedger**

A local-first personal finance application architecture for a portfolio-grade full-stack project

| **Project Type**          | Local-first personal finance tracker with optional AI assistance          |
| ------------------------- | ------------------------------------------------------------------------- |
| **Primary Audience**      | Portfolio reviewers, backend/SWE interviewers, and future contributors    |
| **Recommended Stack**     | React + Vite, Express, TypeScript, SQLite, Drizzle ORM, Zod, Docker       |
| **Architecture Priority** | Simple, privacy-preserving, maintainable, and credible for real-world use |

# **Executive Summary**

GhostLedger should be positioned as a local-first personal finance application that gives users ownership of their financial data while still demonstrating serious backend engineering. The strongest version of the project avoids unnecessary platform complexity, uses SQLite deliberately, keeps AI optional, and presents a clean layered backend that is easy to test, extend, and explain in interviews.

**Recommended Direction**

Build with TypeScript across the stack, SQLite with Drizzle ORM, and a layered Express backend using routes, controllers, services, repositories, and explicit validation boundaries.

# **Project Goals**

The goal is not to create another generic CRUD finance dashboard. The project should tell a stronger engineering story: privacy-first design, reliable local storage, bank statement import, rule-based automation, and optional AI features that operate on only the minimum necessary data.

- Provide a usable local finance tracker for income, expenses, accounts, imports, categories, and recurring transactions.
- Keep the application simple enough to finish, demo, and maintain without turning it into a large SaaS platform.
- Show backend discipline through typed boundaries, migrations, validation, modular services, and testable data access.
- Give the project a clear identity: no account required, no telemetry, no vendor lock-in, and full user control over data.

# **Recommended Technology Stack**

| **Layer**  | **Recommendation**        | **Reason**                                                                                               |
| ---------- | ------------------------- | -------------------------------------------------------------------------------------------------------- |
| Frontend   | React + Vite + TypeScript | Fast local development, clean separation from the API, and less framework overhead than Next.js.         |
| Backend    | Express + TypeScript      | Simple REST API shape, familiar middleware model, and strong interview signal for backend roles.         |
| Database   | SQLite                    | Ideal for a single-user local-first app: fast, durable, portable, zero-install, and easy to back up.     |
| ORM        | Drizzle ORM               | Schema safety, migrations, lightweight TypeScript integration, and less ceremony than heavier ORMs.      |
| Validation | Zod                       | Clear runtime validation for request bodies, CSV rows, AI outputs, and environment/configuration values. |
| Packaging  | Docker                    | Repeatable local setup and a cleaner demo story for reviewers.                                           |

# **Repository Structure**

For the initial version, keep the repository understandable. A frontend/backend split is the best starting point. A larger packages-based monorepo can be introduced later if reusable modules become valuable.

| **Path**  | **Purpose**                                                                                   |
| --------- | --------------------------------------------------------------------------------------------- |
| frontend/ | React + Vite application, route-level pages, components, hooks, and client API wrappers.      |
| backend/  | Express API, services, repositories, database migrations, validation schemas, and middleware. |
| docs/     | Architecture notes, import format documentation, API examples, and project decisions.         |
| docker/   | Dockerfile, compose configuration, and runtime packaging helpers.                             |
| .github/  | CI workflows, issue templates, and contribution automation.                                   |

If the application grows, the future structure can move toward apps/web, apps/server, packages/database, packages/ai, packages/shared, packages/csv-parser, and packages/rules-engine. That refactor should happen after core functionality is stable, not before.

# **Backend Architecture**

The backend should use a layered architecture so each part has a clear responsibility. This makes the code easier to reason about and gives interviewers a concrete example of maintainable service design.

| **Layer**    | **Responsibility**                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| Routes       | Map HTTP methods and paths to controllers. Keep routes thin and declarative.                            |
| Controllers  | Handle request parsing, response status codes, and orchestration of service calls.                      |
| Services     | Own business logic such as categorization, duplicate checks, recurring detection, and import workflows. |
| Repositories | Provide focused database access methods and hide SQL/ORM details from services.                         |
| Database     | Maintain Drizzle schemas, migrations, indexes, constraints, and seed/dev utilities.                     |
| Middleware   | Centralize validation, error handling, rate limiting, security headers, and request logging.            |

Example request flow: POST /transactions -> controller -> TransactionService -> TransactionRepository -> SQLite.

# **Data Architecture**

SQLite is the right database for this problem. The expected usage pattern is a single user, local-first storage, low write contention, and a dataset that is small by database standards. That makes SQLite a deliberate engineering choice rather than a shortcut.

## **Core Entities**

- Account: bank, wallet, card, cash, investment, or custom account metadata.
- Transaction: amount, date, merchant, description, category, account, source import, and user annotations.
- Category: user-editable income and expense taxonomy.
- ImportBatch: imported file name, parser type, row count, success/failure state, and undo support.
- Rule: deterministic categorization rule based on merchant, description, amount, or account conditions.
- RecurringTransaction: detected or confirmed repeating payment pattern.

# **Import and Automation Features**

The CSV importer should be treated as a major feature, not an afterthought. A polished importer is more impressive than a generic dashboard because it shows file processing, validation, error handling, and real user workflow design.

| **Feature**         | **Implementation Notes**                                                                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bank CSV Import     | Support common Indian and international formats such as HDFC, ICICI, SBI, Axis, Chase, and Bank of America. Use parser detection rather than one universal CSV assumption. |
| Import History      | Record each import batch with file name, timestamp, row count, parser, status, and ability to undo imported rows.                                                          |
| Rule Engine         | Allow deterministic IF description/merchant/amount/account conditions THEN category/action rules before invoking AI.                                                       |
| Duplicate Detection | Flag likely duplicates using amount, merchant, timestamp proximity, external IDs, and import batch metadata.                                                               |
| Recurring Detection | Detect subscriptions and bills such as rent, utilities, insurance, gym, Spotify, Netflix, and similar patterns.                                                            |

# **AI Integration Strategy**

AI should remain optional. The application should work fully without AI, support a cloud provider when configured, and optionally support a local model through Ollama. This keeps the privacy story intact while still allowing modern AI features.

| **Mode**     | **Behavior**                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| No AI        | All core finance features continue to work through manual categories, rules, filters, and dashboard views.         |
| Cloud API    | Use a provider abstraction for OpenAI, Anthropic, Groq, or other hosted models when the user supplies credentials. |
| Local Ollama | Enable private local inference for users who prefer not to send financial context to a cloud model.                |

For analysis questions, use lightweight retrieval instead of sending the full database. Determine the relevant time range, query SQLite for the necessary summary and rows, cap the result set, transform it into compact JSON, and send only that context to the selected model.

# **Security and Privacy Requirements**

- Do not store API keys inside the main SQLite finance database. Prefer a separate local config file, .env.local for development, or a secure keychain integration such as keytar.
- Use migrations for schema changes. Avoid uncontrolled table creation at runtime.
- Validate all inputs with Zod, including API requests, CSV rows, configuration values, and AI-generated structured outputs.
- Sanitize CSV values before display or export to reduce CSV injection risk from formula-like content.
- Apply Helmet and a clear Content Security Policy for the local web application.
- Rate-limit AI and import endpoints to protect local resources and avoid accidental API spend.
- Keep backups explicit and user-controlled, especially if the database contains sensitive transaction history.

# **Dashboard Scope**

The dashboard should focus on metrics that help the user understand behavior and take action. Avoid a decorative chart-only experience. Prioritize useful financial views that connect back to transactions, rules, and imports.

| **Dashboard View** | **Purpose**                                                                   |
| ------------------ | ----------------------------------------------------------------------------- |
| Cash Flow          | Show monthly income, expenses, and net movement.                              |
| Monthly Burn Rate  | Expose recurring spending pressure and average monthly expense trend.         |
| Category Breakdown | Help users identify where money is going and which rules may need adjustment. |
| Largest Expense    | Surface outliers for review.                                                  |
| Upcoming Bills     | Use recurring detection to forecast predictable near-term expenses.           |
| Net Worth          | Optional stretch feature if accounts and balances are modeled cleanly.        |

# **Implementation Roadmap**

- Phase 1: Project setup with Vite, Express, TypeScript, linting, formatting, shared environment validation, and Docker development flow.
- Phase 2: SQLite + Drizzle schema, migrations, repositories, basic CRUD for accounts, categories, and transactions.
- Phase 3: CSV import pipeline with parser detection, import history, validation errors, and undo support.
- Phase 4: Rule engine, duplicate detection, recurring transaction detection, and dashboard metrics.
- Phase 5: Optional AI provider abstraction, retrieval-limited finance Q&A, streaming responses, and local Ollama support.
- Phase 6: Testing, documentation, sample data, screenshots, CI, and portfolio README polish.

# **Portfolio and Interview Value**

A well-executed GhostLedger project can stand out because it combines practical product thinking with backend engineering depth. The strongest talking points are not the charts; they are the architecture decisions and the operational details.

| **Signal**               | **What It Demonstrates**                                                            |
| ------------------------ | ----------------------------------------------------------------------------------- |
| Local-first architecture | Product judgment, privacy awareness, and ability to choose the right storage model. |
| SQLite + Drizzle         | Schema design, migrations, type safety, and pragmatic database selection.           |
| CSV ETL pipeline         | File parsing, validation, normalization, error handling, and idempotency.           |
| Layered backend          | Maintainability, testability, and professional API organization.                    |
| Rule engine              | Deterministic automation and domain modeling beyond basic CRUD.                     |
| Optional AI              | Modern AI integration without making the product dependent on a model provider.     |

# **Final Recommendation**

The proposed architecture is strong and should remain intentionally pragmatic. The non-negotiable upgrades are TypeScript throughout the stack, Drizzle ORM with SQLite, and a clean backend layer model. Those choices preserve simplicity while making the project feel professional, credible, and valuable for SWE/backend interviews.

| **Area**             | **Assessment**                                                                      |
| -------------------- | ----------------------------------------------------------------------------------- |
| Architecture         | Excellent fit for a local-first portfolio project.                                  |
| Technology Choices   | Strong, especially with TypeScript and Drizzle added.                               |
| Developer Experience | High, if setup scripts, migrations, seed data, and Docker are documented.           |
| Scalability          | Appropriate for the use case; avoid scaling concerns that do not match the product. |
| Resume Impact        | High, because the project shows real engineering decisions beyond UI CRUD.          |



Overall Roadmap
Phase	Goal	Result
1	Project Foundation	Project compiles and runs
2	Database Layer	SQLite + Drizzle working
3	Backend API	CRUD API complete
4	Frontend Layout	Sidebar + routing + pages
5	Ledger	CSV import + transaction table
6	Dashboard	Charts + analytics
7	AI Assistant	Multi-provider AI
8	Settings	Rules + backup + config
9	Polish	Testing + Docker + optimization
10	Documentation	README + screenshots + release