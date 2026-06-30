import type { Request, Response, NextFunction } from 'express';
import type { ApiResponse } from '../types/api';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response<ApiResponse>,
  _next: NextFunction,
): void {
  console.error('Unhandled error:', err.message);

  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
}
