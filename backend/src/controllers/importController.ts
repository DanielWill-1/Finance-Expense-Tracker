import type { Request, Response } from 'express';
import { CSVImportService } from '../services/csvImportService';
import { idParamSchema } from '../validators/common';
import { importHistoryQuerySchema } from '../validators/import';
import { parsePagination, parseSort } from '../utils/pagination';
import { sendSuccess, sendPaginated, sendError } from '../utils/response';
import { AppError } from '../utils/errors';
import { readFileSync, unlinkSync } from 'fs';

const ALLOWED_SORT_FIELDS = ['id', 'filename', 'imported_at', 'status'];

export class ImportController {
  private service = new CSVImportService();

  upload = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        sendError(res, 'No file uploaded', 400, 'VALIDATION_ERROR');
        return;
      }

      if (!req.file.originalname.endsWith('.csv')) {
        sendError(res, 'Only CSV files are supported', 400, 'VALIDATION_ERROR');
        return;
      }

      const fileContent = readFileSync(req.file.path, 'utf-8');
      const preview = this.service.createPreview(fileContent, req.file.originalname);

      try { unlinkSync(req.file.path); } catch { /* ignore */ }

      sendSuccess(res, preview, 201);
    } catch (err) {
      if (req.file) {
        try { unlinkSync(req.file.path); } catch { /* ignore */ }
      }
      if (err instanceof AppError) {
        sendError(res, err.message, err.statusCode, err.code);
      } else {
        sendError(res, err instanceof Error ? err.message : 'Upload failed', 500);
      }
    }
  };

  confirm = (req: Request, res: Response) => {
    const idParsed = idParamSchema.safeParse(req.params);
    if (!idParsed.success) {
      sendError(res, 'Invalid batch ID', 400, 'VALIDATION_ERROR');
      return;
    }

    const { rows, accountId } = req.body as {
      rows: { date: string; description: string; amount: number; type: 'income' | 'expense'; merchant?: string; categoryId?: number | null }[];
      accountId?: number;
    };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      sendError(res, 'No rows provided for import', 400, 'VALIDATION_ERROR');
      return;
    }

    try {
      const imported = this.service.commitImport(idParsed.data.id, rows, accountId);
      sendSuccess(res, { imported, batchId: idParsed.data.id });
    } catch (err) {
      if (err instanceof AppError) {
        sendError(res, err.message, err.statusCode, err.code);
      } else {
        sendError(res, err instanceof Error ? err.message : 'Import failed', 500);
      }
    }
  };

  undo = (req: Request, res: Response) => {
    const idParsed = idParamSchema.safeParse(req.params);
    if (!idParsed.success) {
      sendError(res, 'Invalid batch ID', 400, 'VALIDATION_ERROR');
      return;
    }

    try {
      const deleted = this.service.undoImport(idParsed.data.id);
      sendSuccess(res, { deleted });
    } catch (err) {
      if (err instanceof AppError) {
        sendError(res, err.message, err.statusCode, err.code);
      } else {
        sendError(res, err instanceof Error ? err.message : 'Undo failed', 500);
      }
    }
  };

  history = (req: Request, res: Response) => {
    const parsed = importHistoryQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      sendError(res, 'Invalid query parameters', 400, 'VALIDATION_ERROR');
      return;
    }

    const filters = parsed.data;
    const pagination = parsePagination({ page: String(filters.page ?? ''), limit: String(filters.limit ?? '') });
    const sort = parseSort({ sortBy: filters.sortBy, sortOrder: filters.sortOrder }, ALLOWED_SORT_FIELDS);

    const result = this.service.getHistory(
      filters.status ? { status: filters.status } : undefined,
      pagination,
      sort,
    );

    sendPaginated(res, result.data, result.total, pagination.page, pagination.limit);
  };

  getById = (req: Request, res: Response) => {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) {
      sendError(res, 'Invalid batch ID', 400, 'VALIDATION_ERROR');
      return;
    }

    try {
      const batch = this.service.getBatchById(parsed.data.id);
      sendSuccess(res, batch);
    } catch (err) {
      if (err instanceof AppError) {
        sendError(res, err.message, err.statusCode, err.code);
      } else {
        throw err;
      }
    }
  };
}
