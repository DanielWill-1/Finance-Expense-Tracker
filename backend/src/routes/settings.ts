import { Router } from 'express';
import { SettingsController } from '../controllers/settingsController';

const router = Router();
const controller = new SettingsController();

router.get('/', controller.getAll);
router.put('/', controller.update);

export default router;
