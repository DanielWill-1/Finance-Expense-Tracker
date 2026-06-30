import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTransaction, updateTransaction, fetchCategories, fetchAccounts } from '../services/endpoints';
import { X, Loader2 } from 'lucide-react';
import type { Transaction } from '../types/api';

interface TransactionModalProps {
  onClose: () => void;
  editTransaction?: Transaction | null;
}

export function TransactionModal({ onClose, editTransaction }: TransactionModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!editTransaction;

  const [form, setForm] = useState({
    date: '',
    description: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    categoryId: '' as string,
    accountId: '' as string,
    merchant: '',
    notes: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (editTransaction) {
      setForm({
        date: editTransaction.date,
        description: editTransaction.description,
        amount: String(editTransaction.amount),
        type: editTransaction.type,
        categoryId: editTransaction.category_id ? String(editTransaction.category_id) : '',
        accountId: editTransaction.account_id ? String(editTransaction.account_id) : '',
        merchant: editTransaction.merchant ?? '',
        notes: editTransaction.notes ?? '',
      });
    }
  }, [editTransaction]);

  const { data: categoriesRes } = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => fetchCategories(),
  });

  const { data: accountsRes } = useQuery({
    queryKey: ['accounts-all'],
    queryFn: () => fetchAccounts(),
  });

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        date: form.date,
        description: form.description,
        amount: Number(form.amount),
        type: form.type,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        accountId: form.accountId ? Number(form.accountId) : null,
        merchant: form.merchant || undefined,
        notes: form.notes || undefined,
      };

      if (isEdit && editTransaction) {
        return updateTransaction(editTransaction.id, payload);
      }
      return createTransaction(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-monthly'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-categories'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-recent'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-recurring'] });
      queryClient.invalidateQueries({ queryKey: ['largest-expenses'] });
      onClose();
    },
    onError: (err: Error) => setError(err.message || 'Failed to save transaction'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.date || !form.description || !form.amount) {
      setError('Date, description, and amount are required');
      return;
    }
    if (isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      setError('Amount must be a positive number');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      setError('Date must be in YYYY-MM-DD format');
      return;
    }

    mutation.mutate();
  }

  const categories = categoriesRes?.data ?? [];
  const accounts = accountsRes?.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/50">
          <h2 className="text-lg font-medium text-on-surface">
            {isEdit ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-error-container/20 border border-error/30 rounded text-error text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-on-surface-variant uppercase tracking-wider mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full bg-surface-container-low border border-outline-variant rounded py-2 px-3 text-sm font-mono text-on-surface focus:border-primary-fixed-dim focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant uppercase tracking-wider mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as 'income' | 'expense' })}
                className="w-full bg-surface-container-low border border-outline-variant rounded py-2 px-3 text-sm font-mono text-on-surface focus:border-primary-fixed-dim focus:outline-none"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-on-surface-variant uppercase tracking-wider mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-surface-container-low border border-outline-variant rounded py-2 px-3 text-sm font-mono text-on-surface focus:border-primary-fixed-dim focus:outline-none"
              placeholder="e.g. Grocery store"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-on-surface-variant uppercase tracking-wider mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full bg-surface-container-low border border-outline-variant rounded py-2 px-3 text-sm font-mono text-on-surface focus:border-primary-fixed-dim focus:outline-none"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant uppercase tracking-wider mb-1">Merchant</label>
              <input
                type="text"
                value={form.merchant}
                onChange={(e) => setForm({ ...form, merchant: e.target.value })}
                className="w-full bg-surface-container-low border border-outline-variant rounded py-2 px-3 text-sm font-mono text-on-surface focus:border-primary-fixed-dim focus:outline-none"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-on-surface-variant uppercase tracking-wider mb-1">Category</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full bg-surface-container-low border border-outline-variant rounded py-2 px-3 text-sm font-mono text-on-surface focus:border-primary-fixed-dim focus:outline-none"
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant uppercase tracking-wider mb-1">Account</label>
              <select
                value={form.accountId}
                onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                className="w-full bg-surface-container-low border border-outline-variant rounded py-2 px-3 text-sm font-mono text-on-surface focus:border-primary-fixed-dim focus:outline-none"
              >
                <option value="">No account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-on-surface-variant uppercase tracking-wider mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full bg-surface-container-low border border-outline-variant rounded py-2 px-3 text-sm font-mono text-on-surface focus:border-primary-fixed-dim focus:outline-none resize-none"
              rows={2}
              placeholder="Optional notes"
            />
          </div>
        </form>

        <div className="border-t border-outline-variant/50 p-4 flex justify-end gap-3 bg-surface-container-low">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-outline-variant text-on-surface rounded font-mono text-sm hover:bg-surface-container-high transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="px-6 py-2 bg-primary-fixed-dim text-on-primary rounded font-mono text-sm hover:bg-primary-fixed transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
