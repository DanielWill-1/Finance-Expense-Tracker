import type { Request, Response } from 'express';
import { existsSync, unlinkSync } from 'fs';
import { DataOwnershipService } from '../services/dataOwnershipService';
import { AppError } from '../utils/errors';
import { sendError, sendSuccess } from '../utils/response';
import { z } from 'zod';

const purgeSchema = z.object({ confirmation: z.literal('PURGE') }).strict();

export class DataOwnershipController {
  private service = new DataOwnershipService();

  backup = async (_req: Request, res: Response): Promise<void> => {
    let filePath: string | undefined;
    try {
      filePath = await this.service.createDownloadBackup();
      res.set('Cache-Control', 'no-store');
      res.download(
        filePath,
        `ghostledger-backup-${new Date().toISOString().slice(0, 10)}.db`,
        (error) => {
          if (filePath && existsSync(filePath)) {
            try {
              unlinkSync(filePath);
            } catch {
              /* best-effort temporary-file cleanup */
            }
          }
          if (error && !res.headersSent)
            sendError(res, 'Database backup download failed', 500, 'BACKUP_FAILED');
        },
      );
    } catch (error) {
      if (filePath && existsSync(filePath)) {
        try {
          unlinkSync(filePath);
        } catch {
          /* best-effort temporary-file cleanup */
        }
      }
      if (error instanceof AppError) sendError(res, error.message, error.statusCode, error.code);
      else sendError(res, 'Database backup could not be created', 500, 'BACKUP_FAILED');
    }
  };

  restore = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        sendError(res, 'Select a GhostLedger .db backup file', 400, 'VALIDATION_ERROR');
        return;
      }
      const recoveryBackup = await this.service.restoreFrom(req.file.path);
      sendSuccess(res, { restored: true, recoveryBackup });
    } catch (error) {
      if (error instanceof AppError) sendError(res, error.message, error.statusCode, error.code);
      else
        sendError(
          res,
          'Database restore failed; the current data was not replaced',
          500,
          'RESTORE_FAILED',
        );
    } finally {
      if (req.file && existsSync(req.file.path)) {
        try {
          unlinkSync(req.file.path);
        } catch {
          /* best-effort upload cleanup */
        }
      }
    }
  };

  exportCSV = (_req: Request, res: Response): void => {
    try {
      const csv = this.service.exportTransactionsCSV();
      res
        .status(200)
        .type('text/csv; charset=utf-8')
        .set(
          'Content-Disposition',
          `attachment; filename="ghostledger-transactions-${new Date().toISOString().slice(0, 10)}.csv"`,
        )
        .set('Cache-Control', 'no-store')
        .send(csv);
    } catch {
      sendError(res, 'CSV export failed', 500, 'EXPORT_FAILED');
    }
  };

  purge = async (req: Request, res: Response): Promise<void> => {
    const parsed = purgeSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Confirm purge by sending {"confirmation":"PURGE"}', 400, 'VALIDATION_ERROR');
      return;
    }
    try {
      sendSuccess(res, await this.service.purgeAllData());
    } catch (error) {
      if (error instanceof AppError) sendError(res, error.message, error.statusCode, error.code);
      else sendError(res, 'Purge failed; the current data was not changed', 500, 'PURGE_FAILED');
    }
  };
}
