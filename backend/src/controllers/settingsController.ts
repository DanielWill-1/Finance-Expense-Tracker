import type { Request, Response } from 'express';
import { SettingsService } from '../services/settingsService';
import { SettingsRepository } from '../repositories/settingsRepository';
import { sendSuccess, sendError } from '../utils/response';
import { settingsUpdateSchema } from '../validators/settings';

export class SettingsController {
  private service = new SettingsService(new SettingsRepository());

  getAll = (_req: Request, res: Response) => {
    const settings = this.service.getAll();
    const result: Record<string, string> = {};
    for (const s of settings) {
      if (settingsUpdateSchema.shape[s.key as keyof typeof settingsUpdateSchema.shape])
        result[s.key] = s.value;
    }
    sendSuccess(res, result);
  };

  update = (req: Request, res: Response) => {
    const parsed = settingsUpdateSchema.safeParse(req.body);
    if (!parsed.success)
      return sendError(
        res,
        parsed.error.issues.map((issue) => issue.message).join(', '),
        400,
        'VALIDATION_ERROR',
      );
    const settings = this.service.update(parsed.data);
    const result: Record<string, string> = {};
    for (const s of settings) {
      if (settingsUpdateSchema.shape[s.key as keyof typeof settingsUpdateSchema.shape])
        result[s.key] = s.value;
    }
    sendSuccess(res, result);
  };
}
