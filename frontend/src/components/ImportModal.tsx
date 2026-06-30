import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadCSV, confirmImport } from '../services/endpoints';
import { X, CloudUpload, AlertTriangle, Check, Loader2 } from 'lucide-react';

interface ImportModalProps {
  onClose: () => void;
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

export function ImportModal({ onClose }: ImportModalProps) {
  const [step, setStep] = useState<'upload' | 'previewing' | 'preview' | 'importing' | 'done'>('upload');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [rowEdits, setRowEdits] = useState<Record<number, { categoryId?: number | null; description?: string }>>({});

  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: uploadCSV,
    onSuccess: (res: unknown) => {
      const r = res as { data: PreviewData };
      setPreview(r.data);
      setStep('preview');
    },
    onError: () => setError('Failed to upload and parse CSV'),
  });

  const confirmMutation = useMutation({
    mutationFn: ({ batchId, rows }: { batchId: number; rows: Record<string, unknown>[] }) =>
      confirmImport(batchId, rows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['import-history'] });
      setStep('done');
    },
    onError: (err: Error) => setError(err.message || 'Import failed'),
  });

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      setError('Only CSV files are allowed');
      return;
    }
    setError('');
    setStep('previewing');
    uploadMutation.mutate(file);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  function handleConfirm() {
    if (!preview) return;
    const rows = preview.validRows
      .filter((r) => r.validationErrors.length === 0)
      .map((r) => ({
        date: r.date,
        description: rowEdits[r.index]?.description ?? r.description,
        amount: r.amount,
        type: r.type,
        merchant: r.merchant,
        categoryId: rowEdits[r.index]?.categoryId ?? r.suggestedCategoryId,
      }));
    setStep('importing');
    confirmMutation.mutate({ batchId: preview.batchId, rows });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/50">
          <h2 className="text-lg font-medium text-on-surface">Import Transactions</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-error-container/20 border border-error/30 rounded text-error text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' || step === 'previewing' ? (
            <div
              className={`border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                dragOver ? 'border-primary-fixed-dim bg-primary-fixed-dim/5' : 'border-outline-variant hover:border-primary-fixed-dim/50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => document.getElementById('csv-file-input')?.click()}
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
                  <span className="text-xs text-on-surface-variant uppercase tracking-wider">Max 50MB · CSV only</span>
                </>
              )}
              <input id="csv-file-input" type="file" accept=".csv"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                className="hidden" />
            </div>
          ) : step === 'preview' && preview ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm font-mono">
                <span className="text-on-surface-variant">Parser: <span className="text-on-surface">{preview.parserUsed}</span></span>
                <span className="text-on-surface-variant">File: <span className="text-on-surface">{preview.filename}</span></span>
                <span className="text-on-surface-variant">{preview.summary.incomeCount} income / {preview.summary.expenseCount} expense</span>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-surface border-b border-outline-variant text-xs text-on-surface-variant uppercase tracking-wider sticky top-0">
                      <th className="py-2 px-3 font-normal">Date</th>
                      <th className="py-2 px-3 font-normal">Description</th>
                      <th className="py-2 px-3 font-normal">Amount</th>
                      <th className="py-2 px-3 font-normal">Category</th>
                      <th className="py-2 px-3 font-normal">Status</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono divide-y divide-outline-variant/30">
                    {preview.validRows.map((row) => (
                      <tr key={row.index} className={row.validationErrors.length > 0 ? 'bg-error-container/10' : ''}>
                        <td className="py-2 px-3">{row.date}</td>
                        <td className="py-2 px-3">
                          <input
                            value={rowEdits[row.index]?.description ?? row.description}
                            onChange={(e) => setRowEdits({ ...rowEdits, [row.index]: { ...rowEdits[row.index], description: e.target.value } })}
                            className="w-full bg-transparent border-b border-outline-variant/50 py-0.5 text-on-surface focus:border-primary-fixed-dim focus:outline-none"
                          />
                        </td>
                        <td className={`py-2 px-3 tabular-nums ${row.type === 'income' ? 'text-primary-fixed-dim' : 'text-error'}`}>
                          {row.type === 'income' ? '+' : '-'}{row.amount.toFixed(2)}
                        </td>
                        <td className="py-2 px-3">
                          {row.matchedRule && <span className="text-xs text-primary-fixed-dim">{row.matchedRule}</span>}
                        </td>
                        <td className="py-2 px-3">
                          {row.validationErrors.length > 0 ? (
                            <span className="text-xs text-error">{row.validationErrors.join(', ')}</span>
                          ) : row.isDuplicate ? (
                            <span className="text-xs text-yellow-400">Duplicate</span>
                          ) : (
                            <span className="text-xs text-primary-fixed-dim">Ready</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              <p className="text-sm text-on-surface-variant mt-2">Transactions have been successfully imported.</p>
              <button onClick={onClose} className="mt-6 px-6 py-2 bg-primary-fixed-dim text-on-primary rounded font-mono text-sm">
                Close
              </button>
            </div>
          ) : null}
        </div>

        {step === 'preview' && preview && (
          <div className="border-t border-outline-variant/50 p-4 flex items-center justify-between bg-surface-container-low">
            <div className="flex items-center gap-4 text-sm text-on-surface-variant font-mono">
              <span>{preview.validRows.filter((r) => r.validationErrors.length === 0).length} valid</span>
              <span className="text-error">{preview.duplicateRows} duplicates</span>
              <span className="text-yellow-400">{preview.uncategorizedRows} uncategorized</span>
              <span className="text-error">{preview.invalidRows.length} errors</span>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 border border-outline-variant text-on-surface rounded font-mono text-sm">
                Cancel
              </button>
              <button onClick={handleConfirm} disabled={confirmMutation.isPending}
                className="px-4 py-2 bg-primary-fixed-dim text-on-primary rounded font-mono text-sm disabled:opacity-50">
                Import Transactions
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
