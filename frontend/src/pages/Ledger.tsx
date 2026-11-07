import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useRef } from 'react';
import { fetchTransactions, fetchCategories, deleteTransaction } from '../services/endpoints';
import { Card } from '../components/ui/Card';
import { Pagination } from '../components/ui/Pagination';
import { LoadingSpinner, ErrorState, EmptyState } from '../components/ui/States';
import { Search, CloudUpload, Edit3, Trash2, Filter, AlertTriangle } from 'lucide-react';
import type { Transaction } from '../types/api';
import { ImportModal } from '../components/ImportModal';
import { ImportHistory } from '../components/ImportHistory';
import { TransactionModal } from '../components/TransactionModal';
import { invalidateFinanceQueries } from '../services/queryInvalidation';

const PAGE_SIZE = 25;

export default function Ledger() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [actionError, setActionError] = useState('');

  const queryClient = useQueryClient();

  const { data: categoriesRes } = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => fetchCategories(),
  });

  const filters = useMemo(() => {
    const f: Record<string, string | number> = {
      page: String(page),
      limit: String(PAGE_SIZE),
      sortBy: 'date',
      sortOrder: 'desc',
    };
    if (search) f.search = search;
    if (typeFilter) f.type = typeFilter;
    if (categoryFilter) f.categoryId = Number(categoryFilter);
    return f;
  }, [search, typeFilter, categoryFilter, page]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () =>
      fetchTransactions(
        filters as Record<string, string | number> & { page?: number; limit?: number },
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTransaction(id),
    onSuccess: () => invalidateFinanceQueries(queryClient),
    onError: (error: Error) => setActionError(error.message || 'Could not delete transaction'),
  });

  const categories = categoriesRes?.data ?? [];
  const transactions = data?.data ?? [];
  const pagination = data?.pagination;

  function formatCurrency(n: number, currency = 'INR') {
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(n);
    } catch {
      return `${currency} ${n.toFixed(2)}`;
    }
  }

  return (
    <div className="p-margin-mobile md:p-margin-desktop space-y-6">
      {showImport && (
        <ImportModal
          initialFile={importFile}
          onClose={() => {
            setShowImport(false);
            setImportFile(null);
          }}
        />
      )}
      {editingTransaction && (
        <TransactionModal
          editTransaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
        />
      )}
      {actionError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded border border-error/30 bg-error-container/10 p-3 text-sm text-error"
        >
          <AlertTriangle className="h-4 w-4" />
          {actionError}
          <button className="ml-auto underline" onClick={() => setActionError('')}>
            Dismiss
          </button>
        </div>
      )}
      <CSVUploadZone
        onFileSelected={(file) => {
          setImportFile(file);
          setShowImport(true);
        }}
      />
      <Card>
        <div className="p-6 pb-4 border-b border-outline-variant/50">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-lg font-medium text-on-surface">Master Ledger</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
                <input
                  type="text"
                  placeholder="Search ledger..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full sm:w-64 bg-surface-container-low border border-outline-variant rounded py-1.5 pl-9 pr-4 font-mono text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary-fixed-dim transition-colors"
                />
              </div>
              <Filter className="h-4 w-4 text-on-surface-variant" />
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-surface-container-low border border-outline-variant text-on-surface font-mono text-sm py-1.5 pl-3 pr-8 rounded focus:outline-none focus:border-primary-fixed-dim cursor-pointer appearance-none"
              >
                <option value="">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-surface-container-low border border-outline-variant text-on-surface font-mono text-sm py-1.5 pl-3 pr-8 rounded focus:outline-none focus:border-primary-fixed-dim cursor-pointer appearance-none"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorState message="Failed to load transactions" onRetry={() => refetch()} />
        ) : transactions.length === 0 ? (
          <EmptyState
            title="No transactions found"
            description="Import a CSV file to get started, or adjust your filters."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="py-3 px-4 text-xs text-on-surface-variant uppercase tracking-wider font-normal">
                      Date
                    </th>
                    <th className="py-3 px-4 text-xs text-on-surface-variant uppercase tracking-wider font-normal">
                      Description
                    </th>
                    <th className="py-3 px-4 text-xs text-on-surface-variant uppercase tracking-wider font-normal">
                      Category
                    </th>
                    <th className="py-3 px-4 text-xs text-on-surface-variant uppercase tracking-wider font-normal">
                      Account
                    </th>
                    <th className="py-3 px-4 text-xs text-on-surface-variant uppercase tracking-wider font-normal text-right">
                      Amount
                    </th>
                    <th className="py-3 px-4 text-xs text-on-surface-variant uppercase tracking-wider font-normal w-20 text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="font-mono text-sm divide-y divide-outline-variant/50">
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-surface-container-high/30 transition-colors group"
                    >
                      <td className="py-3 px-4 text-on-surface-variant">{tx.date}</td>
                      <td className="py-3 px-4">{tx.description}</td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-1 bg-surface-container-high border border-outline-variant rounded text-xs">
                          {tx.category_name ||
                            (tx.category_id ? `#${tx.category_id}` : 'Uncategorized')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant">
                        {tx.account_name || '—'}
                      </td>
                      <td
                        className={`py-3 px-4 text-right tabular-nums ${tx.type === 'income' ? 'text-primary-fixed-dim' : 'text-error'}`}
                      >
                        {tx.type === 'income' ? '+' : '-'}
                        {formatCurrency(tx.amount, tx.account_currency ?? 'INR')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            aria-label={`Edit ${tx.description}`}
                            onClick={() => setEditingTransaction(tx)}
                            className="text-on-surface-variant hover:text-primary-fixed-dim p-1"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            aria-label={`Delete ${tx.description}`}
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete “${tx.description}”? This removes the ledger entry.`,
                                )
                              ) {
                                setActionError('');
                                deleteMutation.mutate(tx.id);
                              }
                            }}
                            className="text-on-surface-variant hover:text-error p-1 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination && (
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                limit={pagination.limit}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </Card>
      <ImportHistory />
    </div>
  );
}

function CSVUploadZone({ onFileSelected }: { onFileSelected: (file: File) => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <div
      role="group"
      aria-label="CSV file import"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (file) onFileSelected(file);
      }}
      className="border border-dashed border-outline-variant rounded-lg bg-surface-container-lowest p-8 flex flex-col items-center justify-center text-center hover:border-primary-fixed-dim/50 transition-colors group relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-primary-fixed-dim/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="w-16 h-16 rounded-full bg-surface-container-low border border-outline-variant flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <CloudUpload className="h-8 w-8 text-primary-fixed-dim" />
      </div>
      <h3 className="text-lg font-medium text-on-surface mb-2">Drop a CSV file</h3>
      <p className="text-sm text-on-surface-variant max-w-md mx-auto mb-4">
        Import a supported bank statement or a generic CSV with date, description, and amount
        columns.
      </p>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="px-4 py-2 border border-outline-variant text-on-surface font-mono text-sm rounded hover:bg-surface-container-low transition-colors"
        >
          Select CSV
        </button>
        <span className="text-xs text-on-surface-variant uppercase tracking-wider">
          CSV up to 5 MB · 25,000 rows max
        </span>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        aria-label="Choose CSV file"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFileSelected(file);
          event.currentTarget.value = '';
        }}
      />
    </div>
  );
}
