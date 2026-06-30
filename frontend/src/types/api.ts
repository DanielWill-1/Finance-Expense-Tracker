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
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  burnRate: number;
  netWorth: number;
}

export interface MonthlyData {
  month: string;
  income: number;
  expense: number;
}

export interface CategoryTotal {
  categoryId: number | null;
  categoryName: string | null;
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
