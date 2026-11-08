export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Transaction {
  id: number;
  amount: number;
  date: string;
  description: string;
  merchant: string | null;
  category_id: number | null;
  account_id: number | null;
  type: 'income' | 'expense';
  is_recurring: number;
  notes: string | null;
  external_id: string | null;
  category_name?: string;
  account_name?: string;
  account_currency?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  parent_id: number | null;
  color: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
  currency: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsSummary {
  totalIncome: number | null;
  totalExpenses: number | null;
  netSavings: number | null;
  savingsRate: number | null;
  burnRate: number | null;
  netWorth: number | null;
  netWorthByCurrency: { currency: string; amount: number }[];
  currencyTotals: {
    currency: string;
    totalIncome: number;
    totalExpenses: number;
    netSavings: number;
    savingsRate: number;
    burnRate: number;
  }[];
}

export interface MonthlyData {
  month: string;
  currency: string;
  income: number;
  expense: number;
  net: number;
}

export interface CategoryTotal {
  categoryId: number | null;
  categoryName: string | null;
  currency: string;
  total: number;
}

export interface SettingRow {
  id: number;
  key: string;
  value: string;
  updated_at: string;
}

export interface ImportBatch {
  id: number;
  filename: string;
  imported_at: string;
  total_rows: number;
  imported_rows: number;
  skipped_rows: number;
  duplicate_rows: number;
  status: string;
  parser_type: string;
  created_at: string;
}

export interface AssistantStatus {
  state: 'disabled' | 'unconfigured' | 'untested' | 'ready' | 'unreachable' | 'failed';
  provider: 'openai' | 'anthropic' | 'groq' | 'ollama';
  model: string;
  enabled: boolean;
  mode: 'local' | 'cloud';
  destination: string;
  credentialConfigured: boolean;
  credentialSource: 'settings' | 'environment' | 'not_required' | null;
  cloudConsent: boolean;
  serverReachable: boolean | null;
  modelAvailable: boolean | null;
  testedAt: string | null;
  message: string;
  errorCode?: string;
}

export interface AssistantCredentialStatus {
  provider: 'openai' | 'anthropic' | 'groq';
  configured: boolean;
  source: 'settings' | 'environment' | null;
}

export interface AssistantContextMetadata {
  period: string;
  filters: string[];
  currencies: string[];
  cutoff: string;
  truncated: boolean;
  omittedReferenceRows: number;
  truncationDetails: string[];
  supportingTotals: {
    currency: string;
    income: number;
    expenses: number;
    netSavings: number;
  }[];
  categoryTotals: { name: string; currency: string; total: number }[];
  transactionReferences: {
    id: number;
    date: string;
    description: string;
    merchant: string | null;
    category: string;
    amount: number;
    currency: string;
  }[];
}
