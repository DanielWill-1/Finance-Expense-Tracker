import { Router } from 'express';
import { AssistantController } from '../controllers/assistantController';

const router = Router();
const controller = new AssistantController();

router.get('/status', controller.status);
router.post('/test', controller.test);
router.post('/chat', controller.chat);
router.get('/credentials/:provider', controller.credentialStatus);
router.put('/credentials/:provider', controller.saveCredential);
router.delete('/credentials/:provider', controller.removeCredential);

export default router;
