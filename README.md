# GhostLedger

A local-first personal finance application built for privacy, speed, and developer credibility.

No accounts. No telemetry. No cloud dependency. Your financial data stays on your machine.

---

## Features

- **Local-First** — All data stored in SQLite. No sign-ups, no cloud, no vendor lock-in.
- **Full Ledger** — Income, expenses, accounts, categories, and recurring transactions.
- **CSV Import** — Drag-and-drop bank statement import with automatic parser detection (HDFC, ICICI, SBI, Axis, Chase, Bank of America, and more).
- **Rule Engine** — Deterministic auto-categorization rules based on merchant, description, amount, or account.
- **Duplicate Detection** — Flag likely duplicates using amount, merchant, timestamp proximity, and import batch metadata.
- **Recurring Detection** — Automatically identify subscriptions and repeating bills.
- **Smart Dashboard** — Cash flow, burn rate, category breakdown, largest expenses, upcoming bills, and net worth.
- **Optional AI Assistant** — Multi-provider AI (OpenAI, Anthropic, Groq, Ollama) with privacy-preserving data retrieval.
- **Import History & Undo** — Track every import batch with full undo support.
- **Docker Ready** — One-command setup with `docker compose up`.

---

## Technology Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Frontend   | React, Vite, TypeScript, TailwindCSS |
| Backend    | Express, TypeScript                 |
| Database   | SQLite, Drizzle ORM                 |
| Validation | Zod                                 |
| Charts     | Recharts                            |
| Tables     | TanStack Table                      |
| Forms      | React Hook Form                     |
| CSV        | PapaParse                           |
| Markdown   | react-markdown                      |
| Testing    | Vitest, Supertest                   |
| Packaging  | Docker, Docker Compose              |
| Security   | Helmet, CSP, Rate Limiting          |

---

## Architecture

```
GhostLedger/
├── frontend/          # React + Vite + TypeScript + TailwindCSS
│   ├── pages/         # Route-level page components
│   ├── components/    # Reusable UI components
│   ├── hooks/         # Custom React hooks
│   ├── services/      # API client wrappers
│   ├── types/         # Shared TypeScript interfaces
│   └── utils/         # Utility functions
├── backend/           # Express + TypeScript API
│   ├── routes/        # Thin route declarations
│   ├── controllers/   # Request handling and response formatting
│   ├── services/      # Business logic layer
│   ├── repositories/  # Database access (Drizzle ORM)
│   ├── database/      # Schemas, migrations, seeds
│   └── middleware/     # Validation, error handling, security
├── docs/              # Architecture notes, API docs
├── docker/            # Dockerfile and compose configuration
└── .github/           # CI workflows, issue templates
```

### Backend Layered Architecture

```
routes → controllers → services → repositories → database
```

- **Routes** — Map HTTP methods and paths. Thin and declarative.
- **Controllers** — Parse requests, set status codes, orchestrate services.
- **Services** — Business logic: categorization, duplicate checks, import workflows.
- **Repositories** — Focused database access. Hide SQL/ORM from services.
- **Database** — Drizzle schemas, migrations, indexes, constraints.
- **Middleware** — Validation, error handling, rate limiting, security headers.

---

## Core Data Entities

- **Account** — Bank, wallet, card, cash, investment, or custom account metadata.
- **Transaction** — Amount, date, merchant, description, category, account, import source.
- **Category** — User-editable income and expense taxonomy.
- **ImportBatch** — File name, parser type, row count, status, undo support.
- **Rule** — Deterministic categorization rules (IF conditions THEN category/action).
- **RecurringTransaction** — Detected or confirmed repeating payment patterns.

---

## AI Integration Strategy

AI is **optional** and **disabled by default**. The application works fully without it.

| Mode         | Behavior                                                                                        |
| ------------ | ----------------------------------------------------------------------------------------------- |
| No AI        | All features work via manual categories, rules, filters, and dashboard views.                   |
| Cloud API    | Provider abstraction for OpenAI, Anthropic, Groq when user supplies credentials.                |
| Local Ollama | Private local inference for users who prefer not to send financial context to a cloud provider. |

### AI Safety

Never send the entire database to an AI provider. Instead:

1. Parse the user's question to determine relevant date range.
2. Query SQLite for only necessary summary and rows.
3. Cap the result set.
4. Transform into compact JSON.
5. Send only that context to the selected model.

---

## Security & Privacy

- No API keys stored in the main database. Use `.env.local` or secure keychain.
- Schema changes via migrations only — no runtime table creation.
- All inputs validated with Zod: API requests, CSV rows, config values, AI outputs.
- CSV values sanitized before display to prevent CSV injection.
- Helmet and Content Security Policy enforced.
- Rate limiting on AI and import endpoints.
- Backups are explicit and user-controlled.
- No analytics, no telemetry, no external calls unless explicitly configured.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Docker (optional)

### Development

```bash
# Clone the repository
git clone https://github.com/your-username/ghostledger.git
cd ghostledger

# Install frontend dependencies
cd frontend
npm install
npm run dev

# Install backend dependencies (in a separate terminal)
cd backend
npm install
npm run dev
```

### Docker

```bash
docker compose up
```

SQLite data is stored in a mounted volume — survives container rebuilds.

---

## Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

Uses Vitest for unit tests and integration tests. Supertest for API testing.

---

## Dashboard Views

| View               | Purpose                                                      |
| ------------------ | ------------------------------------------------------------ |
| Cash Flow          | Monthly income, expenses, and net movement.                  |
| Monthly Burn Rate  | Recurring spending pressure and average monthly expense trend. |
| Category Breakdown | Where money goes and which rules need adjustment.            |
| Largest Expense    | Outlier transactions for review.                             |
| Upcoming Bills     | Forecasted near-term expenses from recurring detection.      |
| Net Worth          | Accounts and balances modeled cleanly.                       |

---

## Implementation Roadmap

| Phase | Goal                 | Result                           |
| ----- | -------------------- | -------------------------------- |
| 1     | Project Foundation   | Vite + Express + TypeScript + Docker |
| 2     | Database Layer       | SQLite + Drizzle schema + migrations |
| 3     | Backend API          | Full CRUD for all entities       |
| 4     | Frontend Layout      | Sidebar + routing + page shells  |
| 5     | Ledger               | CSV import + transaction table   |
| 6     | Dashboard            | Charts + analytics views         |
| 7     | AI Assistant         | Multi-provider AI abstraction    |
| 8     | Settings             | Rules + backup + config          |
| 9     | Polish               | Testing + Docker + optimization  |
| 10    | Documentation        | README + screenshots + release   |

---

## Design System

- **Dark theme** — Minimal, dense, professional, developer aesthetic.
- **Focus** — Readability, information density, speed.
- **Sidebar** — Persistent left sidebar: Dashboard, Ledger, AI Assistant, Settings.
- No neumorphism, glassmorphism, or excessive gradients.

---

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Run tests: `npm test`
5. Submit a pull request.

Ensure code follows the project's TypeScript strict mode, layered architecture, and no-placeholder philosophy.

---

## License

MIT — see [LICENSE](./LICENSE) for details.

---

## Portfolio & Interview Value

GhostLedger demonstrates real engineering decisions beyond basic CRUD:

- **Local-first architecture** — Product judgment and privacy awareness.
- **SQLite + Drizzle** — Schema design, migrations, type-safe database access.
- **CSV ETL pipeline** — File parsing, validation, normalization, idempotency.
- **Layered backend** — Maintainable, testable, professional API organization.
- **Rule engine** — Deterministic automation and domain modeling.
- **Optional AI** — Modern AI integration without vendor dependency.
