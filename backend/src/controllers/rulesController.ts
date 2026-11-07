import type { Request, Response } from 'express';
import { RuleRepository, type UpdateRuleRecord } from '../repositories/ruleRepository';
import { idParamSchema } from '../validators/common';
import { sendSuccess, sendError } from '../utils/response';
import { createRuleSchema, hasCondition, updateRuleSchema } from '../validators/rule';

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
    const parsed = createRuleSchema.safeParse(req.body);
    if (!parsed.success)
      return sendError(
        res,
        parsed.error.issues.map((issue) => issue.message).join(', '),
        400,
        'VALIDATION_ERROR',
      );
    const rule = this.repo.create({
      priority: parsed.data.priority ?? 0,
      containsText: parsed.data.containsText ?? null,
      startsWith: parsed.data.startsWith ?? null,
      endsWith: parsed.data.endsWith ?? null,
      regex: parsed.data.regex ?? null,
      categoryId: parsed.data.categoryId,
      enabled: parsed.data.enabled ?? true,
    });
    sendSuccess(res, rule, 201);
  };

  update = (req: Request, res: Response) => {
    const idParsed = idParamSchema.safeParse(req.params);
    if (!idParsed.success) return sendError(res, 'Invalid rule ID', 400, 'VALIDATION_ERROR');

    const bodyParsed = updateRuleSchema.safeParse(req.body);
    if (!bodyParsed.success)
      return sendError(
        res,
        bodyParsed.error.issues.map((issue) => issue.message).join(', '),
        400,
        'VALIDATION_ERROR',
      );
    const existing = this.repo.findById(idParsed.data.id);
    if (!existing) return sendError(res, 'Rule not found', 404, 'NOT_FOUND');
    const merged = {
      containsText:
        bodyParsed.data.containsText === undefined
          ? existing.contains_text
          : bodyParsed.data.containsText,
      startsWith:
        bodyParsed.data.startsWith === undefined
          ? existing.starts_with
          : bodyParsed.data.startsWith,
      endsWith:
        bodyParsed.data.endsWith === undefined ? existing.ends_with : bodyParsed.data.endsWith,
      regex: bodyParsed.data.regex === undefined ? existing.regex : bodyParsed.data.regex,
    };
    if (!hasCondition(merged))
      return sendError(res, 'At least one match condition is required', 400, 'VALIDATION_ERROR');
    const update = bodyParsed.data;
    const changes: UpdateRuleRecord = {};
    if (update.priority !== undefined) changes.priority = update.priority;
    if (update.containsText !== undefined) changes.containsText = update.containsText;
    if (update.startsWith !== undefined) changes.startsWith = update.startsWith;
    if (update.endsWith !== undefined) changes.endsWith = update.endsWith;
    if (update.regex !== undefined) changes.regex = update.regex;
    if (update.categoryId !== undefined) changes.categoryId = update.categoryId;
    if (update.enabled !== undefined) changes.enabled = update.enabled;
    const rule = this.repo.update(idParsed.data.id, changes);
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
