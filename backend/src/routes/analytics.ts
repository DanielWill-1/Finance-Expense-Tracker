import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';

const router = Router();
const controller = new AnalyticsController();

router.get('/summary', controller.summary);
router.get('/monthly', controller.monthly);
router.get('/weekly', controller.weekly);
router.get('/categories', controller.categories);
router.get('/spending-trends', controller.spendingTrends);
router.get('/largest-expenses', controller.largestExpenses);
router.get('/top-merchants', controller.topMerchants);
router.get('/recurring', controller.recurring);
router.get('/upcoming-recurring', controller.upcomingRecurring);

export default router;
