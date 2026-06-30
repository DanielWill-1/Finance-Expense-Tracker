import type { Request, Response } from 'express';
import { AccountRepository } from '../repositories/accountRepository';
import { createAccountSchema, updateAccountSchema } from '../validators/account';
import { idParamSchema } from '../validators/common';
import { parsePagination, parseSort } from '../utils/pagination';
import { sendSuccess, sendPaginated, sendError } from '../utils/response';
import { NotFoundError } from '../utils/errors';

const ALLOWED_SORT_FIELDS = ['id', 'name', 'type', 'balance', 'created_at'];

export class AccountController {
  private repo = new AccountRepository();

  list = (req: Request, res: Response) => {
    const pagination = parsePagination(req.query);
    const sort = parseSort(req.query, ALLOWED_SORT_FIELDS);

    const result = this.repo.findAll({ ...pagination, ...sort });
    sendPaginated(res, result.data, result.total, pagination.page, pagination.limit);
  };

  getById = (req: Request, res: Response) => {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) return sendError(res, 'Invalid account ID', 400, 'VALIDATION_ERROR');

    const acct = this.repo.findById(parsed.data.id);
    if (!acct) throw new NotFoundError('Account', parsed.data.id);
    sendSuccess(res, acct);
  };

  create = (req: Request, res: Response) => {
    const parsed = createAccountSchema.safeParse(req.body);
    if (!parsed.success)
      return sendError(res, parsed.error.errors.map((e) => e.message).join(', '), 400, 'VALIDATION_ERROR');

    const acct = this.repo.create(parsed.data);
    sendSuccess(res, acct, 201);
  };

  update = (req: Request, res: Response) => {
    const idParsed = idParamSchema.safeParse(req.params);
    if (!idParsed.success) return sendError(res, 'Invalid account ID', 400, 'VALIDATION_ERROR');

    const bodyParsed = updateAccountSchema.safeParse(req.body);
    if (!bodyParsed.success)
      return sendError(res, bodyParsed.error.errors.map((e) => e.message).join(', '), 400, 'VALIDATION_ERROR');

    const acct = this.repo.update(idParsed.data.id, bodyParsed.data);
    if (!acct) return sendError(res, `Account with id ${idParsed.data.id} not found`, 404, 'NOT_FOUND');
    sendSuccess(res, acct);
  };

  delete = (req: Request, res: Response) => {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) return sendError(res, 'Invalid account ID', 400, 'VALIDATION_ERROR');

    const deleted = this.repo.delete(parsed.data.id);
    if (!deleted) return sendError(res, `Account with id ${parsed.data.id} not found`, 404, 'NOT_FOUND');
    sendSuccess(res, null, 204);
  };
}
