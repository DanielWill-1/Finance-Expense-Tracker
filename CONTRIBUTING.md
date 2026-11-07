# Contributing to GhostLedger

Thanks for helping improve GhostLedger. Read `README.md`, `instruction.md`, `docs/architecture.md`, and `docs/project-audit.md` before making changes. The audit lists verified behavior, open release checks, and future scope.

## Set up

Use Node.js 20.19.x or Node.js 22.13.x and later patch releases in that major line, plus npm 10 or newer. `better-sqlite3` may need Python 3 and a C++ build toolchain if a prebuilt binary is unavailable. Install the workspaces from the repository root:

```powershell
Copy-Item .env.example .env
npm ci
```

Do not install dependencies separately in `backend` or `frontend`; the root lockfile is authoritative.

## Before submitting changes

Run the checks that apply to the change:

```powershell
npm run lint
npm run format:check
npm run build
npm test
npm run test:e2e
```

Use synthetic fixtures and disposable database paths. Never run tests or demos against a personal finance database or real bank statement. If a change affects user-facing behavior, update the README or architecture notes and add regression coverage. If a check depends on Docker Engine or hosted CI, record whether it was actually run.

## Implementation expectations

Keep API boundaries validated with Zod, persistence behind repositories, and SQL parameterized. Use the existing TypeScript migrations for schema changes. Preserve local-only defaults and keep credentials, databases, uploads, backups, and `.env` files out of Git. Keep keyboard access, clear errors, and narrow-screen behavior in working flows.

Do not claim support for an import format or feature until it has a synthetic regression fixture and the corresponding workflow has been verified.
