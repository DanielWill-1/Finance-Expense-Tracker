import type { Request, Response } from 'express';
import { AnalyticsService } from '../services/analyticsService';
import { TransactionRepository } from '../repositories/transactionRepository';
import {
  analyticsSummaryQuerySchema,
  analyticsMonthlyQuerySchema,
  analyticsCategoriesQuerySchema,
  analyticsWeeksQuerySchema,
  analyticsMonthsQuerySchema,
  analyticsLimitQuerySchema,
} from '../validators/analytics';
import { sendSuccess, sendError } from '../utils/response';

export class AnalyticsController {
  private service = new AnalyticsService(new TransactionRepository());

  summary = (req: Request, res: Response) => {
    const parsed = analyticsSummaryQuerySchema.safeParse(req.query);
    if (!parsed.success)
      return sendError(
        res,
        parsed.error.issues.map((e) => e.message).join(', '),
        400,
        'VALIDATION_ERROR',
      );

    const result = this.service.getSummary(
      parsed.data.startDate,
      parsed.data.endDate,
      parsed.data.accountId,
    );
    sendSuccess(res, result);
  };

  monthly = (req: Request, res: Response) => {
    const parsed = analyticsMonthlyQuerySchema.safeParse(req.query);
    if (!parsed.success)
      return sendError(
        res,
        parsed.error.issues.map((e) => e.message).join(', '),
        400,
        'VALIDATION_ERROR',
      );

    const result = this.service.getMonthlyTotals(
      parsed.data.year,
      parsed.data.months,
      parsed.data.accountId,
    );
    sendSuccess(res, result);
  };

  weekly = (req: Request, res: Response) => {
    const parsed = analyticsWeeksQuerySchema.safeParse(req.query);
    if (!parsed.success)
      return sendError(
        res,
        parsed.error.issues.map((issue) => issue.message).join(', '),
        400,
        'VALIDATION_ERROR',
      );
    const result = this.service.getWeeklyTotals(parsed.data.weeks, parsed.data.accountId);
    sendSuccess(res, result);
  };

  categories = (req: Request, res: Response) => {
    const parsed = analyticsCategoriesQuerySchema.safeParse(req.query);
    if (!parsed.success)
      return sendError(
        res,
        parsed.error.issues.map((e) => e.message).join(', '),
        400,
        'VALIDATION_ERROR',
      );

    const result = this.service.getCategoryTotals(
      parsed.data.type ?? 'expense',
      parsed.data.startDate,
      parsed.data.endDate,
      parsed.data.accountId,
    );
    sendSuccess(res, result);
  };

  spendingTrends = (req: Request, res: Response) => {
    const parsed = analyticsMonthsQuerySchema.safeParse(req.query);
    if (!parsed.success)
      return sendError(
        res,
        parsed.error.issues.map((issue) => issue.message).join(', '),
        400,
        'VALIDATION_ERROR',
      );
    const result = this.service.getSpendingTrends(parsed.data.months);
    sendSuccess(res, result);
  };

  largestExpenses = (req: Request, res: Response) => {
    const parsed = analyticsLimitQuerySchema.safeParse(req.query);
    if (!parsed.success)
      return sendError(
        res,
        parsed.error.issues.map((issue) => issue.message).join(', '),
        400,
        'VALIDATION_ERROR',
      );
    const result = this.service.getLargestExpenses(parsed.data.limit);
    sendSuccess(res, result);
  };

  topMerchants = (req: Request, res: Response) => {
    const parsed = analyticsLimitQuerySchema.safeParse(req.query);
    if (!parsed.success)
      return sendError(
        res,
        parsed.error.issues.map((issue) => issue.message).join(', '),
        400,
        'VALIDATION_ERROR',
      );
    const result = this.service.getTopMerchants(parsed.data.limit);
    sendSuccess(res, result);
  };

  recurring = (_req: Request, res: Response) => {
    const result = this.service.getRecurringTransactions();
    sendSuccess(res, result);
  };

  upcomingRecurring = (_req: Request, res: Response) => {
    const result = this.service.getUpcomingRecurring();
    sendSuccess(res, result);
  };
}
