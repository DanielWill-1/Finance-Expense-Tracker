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
  AssistantStatus,
  AssistantCredentialStatus,
  AssistantContextMetadata,
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

export async function updateAccount(id: number, input: Partial<Account> & { isActive?: boolean }) {
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
  const { data } = await apiClient.get<ApiResponse<AnalyticsSummary>>('/analytics/summary', {
    params,
  });
  return data;
}

export async function fetchAnalyticsMonthly(params?: {
  year?: number;
  months?: number;
  accountId?: number;
}) {
  const { data } = await apiClient.get<ApiResponse<MonthlyData[]>>('/analytics/monthly', {
    params,
  });
  return data;
}

export async function fetchAnalyticsCategories(params?: {
  type?: string;
  startDate?: string;
  endDate?: string;
  accountId?: number;
}) {
  const { data } = await apiClient.get<ApiResponse<CategoryTotal[]>>('/analytics/categories', {
    params,
  });
  return data;
}

export async function fetchSettings() {
  const { data } = await apiClient.get<ApiResponse<Record<string, string>>>('/settings');
  return data;
}

export async function fetchHealth() {
  const { data } =
    await apiClient.get<ApiResponse<{ status: string; database: string }>>('/health');
  return data;
}

export async function restoreDatabaseBackup(file: File) {
  const formData = new FormData();
  formData.append('backup', file);
  const { data } = await apiClient.post<ApiResponse<{ restored: boolean; recoveryBackup: string }>>(
    '/data/restore',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000,
    },
  );
  return data;
}

export async function purgeDatabase() {
  const { data } = await apiClient.delete<
    ApiResponse<{ counts: Record<string, number>; recoveryBackup: string }>
  >('/data', {
    data: { confirmation: 'PURGE' },
  });
  return data;
}

export async function updateSettings(settings: Record<string, string | boolean | null>) {
  const { data } = await apiClient.put<ApiResponse<Record<string, string>>>('/settings', settings);
  return data;
}

export async function fetchAssistantStatus() {
  const { data } = await apiClient.get<ApiResponse<AssistantStatus>>('/assistant/status');
  return data;
}

export async function testAssistantConnection() {
  const { data } = await apiClient.post<ApiResponse<{ state: string; message: string }>>(
    '/assistant/test',
    {},
  );
  return data;
}

export async function fetchAssistantCredential(provider: 'openai' | 'anthropic' | 'groq') {
  const { data } = await apiClient.get<ApiResponse<AssistantCredentialStatus>>(
    `/assistant/credentials/${provider}`,
  );
  return data;
}

export async function saveAssistantCredential(input: {
  provider: 'openai' | 'anthropic' | 'groq';
  apiKey: string;
}) {
  const { data } = await apiClient.put<ApiResponse<AssistantCredentialStatus>>(
    `/assistant/credentials/${input.provider}`,
    { apiKey: input.apiKey },
  );
  return data;
}

export async function removeAssistantCredential(provider: 'openai' | 'anthropic' | 'groq') {
  const { data } = await apiClient.delete<ApiResponse<AssistantCredentialStatus>>(
    `/assistant/credentials/${provider}`,
  );
  return data;
}

export class AssistantStreamError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'AssistantStreamError';
  }
}

export async function streamAssistantChat(
  question: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  signal: AbortSignal,
  onMeta: (metadata: AssistantContextMetadata) => void,
  onDelta: (delta: string) => void,
) {
  const response = await fetch('/api/assistant/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ question, history }),
    signal,
  });
  if (!response.ok) {
    let message = `Assistant request failed (${response.status}).`;
    let code = 'AI_REQUEST_FAILED';
    try {
      const payload = (await response.json()) as ApiResponse;
      if (payload.error?.message) message = payload.error.message;
      if (payload.error?.code) code = payload.error.code;
    } catch {
      // Keep the bounded generic HTTP error when the response is not JSON.
    }
    throw new AssistantStreamError(message, code);
  }
  if (!response.body)
    throw new AssistantStreamError('The assistant stream was unavailable.', 'AI_INVALID_RESPONSE');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventName = '';
  let dataLines: string[] = [];
  let completed = false;
  const dispatch = () => {
    if (dataLines.length === 0) {
      eventName = '';
      return;
    }
    const event = eventName;
    const data = dataLines.join('\n');
    eventName = '';
    dataLines = [];
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(data) as Record<string, unknown>;
    } catch {
      throw new AssistantStreamError(
        'The assistant returned an invalid stream event.',
        'AI_INVALID_RESPONSE',
      );
    }
    if (event === 'meta') onMeta(payload as unknown as AssistantContextMetadata);
    else if (event === 'delta' && typeof payload.text === 'string') onDelta(payload.text);
    else if (event === 'done') completed = true;
    else if (event === 'error')
      throw new AssistantStreamError(
        typeof payload.message === 'string' ? payload.message : 'The assistant request failed.',
        typeof payload.code === 'string' ? payload.code : 'AI_PROVIDER_FAILED',
      );
  };
  const consumeLine = (line: string) => {
    if (!line) {
      dispatch();
      return;
    }
    if (line.startsWith(':')) return;
    const separator = line.indexOf(':');
    const field = separator < 0 ? line : line.slice(0, separator);
    const value = separator < 0 ? '' : line.slice(separator + 1).replace(/^ /, '');
    if (field === 'event') eventName = value;
    if (field === 'data') dataLines.push(value);
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline = buffer.indexOf('\n');
      while (newline >= 0) {
        consumeLine(buffer.slice(0, newline).replace(/\r$/, ''));
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf('\n');
      }
    }
    buffer += decoder.decode();
    if (buffer) consumeLine(buffer.replace(/\r$/, ''));
    dispatch();
  } finally {
    reader.releaseLock();
  }
  if (!completed)
    throw new AssistantStreamError(
      'The assistant stream ended before completion.',
      'AI_DISCONNECTED',
    );
}

export async function fetchImportHistory(params?: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { data } = await apiClient.get<PaginatedResponse<ImportBatch>>('/import/history', {
    params,
  });
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

export async function confirmImport(
  batchId: number,
  rows: Record<string, unknown>[],
  accountId?: number,
) {
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
