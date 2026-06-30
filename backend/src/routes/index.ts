import { Router } from 'express';
import healthRouter from './health';
import transactionRouter from './transactions';
import categoryRouter from './categories';
import accountRouter from './accounts';
import analyticsRouter from './analytics';
import settingsRouter from './settings';
import importRouter from './imports';
import rulesRouter from './rules';

const router = Router();

router.use('/health', healthRouter);
router.use('/transactions', transactionRouter);
router.use('/categories', categoryRouter);
router.use('/accounts', accountRouter);
router.use('/analytics', analyticsRouter);
router.use('/settings', settingsRouter);
router.use('/import', importRouter);
router.use('/rules', rulesRouter);

export default router;
