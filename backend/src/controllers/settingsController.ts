import type { Request, Response } from 'express';
import { SettingsService } from '../services/settingsService';
import { SettingsRepository } from '../repositories/settingsRepository';
import { sendSuccess, sendError } from '../utils/response';

export class SettingsController {
  private service = new SettingsService(new SettingsRepository());

  getAll = (_req: Request, res: Response) => {
    const settings = this.service.getAll();
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    sendSuccess(res, result);
  };

  update = (req: Request, res: Response) => {
    if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
      return sendError(res, 'Body must be an object of key-value pairs', 400, 'VALIDATION_ERROR');
    }

    const settings = this.service.update(req.body as Record<string, string>);
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    sendSuccess(res, result);
  };
}
