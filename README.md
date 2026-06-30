# GhostLedger

A local-first personal finance application built for privacy, speed, and developer credibility.

No accounts. No telemetry. No cloud dependency. Your financial data stays on your machine.

---

## Features

- **Local-First** — All data stored in SQLite. No sign-ups, no cloud, no vendor lock-in.
- **Full Ledger** — Income, expenses, accounts, categories, and recurring transactions.
- **CSV Import** — Drag-and-drop bank statement import with automatic parser detection (HDFC, Chase, and extensible bank formats).
- **Rule Engine** — Deterministic auto-categorization rules based on contains, starts with, ends with, or regex matching.
- **Duplicate Detection** — Exact match on amount+date+description, plus fuzzy matching for import safety.
- **Recurring Detection** — Automatically identify subscriptions and repeating bills via merchant grouping and frequency analysis.
- **Smart Dashboard** — Cash flow, category breakdown, largest expenses, upcoming recurring, burn rate, and live Net Worth.
- **Manual Transactions** — Full create/edit modal for individual transaction entry.
- **AI Assistant** — Chat UI with prompt chips. Multi-provider AI backend planned (OpenAI, Anthropic, Groq, Ollama).
- **Import History & Undo** — Track every import batch with one-click undo support.
- **Chat Persistence** — AI chat history survives page navigation via localStorage.
- **Docker Ready** — One-command setup with `docker compose up`.

---

## Technology Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Frontend   | React, Vite, TypeScript, TailwindCSS |
| Backend    | Express, TypeScript                 |
| Database   | SQLite, better-sqlite3 (Drizzle for schema definitions) |
| Validation | Zod                                 |
| Charts     | Recharts                            |
| State      | TanStack Query                      |
| CSV        | PapaParse                           |
| Uploads    | Multer                              |
| Icons      | lucide-react                        |
| Testing    | Vitest, Supertest                   |
| Packaging  | Docker, Docker Compose              |
| Security   | Helmet, CORS, Morgan                |

---

## Architecture

```
GhostLedger/
├── frontend/               # React + Vite + TypeScript + TailwindCSS
│   └── src/
│       ├── pages/          # Route-level page components (Dashboard, Ledger, Assistant, Settings)
│       ├── components/     # Reusable UI (ImportModal, TransactionModal, ImportHistory, Sidebar, ui/)
│       ├── layout/         # AppLayout (sidebar + outlet + status bar)
│       ├── services/       # apiClient (axios), endpoints.ts, chatContext
│       └── types/          # Shared TypeScript interfaces (api.ts)
├── backend/                # Express + TypeScript API (port 3001)
│   └── src/
│       ├── routes/         # 8 route files (health, transactions, categories, accounts, analytics, settings, imports, rules)
│       ├── controllers/    # Request handling and response formatting
│       ├── services/       # Business logic (Transaction, Analytics, RuleEngine, CSVImport, Settings, DuplicateDetection, RecurringDetection, parsers/)
│       ├── repositories/   # Database access (Transaction, Category, Account, Rule, Settings, Import)
│       ├── database/       # SQLite connection, Drizzle schemas, seed/migrate
│       ├── validators/     # Zod schemas for all endpoints
│       ├── middleware/     # errorHandler, notFoundHandler
│       ├── types/          # ApiResponse<T>, PaginatedResponse<T>, HealthStatus
│       ├── utils/          # Logger, errors, response helpers, pagination, constants
│       └── test/           # 6 test files, 28 tests (Vitest + Supertest, isolated DB per file)
├── docker/                 # Dockerfile + docker-compose.yml
├── docs/                   # Architecture notes
├── pages/                  # Original HTML prototypes (not in build)
├── NEXT.md                 # Resume point for next development session
└── package.json            # Root: concurrently runs frontend + backend
```

### Backend Layered Architecture

```
routes → controllers → services → repositories → database
```

- **Routes** — Map HTTP methods and paths. Thin and declarative.
- **Controllers** — Parse requests with Zod, set status codes, orchestrate services.
- **Services** — Business logic: analytics computation, duplicate checks, rule engine, CSV import pipeline.
- **Repositories** — Raw SQL via better-sqlite3 prepared statements. Drizzle ORM schema exists for type definitions only.
- **Database** — SQLite with auto-created tables on startup (CREATE TABLE IF NOT EXISTS).
- **Middleware** — Validation, error handling, not found.

---

## Database Schema (6 tables)

| Table | Key Columns |
|-------|-------------|
| **accounts** | id, name, type (bank/card/cash/wallet/investment), balance, currency, is_active |
| **categories** | id, name, type (income/expense), parent_id (self-ref FK), color, icon |
| **transactions** | id, amount, date, description, merchant, category_id, account_id, type, import_batch_id, is_recurring, notes, external_id |
| **import_batches** | id, filename, imported_at, total_rows, imported_rows, skipped_rows, duplicate_rows, status (preview/completed/rolled_back), parser_type |
| **rules** | id, priority, contains_text, starts_with, ends_with, regex, category_id, enabled |
| **settings** | id, key (unique), value, updated_at |

