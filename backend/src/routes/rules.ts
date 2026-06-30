import { Router } from 'express';
import { RulesController } from '../controllers/rulesController';

const router = Router();
const controller = new RulesController();

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

export default router;
