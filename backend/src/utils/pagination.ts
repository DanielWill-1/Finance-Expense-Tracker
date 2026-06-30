import { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT, DEFAULT_SORT_ORDER } from './constants';
import type { SortOrder } from './constants';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface SortParams {
  sortBy: string;
  sortOrder: SortOrder;
}

export function parsePagination(query: {
  page?: string;
  limit?: string;
}): PaginationParams {
  let page = Number(query.page) || DEFAULT_PAGE;
  let limit = Number(query.limit) || DEFAULT_LIMIT;

  if (page < 1) page = DEFAULT_PAGE;
  if (limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

export function parseSort(query: {
  sortBy?: string | undefined;
  sortOrder?: string | undefined;
}, allowedFields: string[]): SortParams {
  const sortBy = query.sortBy && allowedFields.includes(query.sortBy) ? query.sortBy : allowedFields[0] || 'id';
  const sortOrder: SortOrder =
    query.sortOrder === 'asc' || query.sortOrder === 'desc' ? query.sortOrder : DEFAULT_SORT_ORDER;
  return { sortBy, sortOrder };
}
