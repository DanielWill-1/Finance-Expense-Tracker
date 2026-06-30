export const ACCOUNT_TYPES = ['bank', 'card', 'cash', 'wallet', 'investment'] as const;

export const TRANSACTION_TYPES = ['income', 'expense'] as const;

export const CATEGORY_TYPES = ['income', 'expense'] as const;

export const IMPORT_STATUS = ['pending', 'processing', 'completed', 'failed'] as const;

export const DEFAULT_PAGE = 1;

export const DEFAULT_LIMIT = 50;

export const MAX_LIMIT = 200;

export const DEFAULT_SORT_ORDER = 'desc' as const;

export type SortOrder = 'asc' | 'desc';
