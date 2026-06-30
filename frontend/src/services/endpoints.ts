import { apiClient } from './apiClient';
import type {
  ApiResponse,
  PaginatedResponse,
  Transaction,
  Category,
  Account,
  AnalyticsSummary,
  MonthlyData,
  CategoryTotal,
  ImportBatch,
} from '../types/api';

export interface TransactionFilters {
  type?: string;
  categoryId?: number;
  accountId?: number;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

export async function fetchTransactions(filters?: TransactionFilters) {
  const { data } = await apiClient.get<PaginatedResponse<Transaction>>('/transactions', {
    params: filters,
  });
  return data;
}

export async function fetchTransaction(id: number) {
  const { data } = await apiClient.get<ApiResponse<Transaction>>(`/transactions/${id}`);
  return data;
}

export async function createTransaction(input: Partial<Transaction>) {
  const { data } = await apiClient.post<ApiResponse<Transaction>>('/transactions', input);
  return data;
}

export async function updateTransaction(id: number, input: Partial<Transaction>) {
  const { data } = await apiClient.put<ApiResponse<Transaction>>(`/transactions/${id}`, input);
  return data;
}

export async function deleteTransaction(id: number) {
  await apiClient.delete(`/transactions/${id}`);
}

export async function fetchCategories(type?: string) {
  const { data } = await apiClient.get<PaginatedResponse<Category>>('/categories', {
    params: type ? { type, limit: 200 } : { limit: 200 },
  });
  return data;
}

export async function createCategory(input: Partial<Category>) {
  const { data } = await apiClient.post<ApiResponse<Category>>('/categories', input);
  return data;
}

export async function updateCategory(id: number, input: Partial<Category>) {
  const { data } = await apiClient.put<ApiResponse<Category>>(`/categories/${id}`, input);
  return data;
}

export async function deleteCategory(id: number) {
  await apiClient.delete(`/categories/${id}`);
}

export async function fetchAccounts() {
  const { data } = await apiClient.get<PaginatedResponse<Account>>('/accounts', {
    params: { limit: 200 },
  });
  return data;
}

export async function createAccount(input: Partial<Account>) {
  const { data } = await apiClient.post<ApiResponse<Account>>('/accounts', input);
  return data;
}

export async function updateAccount(id: number, input: Partial<Account>) {
  const { data } = await apiClient.put<ApiResponse<Account>>(`/accounts/${id}`, input);
  return data;
}

export async function deleteAccount(id: number) {
  await apiClient.delete(`/accounts/${id}`);
}

export async function fetchAnalyticsSummary(params?: {
  startDate?: string;
  endDate?: string;
  accountId?: number;
}) {
  const { data } = await apiClient.get<ApiResponse<AnalyticsSummary>>(
    '/analytics/summary',
    { params },
  );
  return data;
}

export async function fetchAnalyticsMonthly(params?: {
  year?: number;
  months?: number;
  accountId?: number;
}) {
  const { data } = await apiClient.get<ApiResponse<MonthlyData[]>>(
    '/analytics/monthly',
    { params },
  );
  return data;
}

export async function fetchAnalyticsCategories(params?: {
  type?: string;
  startDate?: string;
  endDate?: string;
  accountId?: number;
}) {
  const { data } = await apiClient.get<ApiResponse<CategoryTotal[]>>(
    '/analytics/categories',
    { params },
  );
  return data;
}

export async function fetchSettings() {
  const { data } = await apiClient.get<ApiResponse<Record<string, string>>>('/settings');
  return data;
}

export async function updateSettings(settings: Record<string, string>) {
  const { data } = await apiClient.put<ApiResponse<Record<string, string>>>(
    '/settings',
    settings,
  );
  return data;
}

export async function fetchImportHistory(params?: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { data } = await apiClient.get<PaginatedResponse<ImportBatch>>(
    '/import/history',
    { params },
  );
  return data;
}

export async function uploadCSV(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post('/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return data;
}

export async function confirmImport(batchId: number, rows: Record<string, unknown>[], accountId?: number) {
  const { data } = await apiClient.post(`/import/${batchId}/confirm`, { rows, accountId });
  return data;
}

export async function undoImport(batchId: number) {
  const { data } = await apiClient.post(`/import/${batchId}/undo`);
  return data;
}

export async function fetchRecurring() {
  const { data } = await apiClient.get('/analytics/recurring');
  return data;
}

export async function fetchUpcomingRecurring() {
  const { data } = await apiClient.get('/analytics/upcoming-recurring');
  return data;
}

export async function fetchWeekly(params?: { weeks?: number; accountId?: number }) {
  const { data } = await apiClient.get('/analytics/weekly', { params });
  return data;
}

export async function fetchSpendingTrends(params?: { months?: number }) {
  const { data } = await apiClient.get('/analytics/spending-trends', { params });
  return data;
}

export async function fetchLargestExpenses(params?: { limit?: number }) {
  const { data } = await apiClient.get('/analytics/largest-expenses', { params });
  return data;
}

export async function fetchTopMerchants(params?: { limit?: number }) {
  const { data } = await apiClient.get('/analytics/top-merchants', { params });
  return data;
}

export async function fetchRules() {
  const { data } = await apiClient.get('/rules');
  return data;
}

export async function createRule(input: Record<string, unknown>) {
  const { data } = await apiClient.post('/rules', input);
  return data;
}

export async function updateRule(id: number, input: Record<string, unknown>) {
  const { data } = await apiClient.put(`/rules/${id}`, input);
  return data;
}

export async function deleteRule(id: number) {
  await apiClient.delete(`/rules/${id}`);
}
