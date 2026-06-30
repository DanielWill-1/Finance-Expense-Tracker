import type { Request, Response } from 'express';
import { RuleRepository } from '../repositories/ruleRepository';
import { idParamSchema } from '../validators/common';
import { sendSuccess, sendError } from '../utils/response';

export class RulesController {
  private repo = new RuleRepository();

  list = (_req: Request, res: Response) => {
    const rules = this.repo.findAll();
    sendSuccess(res, rules);
  };

  getById = (req: Request, res: Response) => {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) return sendError(res, 'Invalid rule ID', 400, 'VALIDATION_ERROR');

    const rule = this.repo.findById(parsed.data.id);
    if (!rule) return sendError(res, 'Rule not found', 404, 'NOT_FOUND');
    sendSuccess(res, rule);
  };

  create = (req: Request, res: Response) => {
    const { priority, containsText, startsWith, endsWith, regex, categoryId, enabled } = req.body;

    if (!categoryId) {
      return sendError(res, 'categoryId is required', 400, 'VALIDATION_ERROR');
    }

    const rule = this.repo.create({
      priority,
      containsText,
      startsWith,
      endsWith,
      regex,
      categoryId,
      enabled,
    });
    sendSuccess(res, rule, 201);
  };

  update = (req: Request, res: Response) => {
    const idParsed = idParamSchema.safeParse(req.params);
    if (!idParsed.success) return sendError(res, 'Invalid rule ID', 400, 'VALIDATION_ERROR');

    const rule = this.repo.update(idParsed.data.id, req.body);
    if (!rule) return sendError(res, 'Rule not found', 404, 'NOT_FOUND');
    sendSuccess(res, rule);
  };

  delete = (req: Request, res: Response) => {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) return sendError(res, 'Invalid rule ID', 400, 'VALIDATION_ERROR');

    const deleted = this.repo.delete(parsed.data.id);
    if (!deleted) return sendError(res, 'Rule not found', 404, 'NOT_FOUND');
    sendSuccess(res, null, 204);
  };
}
