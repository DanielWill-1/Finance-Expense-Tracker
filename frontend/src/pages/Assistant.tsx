function Assistant() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">AI Assistant</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Ask questions about your finances — AI is optional and disabled by default
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface-raised p-8">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-overlay">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-6 w-6 text-accent"
            >
              <path d="M3.505 2.365A41.369 41.369 0 0 1 9 2c1.863 0 3.697.124 5.495.365 1.247.167 2.18 1.108 2.435 2.268a4.45 4.45 0 0 0-.577-.069 2.165 2.165 0 0 0-1.66.697c-.356.404-.69.955-.897 1.358a2.957 2.957 0 0 0-.296.732 2.657 2.657 0 0 0-.075.346 27.02 27.02 0 0 1-.076.376 3.015 3.015 0 0 1-.194.732.75.75 0 0 1-1.426-.004 4.225 4.225 0 0 1-.284-1.31 8.36 8.36 0 0 1-.04-.854 26.899 26.899 0 0 0-.04-.697 4.658 4.658 0 0 0-.02-.45 2.189 2.189 0 0 0-.573-1.187c-.36-.396-.793-.707-1.33-.71Z" />
              <path d="M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              <path d="M7 10.5a.75.75 0 0 0-.75-.75h-.5a.75.75 0 0 0 0 1.5h.5a.75.75 0 0 0 .75-.75Z" />
              <path d="M13.75 9.75a.75.75 0 0 0 0 1.5h.5a.75.75 0 0 0 0-1.5h-.5Z" />
            </svg>
          </div>
          <h2 className="mt-4 text-base font-medium text-text-primary">
            AI Not Configured
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Configure an AI provider in Settings to enable financial analysis,
            categorization suggestions, and natural language queries.
          </p>
          <div className="mt-6">
            <a
              href="/settings"
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
            >
              Configure AI
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Assistant;
