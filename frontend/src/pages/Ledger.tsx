function Ledger() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Ledger</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage transactions and imports
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface-raised p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium text-text-primary">Transactions</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                  clipRule="evenodd"
                />
              </svg>
              <input
                type="text"
                placeholder="Search transactions..."
                className="w-64 rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
            </div>
            <button className="rounded-md border border-border bg-surface py-2 px-4 text-sm font-medium text-text-primary hover:bg-surface-overlay transition-colors">
              Import CSV
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="py-3 pr-4 font-medium">Date</th>
                <th className="py-3 pr-4 font-medium">Description</th>
                <th className="py-3 pr-4 font-medium">Category</th>
                <th className="py-3 pr-4 font-medium">Account</th>
                <th className="py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="py-12 text-center text-text-muted">
                  No transactions yet. Import a CSV file to get started.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Ledger;
