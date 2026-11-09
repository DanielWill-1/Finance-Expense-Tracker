# GhostLedger

GhostLedger helps you track personal income, expenses, accounts, and categories on your own computer. You do not need an account to use it.

The app stores your ledger in a local SQLite database. AI features are optional and off until you set them up.

## What you can do

- Record income and expenses, and organize them by account and category.
- Review net worth, date-labeled totals, cash flow, six-month average monthly expenses, exact category amounts by currency, and recent activity.
- Import and export CSV files, and back up or restore your data.
- Switch between light and dark themes. Your choice is saved in your browser profile.
- Use the optional AI Assistant with a cloud provider or a local Ollama model.

## Run GhostLedger from your fork

### Requirements

- Git
- Node.js 20.19.x, or Node.js 22.13 or later in the 22.x line
- npm 10 or newer

On GitHub, fork this repository. Then replace `YOUR-USERNAME` with your GitHub username and run:

```sh
git clone https://github.com/YOUR-USERNAME/Finance-Expense-Tracker.git
cd Finance-Expense-Tracker
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. Keep the terminal open while you use the app. Press Ctrl+C to stop it.

The first run creates an empty database and applies the required migrations. Open Settings to add an account and categories, then start recording transactions.

## Your data

By default, GhostLedger listens only on your computer. The API uses port 3001, and the local SQLite database is saved at `backend/data/ghostledger.db`.

You do not need a `.env` file for the default setup. To change local settings, copy `.env.example` to `.env` in the project folder and edit it. Keep `.env` private and do not commit it.

The ledger stays in the local database. Your browser stores your theme choice and, if you use the AI Assistant, its local chat history. Back up important financial data from Settings.

## Optional AI Assistant

The AI Assistant is off until you configure it.

1. Open Settings and choose AI Assistant.
2. Choose a provider and enter its model name.
3. For OpenAI, Anthropic, or Groq, enter and save your API key.
4. Enable the assistant, review the data consent, save your preferences, and test the connection.

GhostLedger stores a saved API key in a private local file, separate from your ledger and browser storage. After you grant consent and send a question, a cloud provider receives your question, up to six recent chat messages, and the ledger context described in Settings. For Ollama, install and start Ollama, then enter the name of a model you downloaded. Local Ollama does not need an API key or cloud consent.

You can use GhostLedger without configuring AI.

## Run with Docker

Docker is optional. From the project folder, run:

```sh
docker compose up --build
```

Open [http://127.0.0.1:3001](http://127.0.0.1:3001). Stop GhostLedger with:

```sh
docker compose down
```

Docker keeps the database in a named volume. Do not add `-v` to the down command unless you want to delete that data.

## Checks for contributors

Run these commands from the project folder:

```sh
npm run build
npm test
npm run lint
npm run format:check
npm run test:e2e
```

The end-to-end tests use Playwright and a separate test database. Before the first run, install the test browser with `npx playwright install chromium`. For contribution guidance, see [CONTRIBUTING.md](CONTRIBUTING.md). Report security issues using [SECURITY.md](SECURITY.md).

## License

GhostLedger is released under the MIT License. See [LICENSE](LICENSE).
