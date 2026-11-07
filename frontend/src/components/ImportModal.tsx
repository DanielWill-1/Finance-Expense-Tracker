import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { uploadCSV, confirmImport, fetchAccounts, fetchCategories } from '../services/endpoints';
import { X, CloudUpload, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { invalidateFinanceQueries } from '../services/queryInvalidation';
import { useDialogAccessibility } from '../hooks/useDialogAccessibility';

interface ImportModalProps {
  onClose: () => void;
  initialFile?: File | null;
}

interface PreviewData {
  batchId: number;
  filename: string;
  parserUsed: string;
  totalRows: number;
  validRows: Array<{
    index: number;
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    merchant: string;
    externalId: string | null;
    suggestedCategoryId: number | null;
    suggestedCategoryName: string | null;
    matchedRule: string | null;
    isDuplicate: boolean;
    duplicateReason: string;
    validationErrors: string[];
  }>;
  invalidRows: Array<{ row: number; message: string }>;
  duplicateRows: number;
  uncategorizedRows: number;
  summary: {
    totalAmount: number;
    incomeCount: number;
    expenseCount: number;
    incomeTotal: number;
    expenseTotal: number;
  };
}

export function ImportModal({ onClose, initialFile }: ImportModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handledInitialFile = useRef<File | null>(null);
  useDialogAccessibility(dialogRef, onClose);
  const [step, setStep] = useState<'upload' | 'previewing' | 'preview' | 'importing' | 'done'>(
    'upload',
  );
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [rowEdits, setRowEdits] = useState<
    Record<number, { categoryId?: number | null; description?: string; keepDuplicate?: boolean }>
  >({});
  const [accountId, setAccountId] = useState('');
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    duplicates: number;
  } | null>(null);

  const queryClient = useQueryClient();
  const { data: accountsRes } = useQuery({ queryKey: ['accounts-all'], queryFn: fetchAccounts });
  const { data: categoriesRes } = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => fetchCategories(),
  });

  const uploadMutation = useMutation({
    mutationFn: uploadCSV,
    onSuccess: (res: unknown) => {
      const r = res as { data: PreviewData };
      setPreview(r.data);
      setStep('preview');
    },
    onError: (err: Error & { response?: { data?: { error?: { message?: string } } } }) => {
      setError(err.response?.data?.error?.message || 'Failed to upload and parse CSV');
      setStep('upload');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: ({
      batchId,
      rows,
      accountId: selectedAccountId,
    }: {
      batchId: number;
      rows: Record<string, unknown>[];
      accountId?: number;
    }) => confirmImport(batchId, rows, selectedAccountId),
    onSuccess: (res: unknown) => {
      queryClient.invalidateQueries({ queryKey: ['import-history'] });
      invalidateFinanceQueries(queryClient);
      const response = res as { data: { imported: number; skipped: number; duplicates: number } };
      setResult(response.data);
      setStep('done');
    },
    onError: (err: Error & { response?: { data?: { error?: { message?: string } } } }) => {
      setError(
        err.response?.data?.error?.message || 'Import failed. Review the rows and try again.',
      );
      setStep('preview');
    },
  });

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setError('Only CSV files are allowed');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('CSV files must be no larger than 5 MB');
        return;
      }
      setError('');
      setStep('previewing');
      uploadMutation.mutate(file);
    },
    [uploadMutation.mutate],
  );

  useEffect(() => {
    if (!initialFile || handledInitialFile.current === initialFile) return;
    handledInitialFile.current = initialFile;
    handleFile(initialFile);
  }, [handleFile, initialFile]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  function handleConfirm() {
    if (!preview) return;
    const rows = preview.validRows
      .filter((r) => r.validationErrors.length === 0)
      .map((r) => {
        const edits = rowEdits[r.index];
        return {
          date: r.date,
          description: edits?.description ?? r.description,
          amount: r.amount,
          type: r.type,
          merchant: r.merchant,
          categoryId: edits?.categoryId !== undefined ? edits.categoryId : r.suggestedCategoryId,
          externalId: r.externalId,
          keepDuplicate: edits?.keepDuplicate ?? false,
        };
      });
    setStep('importing');
    confirmMutation.mutate({
      batchId: preview.batchId,
      rows,
      accountId: accountId ? Number(accountId) : undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-dialog-title"
        tabIndex={-1}
        className="bg-surface-container-lowest border border-outline-variant rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/50">
          <h2 id="import-dialog-title" className="text-lg font-medium text-on-surface">
            Import Transactions
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close import dialog"
            className="text-on-surface-variant hover:text-on-surface"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="mx-6 mt-4 p-3 bg-error-container/20 border border-error/30 rounded text-error text-sm flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' || step === 'previewing' ? (
            <div
              className={`border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-primary-fixed-dim bg-primary-fixed-dim/5'
                  : 'border-outline-variant hover:border-primary-fixed-dim/50'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              role="button"
              tabIndex={0}
              aria-label="Choose a CSV file or drop it to import"
              data-dialog-initial-focus
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              {step === 'previewing' ? (
                <>
                  <Loader2 className="h-10 w-10 animate-spin text-primary-fixed-dim mb-4" />
                  <p className="text-on-surface">Parsing CSV...</p>
                </>
              ) : (
                <>
                  <CloudUpload className="h-10 w-10 text-primary-fixed-dim mb-4" />
                  <h3 className="text-lg font-medium text-on-surface mb-2">Drop CSV file here</h3>
                  <p className="text-sm text-on-surface-variant mb-4">or click to browse</p>
                  <span className="text-xs text-on-surface-variant uppercase tracking-wider">
                    Max 5 MB · CSV only · 25,000 rows
                  </span>
                </>
              )}
              <input
                ref={fileInputRef}
                id="csv-file-input"
                type="file"
                accept=".csv"
                aria-label="Choose a CSV file"
                tabIndex={-1}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.currentTarget.value = '';
                  if (f) handleFile(f);
                }}
                className="sr-only"
              />
            </div>
          ) : step === 'preview' && preview ? (
            <div className="space-y-4">
              <label className="flex items-center gap-3 text-sm text-on-surface-variant">
                <span>Account</span>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="rounded border border-outline-variant bg-surface-container-low px-3 py-2 text-on-surface"
                >
                  <option value="">No account</option>
                  {(accountsRes?.data ?? []).map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.currency})
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-col gap-2 text-sm font-mono md:flex-row md:items-center md:justify-between">
                <span className="text-on-surface-variant">
                  Parser: <span className="text-on-surface">{preview.parserUsed}</span>
                </span>
                <span className="text-on-surface-variant">
                  File: <span className="text-on-surface">{preview.filename}</span>
                </span>
                <span className="text-on-surface-variant">
                  {preview.summary.incomeCount} income / {preview.summary.expenseCount} expense
                </span>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-surface border-b border-outline-variant text-xs text-on-surface-variant uppercase tracking-wider sticky top-0">
                      <th className="py-2 px-3 font-normal">Date</th>
                      <th className="py-2 px-3 font-normal">Description</th>
                      <th className="py-2 px-3 font-normal">Amount</th>
                      <th className="py-2 px-3 font-normal">Category</th>
                      <th className="py-2 px-3 font-normal">Review</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono divide-y divide-outline-variant/30">
                    {preview.validRows.map((row) => (
                      <tr
                        key={row.index}
                        className={row.validationErrors.length > 0 ? 'bg-error-container/10' : ''}
                      >
                        <td className="py-2 px-3">
                          <span>{row.date}</span>
                          <span className="block text-xs text-on-surface-variant">
                            Row {row.index}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            aria-label={`Description for CSV row ${row.index}`}
                            value={rowEdits[row.index]?.description ?? row.description}
                            onChange={(e) =>
                              setRowEdits({
                                ...rowEdits,
                                [row.index]: {
                                  ...rowEdits[row.index],
                                  description: e.target.value,
                                },
                              })
                            }
                            className="w-full bg-transparent border-b border-outline-variant/50 py-0.5 text-on-surface focus:border-primary-fixed-dim focus:outline-none"
                          />
                        </td>
                        <td
                          className={`py-2 px-3 tabular-nums ${row.type === 'income' ? 'text-primary-fixed-dim' : 'text-error'}`}
                        >
                          {row.type === 'income' ? '+' : '-'}
                          {row.amount.toFixed(2)}
                        </td>
                        <td className="py-2 px-3">
                          {row.matchedRule && (
                            <span className="text-xs text-primary-fixed-dim">
                              {row.matchedRule}
                            </span>
                          )}
                          <select
                            aria-label={`Category for CSV row ${row.index}`}
                            value={
                              rowEdits[row.index]?.categoryId === undefined
                                ? (row.suggestedCategoryId ?? '')
                                : (rowEdits[row.index]?.categoryId ?? '')
                            }
                            onChange={(event) =>
                              setRowEdits({
                                ...rowEdits,
                                [row.index]: {
                                  ...rowEdits[row.index],
                                  categoryId: event.target.value
                                    ? Number(event.target.value)
                                    : null,
                                },
                              })
                            }
                            className="mt-1 w-full rounded border border-outline-variant bg-surface-container-low px-2 py-1 text-xs text-on-surface"
                          >
                            <option value="">Uncategorized</option>
                            {(categoriesRes?.data ?? [])
                              .filter((category) => category.type === row.type)
                              .map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          {row.validationErrors.length > 0 ? (
                            <span className="text-xs text-error">
                              {row.validationErrors.join(', ')}
                            </span>
                          ) : row.isDuplicate ? (
                            <label className="flex items-center gap-2 text-xs text-yellow-400">
                              <input
                                type="checkbox"
                                checked={rowEdits[row.index]?.keepDuplicate ?? false}
                                onChange={(e) =>
                                  setRowEdits({
                                    ...rowEdits,
                                    [row.index]: {
                                      ...rowEdits[row.index],
                                      keepDuplicate: e.target.checked,
                                    },
                                  })
                                }
                              />
                              Keep duplicate
                            </label>
                          ) : (
                            <span className="text-xs text-primary-fixed-dim">Ready</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.invalidRows.length > 0 && (
                <div className="rounded border border-error/30 bg-error-container/10 p-3 text-sm">
                  <p className="mb-2 font-medium text-error">Rows that could not be parsed</p>
                  <ul className="space-y-1 text-on-surface-variant">
                    {preview.invalidRows.map((row, i) => (
                      <li key={`${row.row}-${i}`}>
                        Row {row.row}: {row.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : step === 'importing' ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary-fixed-dim" />
              <span className="ml-3 text-on-surface-variant">Importing transactions...</span>
            </div>
          ) : step === 'done' ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Check className="h-12 w-12 text-primary-fixed-dim mb-4" />
              <h3 className="text-lg font-medium text-on-surface">Import Complete</h3>
              <p className="text-sm text-on-surface-variant mt-2">
                Imported {result?.imported ?? 0}, skipped {result?.skipped ?? 0}, duplicate matches{' '}
                {result?.duplicates ?? 0}.
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2 bg-primary-fixed-dim text-on-primary rounded font-mono text-sm"
              >
                Close
              </button>
            </div>
          ) : null}
        </div>

        {step === 'preview' && preview && (
          <div className="border-t border-outline-variant/50 p-4 flex flex-col gap-4 bg-surface-container-low md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-4 text-sm text-on-surface-variant font-mono">
              <span>
                {preview.validRows.filter((r) => r.validationErrors.length === 0).length} valid
              </span>
              <span className="text-error">{preview.duplicateRows} duplicates</span>
              <span className="text-yellow-400">{preview.uncategorizedRows} uncategorized</span>
              <span className="text-error">
                {preview.invalidRows.length +
                  preview.validRows.filter((r) => r.validationErrors.length > 0).length}{' '}
                errors
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-outline-variant text-on-surface rounded font-mono text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={
                  confirmMutation.isPending ||
                  preview.validRows.every((r) => r.validationErrors.length > 0)
                }
                className="px-4 py-2 bg-primary-fixed-dim text-on-primary rounded font-mono text-sm disabled:opacity-50"
              >
                Import Transactions
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
