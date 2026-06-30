import { Router } from 'express';
import { TransactionController } from '../controllers/transactionController';
import { TransactionService } from '../services/transactionService';
import { TransactionRepository } from '../repositories/transactionRepository';

const router = Router();
const controller = new TransactionController(new TransactionService(new TransactionRepository()));

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

export default router;
