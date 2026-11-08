# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Individuals managing their personal finances who want to record income and expenses, manage accounts, and understand cash flow and spending from a ledger on their own machine.

## Product Purpose

GhostLedger helps a person keep and review a personal finance ledger locally. Success means they can record or import financial activity, understand spending and cash flow, and retain control of their finance records without needing a hosted account or AI service.

## Positioning

GhostLedger is a local-first personal finance ledger. The ledger works without sign-in, a cloud account, or AI. AI analysis is optional, and users choose whether to send bounded ledger context to a cloud provider; a local Ollama option is also supported.

## Operating Context

- The browser interface communicates with a local Express API backed by a local SQLite database. The default API binding is loopback.
- Users can enter transactions manually or import supported CSV statements. Import previews validation, duplicate matches, and category suggestions before an atomic commit; completed imports can be undone.
- The dashboard summarizes cash flow and spending. The ledger supports date and account filters. Settings manages accounts, categories, rules, data ownership actions, and optional AI.
- Users can create SQLite backups, restore a validated backup with a recovery snapshot, export CSV, and purge data after confirmation.
- AI chat can answer questions about bounded ledger context and shows the period, filters, currencies, data cutoff, calculations, and transaction references used. It does not mutate the ledger.

## Capabilities and Constraints

- Manual transaction entry and editing; account and category assignment; categorization rules; CSV preview, duplicate review, commit history, and undo; dashboard analytics; backup, restore, export, and confirmed purge.
- Supported statement layouts are HDFC, Chase, and generic CSV. Ambiguous slash dates are rejected for review; ISO dates are recommended. Other bank adapters are not currently included.
- Account balances are manually maintained snapshots. Adding or editing a transaction does not change them. Net Worth uses active account snapshots, grouped by currency; transactions are not added to those balances. Different currencies remain separate, and an unassigned transaction uses INR.
- Recurring payments and anomaly flags are estimates based on documented heuristics and must be presented as estimates.
- AI starts disabled. Supported providers are OpenAI, Anthropic, Groq, and local Ollama. Cloud AI requires provider-specific consent and sends a question plus bounded ledger context only after the user submits a question. Ollama requests stay on the selected local server.
- AI credentials saved in Settings are held in a private backend credential file, are not returned or stored in SQLite or browser storage, and take precedence over matching environment keys. The app does not require AI for core ledger use.
- A local database and its recovery backups are not an off-device backup. There is no sign-in or built-in user authentication; remote access is an explicit configuration choice.

## Brand Commitments

The product name in use is GhostLedger.

## Evidence on Hand

- The repository's README and implemented application document the local ledger, import, analytics, data ownership, and assistant workflows.
- Statement examples are synthetic. AI provider contracts and the fake-provider browser workflow are not live-provider validation; no live provider result is claimed.
- No customer testimonials, case studies, or externally validated performance claims are documented. Do not invent them.

## Product Principles

- Keep the ledger useful without an account, cloud service, or AI provider.
- Make external sharing of financial context an informed, explicit choice.
- Keep balances and analytics understandable across currencies, and label heuristic results as estimates.
- Preserve user records through reviewable imports, validated restores, and recovery paths for destructive actions.
