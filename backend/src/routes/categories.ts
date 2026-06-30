import { Router } from 'express';
import { CategoryController } from '../controllers/categoryController';

const router = Router();
const controller = new CategoryController();

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

export default router;
