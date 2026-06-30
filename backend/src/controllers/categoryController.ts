import type { Request, Response } from 'express';
import { CategoryRepository } from '../repositories/categoryRepository';
import { createCategorySchema, updateCategorySchema } from '../validators/category';
import { idParamSchema } from '../validators/common';
import { parsePagination, parseSort } from '../utils/pagination';
import { sendSuccess, sendPaginated, sendError } from '../utils/response';

const ALLOWED_SORT_FIELDS = ['id', 'name', 'type', 'created_at'];

export class CategoryController {
  private repo = new CategoryRepository();

  list = (req: Request, res: Response) => {
    const pagination = parsePagination(req.query);
    const sort = parseSort(req.query, ALLOWED_SORT_FIELDS);
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;

    const result = this.repo.findAll({ type, ...pagination, ...sort });
    sendPaginated(res, result.data, result.total, pagination.page, pagination.limit);
  };

  getById = (req: Request, res: Response) => {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) return sendError(res, 'Invalid category ID', 400, 'VALIDATION_ERROR');

    const cat = this.repo.findById(parsed.data.id);
    if (!cat) return sendError(res, `Category with id ${parsed.data.id} not found`, 404, 'NOT_FOUND');
    sendSuccess(res, cat);
  };

  create = (req: Request, res: Response) => {
    const parsed = createCategorySchema.safeParse(req.body);
    if (!parsed.success)
      return sendError(res, parsed.error.errors.map((e) => e.message).join(', '), 400, 'VALIDATION_ERROR');

    const cat = this.repo.create(parsed.data);
    sendSuccess(res, cat, 201);
  };

  update = (req: Request, res: Response) => {
    const idParsed = idParamSchema.safeParse(req.params);
    if (!idParsed.success) return sendError(res, 'Invalid category ID', 400, 'VALIDATION_ERROR');

    const bodyParsed = updateCategorySchema.safeParse(req.body);
    if (!bodyParsed.success)
      return sendError(res, bodyParsed.error.errors.map((e) => e.message).join(', '), 400, 'VALIDATION_ERROR');

    const cat = this.repo.update(idParsed.data.id, bodyParsed.data);
    if (!cat) return sendError(res, `Category with id ${idParsed.data.id} not found`, 404, 'NOT_FOUND');
    sendSuccess(res, cat);
  };

  delete = (req: Request, res: Response) => {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) return sendError(res, 'Invalid category ID', 400, 'VALIDATION_ERROR');

    const deleted = this.repo.delete(parsed.data.id);
    if (!deleted) return sendError(res, `Category with id ${parsed.data.id} not found`, 404, 'NOT_FOUND');
    sendSuccess(res, null, 204);
  };
}
