import type { Request, Response, NextFunction } from 'express';
import type { ApiResponse } from '../types/api';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response<ApiResponse>,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.code);
    return;
  }

  console.error('Unhandled error:', err.message);
  sendError(res, 'Internal server error', 500, 'INTERNAL_ERROR');
}

export function notFoundHandler(
  req: Request,
  res: Response<ApiResponse>,
): void {
  sendError(res, `Route ${req.method} ${req.path} not found`, 404, 'NOT_FOUND');
}