---

## API Endpoints (36 total)

**Response format (every endpoint):**
```json
{ "success": true, "data": {...} }
{ "success": true, "data": [...], "pagination": { "page", "limit", "total", "totalPages" } }
{ "success": false, "error": { "code": "...", "message": "..." } }
```

| Group | Endpoints |
|-------|-----------|
| Health | `GET /api/health` |
| Transactions | `GET/POST /api/transactions`, `GET/PUT/DELETE /api/transactions/:id` |
| Categories | `GET/POST /api/categories`, `GET/PUT/DELETE /api/categories/:id` |
| Accounts | `GET/POST /api/accounts`, `GET/PUT/DELETE /api/accounts/:id` |
| Analytics | `GET /api/analytics/summary`, `/monthly`, `/weekly`, `/categories`, `/spending-trends`, `/largest-expenses`, `/top-merchants`, `/recurring`, `/upcoming-recurring` |
| Settings | `GET/PUT /api/settings` |
| Import | `POST /api/import` (multipart CSV), `POST /api/import/:id/confirm`, `POST /api/import/:id/undo`, `GET /api/import/history`, `GET /api/import/history/:id` |
| Rules | `GET/POST /api/rules`, `PUT/DELETE /api/rules/:id` |

---

## CSV Import Pipeline

1. **Upload** — Drag-and-drop or file picker, 50MB max, CSV only
2. **Parse** — Bank format auto-detection (HDFC → Chase → Generic fallback), PapaParse with header mapping
3. **Preview** — Full row-by-row preview with validation errors, duplicate flags, rule engine category suggestions
4. **Review** — Edit descriptions inline, review duplicates/errors before committing
5. **Validate** — Backend re-validates every row (date format, non-empty description, positive amount, valid type) — throws named ValidationError
6. **Commit** — Transactional SQLite insert (all-or-nothing)
7. **Undo** — One-click rollback deletes all transactions from the batch

---

## AI Integration Strategy (Planned)

AI is **optional** and **disabled by default**. The chat UI exists with prompt chips and message persistence. Backend AI providers are planned for Phase 8.

| Mode         | Behavior |
| ------------ | -------- |
| No AI        | All features work via manual categories, rules, filters, and dashboard views. |
| Cloud API    | Provider abstraction for OpenAI, Anthropic, Groq when user supplies credentials. |
| Local Ollama | Private local inference for users who prefer not to send financial context to a cloud provider. |

---

## Getting Started

```bash
# Root (runs both servers via concurrently)
npm install
npm run dev

# Or run individually
cd backend && npm install && npm run dev    # http://localhost:3001
cd frontend && npm install && npm run dev   # http://localhost:5173
```

### Docker

```bash
docker compose up
```

---

## Testing

```bash
cd backend && npm test    # 28 tests across 6 files, all passing
# Frontend: TypeScript strict compiles clean, Vite builds successfully
```

---

## Implementation Status

| Phase | Goal | Status |
|-------|------|--------|
| 1 | Project Foundation | ✅ Vite + Express + TypeScript + Docker |
| 2 | Database Layer | ✅ SQLite + Drizzle schemas + auto-create tables |
| 3 | Backend API | ✅ Full CRUD for all entities |
| 4 | Frontend Layout | ✅ Sidebar + routing + page shells |
| 5 | Ledger + CSV Import | ✅ Import pipeline + transaction table + history + undo |
| 6 | Dashboard + Analytics | ✅ Charts + summary + recurring + largest expenses |
| 7 | Rule Engine + Duplicates + Recurring | ✅ Auto-categorization + exact/fuzzy dedup + subscription detection |
| 8 | AI Assistant | ⚠️ Chat UI done, no backend AI providers yet |
| 9 | Settings (backup/restore/export) | ⚠️ LLM config + rules UI done, no backup/restore/export |
| 10 | Polish (tests, Docker, docs, CI) | ❌ Not started |

**Recent fixes (audit):** Dashboard null-safety, CSV validation hardening, Add Transaction modal, live Net Worth in sidebar, chat persistence via localStorage.

---

## Design System

- **Dark theme** — Minimal, dense, professional, developer aesthetic.
- **Color palette** — Background `#051424`, accent `#00e1ab`, text `#d4e4fa`, borders `#3a4a43`
- **Sidebar** — Persistent left sidebar: Dashboard, Ledger, AI Assistant, Settings. Live Net Worth display.
- **Typography** — JetBrains Mono for data, Inter/system for UI labels.
- No neumorphism, glassmorphism, or excessive gradients.

---

## License

MIT — see [LICENSE](./LICENSE) for details.

