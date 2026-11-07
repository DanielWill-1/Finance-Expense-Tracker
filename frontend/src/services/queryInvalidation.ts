import type { QueryClient } from '@tanstack/react-query';

const FINANCE_QUERY_KEYS = [
  'transactions',
  'transactions-recent',
  'analytics-summary',
  'analytics-monthly',
  'analytics-categories',
  'spending-trends',
  'largest-expenses',
  'top-merchants',
  'recurring',
  'upcoming-recurring',
];

export function invalidateFinanceQueries(queryClient: QueryClient) {
  return Promise.all(
    FINANCE_QUERY_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey: [queryKey] })),
  );
}
