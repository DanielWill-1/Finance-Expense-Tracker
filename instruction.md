# GhostLedger Implementation Instructions

## HTML Prototype Conversion

Whenever I upload an HTML prototype:

- Treat the HTML as the UI source of truth.
- Preserve spacing, layout, proportions, and hierarchy.
- Do not redesign the interface unless explicitly instructed.
- Convert the HTML into idiomatic React + TypeScript components.
- Extract reusable components when appropriate.
- Replace inline styles with TailwindCSS utility classes.
- Replace imperative JavaScript with React state and hooks.
- Ensure accessibility (ARIA, labels, keyboard navigation).
- Ensure the generated components integrate with the existing project architecture.
- Make all layouts responsive.
- Preserve all visual styling while modernizing the implementation.

## Architecture Enforcement

### Backend

- Always use the layered architecture: routes → controllers → services → repositories → database.
- Never access SQLite directly from routes.
- Business logic belongs inside services only.
- Database queries belong inside repositories only.
- Use Drizzle ORM for all database operations. Avoid raw SQL unless absolutely necessary.
- Use migrations for all schema changes. Never create tables at runtime.
- Validate every input boundary with Zod: API requests, CSV rows, config values, AI outputs.
- Return consistent API response shapes: `{ success: true, data: ... }` or `{ success: false, error: ... }`.

### Frontend

- Use functional components only. No class components.
- Use React hooks for all state and side effects.
- Organize with feature folders: pages/, components/, hooks/, services/, types/, utils/.
- Use React Router for all routing.
- Use TanStack Table for all data tables.
- Use React Hook Form + Zod for all forms.
- Use Recharts for all charts and data visualizations.
- Use react-markdown for all markdown rendering.

### AI Integration

- AI is always optional and disabled by default.
- Use a provider interface pattern: OpenAIProvider, AnthropicProvider, GroqProvider, OllamaProvider.
- Never tightly couple to any single provider.
- Never send the entire database to an AI provider. Use date-range-scoped retrieval.
- Query SQLite → cap results → compact JSON → send to model.

### Security

- Always apply Helmet middleware.
- Always apply rate limiting on AI and import endpoints.
- Always apply Content Security Policy headers.
- Never store API keys in the SQLite database. Use .env.local or secure keychain.
- Sanitize all CSV values before display or export.
- Use parameterized queries. Never concatenate user input into SQL.
- Never commit API keys or secrets.

## Coding Standards

- TypeScript strict mode everywhere. No `any` type.
- Shared interfaces across frontend and backend where possible.
- Reusable types over inline type definitions.
- No placeholder code. No TODOs. No "implement later" comments.
- No pseudo-code. Every file must compile.
- No tutorial code, no demo code. Write production-quality code.
- Choose the cleanest, most maintainable option when multiple approaches exist.
- Dark theme — minimal, dense, professional, developer aesthetic.
- No neumorphism, no glassmorphism, no excessive gradients, no flashy animations.

## Incremental Delivery

For each response:

1. Explain what will be generated.
2. Generate all files completely.
3. Show directory changes.
4. Ensure imports are correct.
5. Ensure code compiles.
6. Wait for approval before continuing.

Never skip files. Never omit code. Never abbreviate. Never truncate.
Maintain consistency across every response.
