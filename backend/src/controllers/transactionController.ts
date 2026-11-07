import type { Request, Response } from 'express';
import type { TransactionService } from '../services/transactionService';
import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionFilterSchema,
} from '../validators/transaction';
import { idParamSchema } from '../validators/common';
import { parsePagination, parseSort } from '../utils/pagination';
import { sendSuccess, sendPaginated, sendError } from '../utils/response';
import { AppError } from '../utils/errors';

const ALLOWED_SORT_FIELDS = [
  'id',
  'amount',
  'date',
  'description',
  'merchant',
  'type',
  'created_at',
];

export class TransactionController {
  constructor(private service: TransactionService) {}

  list = (req: Request, res: Response) => {
    const parsed = transactionFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      return sendError(res, 'Invalid query parameters', 400, 'VALIDATION_ERROR');
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

    const filterFields = [
      'type',
      'categoryId',
      'accountId',
      'startDate',
      'endDate',
      'minAmount',
      'maxAmount',
      'search',
    ] as const;
    const hasFilters = filterFields.some((field) => filters[field] !== undefined);
    const result = this.service.list(hasFilters ? filters : undefined, pagination, sort);

    sendPaginated(res, result.data, result.total, pagination.page, pagination.limit);
  };

  getById = (req: Request, res: Response) => {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return sendError(res, 'Invalid transaction ID', 400, 'VALIDATION_ERROR');
    }

    try {
      const tx = this.service.getById(parsed.data.id);
      sendSuccess(res, tx);
    } catch (err) {
      if (err instanceof AppError) {
        return sendError(res, err.message, err.statusCode, err.code);
      }
      throw err;
    }
  };

  create = (req: Request, res: Response) => {
    const parsed = createTransactionSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(
        res,
        parsed.error.issues.map((e) => e.message).join(', '),
        400,
        'VALIDATION_ERROR',
      );
    }

    const tx = this.service.create(parsed.data);
    sendSuccess(res, tx, 201);
  };

  update = (req: Request, res: Response) => {
    const idParsed = idParamSchema.safeParse(req.params);
    if (!idParsed.success) {
      return sendError(res, 'Invalid transaction ID', 400, 'VALIDATION_ERROR');
    }

    const bodyParsed = updateTransactionSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      return sendError(
        res,
        bodyParsed.error.issues.map((e) => e.message).join(', '),
        400,
        'VALIDATION_ERROR',
      );
    }

    try {
      const tx = this.service.update(idParsed.data.id, bodyParsed.data);
      sendSuccess(res, tx);
    } catch (err) {
      if (err instanceof AppError) {
        return sendError(res, err.message, err.statusCode, err.code);
      }
      throw err;
    }
  };

  delete = (req: Request, res: Response) => {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return sendError(res, 'Invalid transaction ID', 400, 'VALIDATION_ERROR');
    }

    try {
      this.service.delete(parsed.data.id);
      sendSuccess(res, null, 204);
    } catch (err) {
      if (err instanceof AppError) {
        return sendError(res, err.message, err.statusCode, err.code);
      }
      throw err;
    }
  };
}
