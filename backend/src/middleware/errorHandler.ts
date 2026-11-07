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
  const code = (err as NodeJS.ErrnoException & { type?: string; code?: string }).code;
  const type = (err as Error & { type?: string }).type;
  if (code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    sendError(
      res,
      'A referenced account or category does not exist, or is still in use',
      400,
      'INVALID_REFERENCE',
    );
    return;
  }
  if (code?.startsWith('SQLITE_CONSTRAINT_UNIQUE')) {
    sendError(res, 'A record with these details already exists', 409, 'CONFLICT');
    return;
  }
  if (type === 'entity.too.large' || code === 'LIMIT_FILE_SIZE') {
    sendError(res, 'Request exceeds the supported size limit', 413, 'PAYLOAD_TOO_LARGE');
    return;
  }
  if (type === 'entity.parse.failed') {
    sendError(res, 'Request body contains malformed JSON', 400, 'INVALID_JSON');
    return;
  }
  if (code?.startsWith('LIMIT_') || err.name === 'MulterError') {
    sendError(
      res,
      'Upload exceeds the supported file size, file count, or field limit',
      400,
      'INVALID_UPLOAD',
    );
    return;
  }
  if (err.message === 'Only CSV files are allowed') {
    sendError(res, 'Only CSV files are allowed', 400, 'INVALID_UPLOAD');
    return;
  }
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.code);
    return;
  }

  console.error('Unhandled error:', err.message);
  sendError(res, 'Internal server error', 500, 'INTERNAL_ERROR');
}

export function notFoundHandler(req: Request, res: Response<ApiResponse>): void {
  sendError(res, `Route ${req.method} ${req.path} not found`, 404, 'NOT_FOUND');
}
