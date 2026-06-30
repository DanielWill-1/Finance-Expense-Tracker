function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Configure GhostLedger to your preferences
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface-raised p-5">
          <h2 className="text-base font-medium text-text-primary">AI Provider</h2>
          <p className="mt-1 text-sm text-text-muted">
            Configure an AI provider for financial analysis
          </p>
          <div className="mt-4 space-y-3">
            <select className="w-full rounded-md border border-border bg-surface py-2 px-3 text-sm text-text-primary focus:border-accent focus:outline-none">
              <option value="">None (disabled)</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="groq">Groq</option>
              <option value="ollama">Ollama (local)</option>
            </select>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface-raised p-5">
          <h2 className="text-base font-medium text-text-primary">Database</h2>
          <p className="mt-1 text-sm text-text-muted">
            Manage your local database and backups
          </p>
          <div className="mt-4 flex gap-3">
            <button className="rounded-md border border-border bg-surface py-2 px-4 text-sm font-medium text-text-primary hover:bg-surface-overlay transition-colors">
              Create Backup
            </button>
            <button className="rounded-md border border-border bg-surface py-2 px-4 text-sm font-medium text-text-primary hover:bg-surface-overlay transition-colors">
              Restore Backup
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface-raised p-5">
          <h2 className="text-base font-medium text-text-primary">Theme</h2>
          <p className="mt-1 text-sm text-text-muted">
            Customize the application appearance
          </p>
          <div className="mt-4">
            <div className="flex items-center gap-3 rounded-md border border-border bg-surface p-3">
              <div className="h-8 w-8 rounded bg-accent" />
              <div>
                <p className="text-sm font-medium text-text-primary">Dark</p>
                <p className="text-xs text-text-muted">Current theme</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface-raised p-5">
          <h2 className="text-base font-medium text-text-primary">Export</h2>
          <p className="mt-1 text-sm text-text-muted">
            Export your financial data
          </p>
          <div className="mt-4">
            <button className="rounded-md border border-border bg-surface py-2 px-4 text-sm font-medium text-text-primary hover:bg-surface-overlay transition-colors">
              Export as CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
