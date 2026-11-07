import type { Request, Response } from 'express';
import { CSVImportService, type ImportCommitRow } from '../services/csvImportService';
import { idParamSchema } from '../validators/common';
import { importCommitSchema, importHistoryQuerySchema } from '../validators/import';
import { parsePagination, parseSort } from '../utils/pagination';
import { sendSuccess, sendPaginated, sendError } from '../utils/response';
import { AppError } from '../utils/errors';

const ALLOWED_SORT_FIELDS = ['id', 'filename', 'imported_at', 'status'];

export class ImportController {
  private service = new CSVImportService();

  upload = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        sendError(res, 'No file uploaded', 400, 'VALIDATION_ERROR');
        return;
      }

      if (!req.file.originalname.toLowerCase().endsWith('.csv')) {
        sendError(res, 'Only CSV files are supported', 400, 'VALIDATION_ERROR');
        return;
      }

      const fileContent = req.file.buffer.toString('utf-8');
      const preview = this.service.createPreview(fileContent, req.file.originalname);
      sendSuccess(res, preview, 201);
    } catch (err) {
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

    const bodyParsed = importCommitSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      sendError(
        res,
        bodyParsed.error.issues.map((issue) => issue.message).join(', '),
        400,
        'VALIDATION_ERROR',
      );
      return;
    }

    try {
      const rows: ImportCommitRow[] = bodyParsed.data.rows.map((row) => ({
        date: row.date,
        description: row.description,
        amount: row.amount,
        type: row.type,
        merchant: row.merchant ?? null,
        categoryId: row.categoryId ?? null,
        externalId: row.externalId ?? null,
        keepDuplicate: row.keepDuplicate,
      }));
      const result = this.service.commitImport(
        idParsed.data.id,
        rows,
        bodyParsed.data.accountId ?? undefined,
      );
      sendSuccess(res, { ...result, batchId: idParsed.data.id });
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
    const pagination = parsePagination({
      page: String(filters.page ?? ''),
      limit: String(filters.limit ?? ''),
    });
    const sort = parseSort(
      { sortBy: filters.sortBy, sortOrder: filters.sortOrder },
      ALLOWED_SORT_FIELDS,
    );

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
