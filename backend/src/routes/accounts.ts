import { Router } from 'express';
import { AccountController } from '../controllers/accountController';

const router = Router();
const controller = new AccountController();

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

export default router;
