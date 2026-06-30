function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Overview of your financial activity
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Net Worth', value: '—' },
          { label: 'Income', value: '—' },
          { label: 'Expenses', value: '—' },
          { label: 'Savings', value: '—' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border bg-surface-raised p-5"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
              {stat.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-text-primary">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface-raised p-5">
          <h2 className="text-base font-medium text-text-primary">Cash Flow</h2>
          <div className="mt-6 flex h-48 items-center justify-center text-sm text-text-muted">
            Chart area — available in Phase 6
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface-raised p-5">
          <h2 className="text-base font-medium text-text-primary">Category Breakdown</h2>
          <div className="mt-6 flex h-48 items-center justify-center text-sm text-text-muted">
            Chart area — available in Phase 6
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
