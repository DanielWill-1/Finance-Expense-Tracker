import type { Response } from 'express';
import type { ApiResponse, PaginatedResponse } from '../types/api';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  if (statusCode === 204) {
    res.status(204).send();
    return;
  }
  const response: ApiResponse<T> = {
    success: true,
    data,
  };
  res.status(statusCode).json(response);
}

export function sendError(res: Response, message: string, statusCode = 500, code = 'INTERNAL_ERROR'): void {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
    },
  };
  res.status(statusCode).json(response);
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
): void {
  const response: PaginatedResponse<T> = {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
  res.status(200).json(response);
}
