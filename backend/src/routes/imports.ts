import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { ImportController } from '../controllers/importController';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

const router = Router();
const controller = new ImportController();

const uploadAttempts = new Map<string, { count: number; resetAt: number }>();
function limitUploads(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  for (const [address, attempt] of uploadAttempts) {
    if (attempt.resetAt <= now) uploadAttempts.delete(address);
  }
  const key = req.ip ?? 'local';
  const current = uploadAttempts.get(key);
  if (!current || current.resetAt <= now) {
    uploadAttempts.set(key, { count: 1, resetAt: now + 60_000 });
    next();
    return;
  }
  if (current.count >= 10) {
    res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many uploads. Try again in a minute.' },
    });
    return;
  }
  current.count++;
  next();
}

router.post('/', limitUploads, upload.single('file'), controller.upload);
router.post('/:id/confirm', controller.confirm);
router.post('/:id/undo', controller.undo);
router.get('/history', controller.history);
router.get('/history/:id', controller.getById);

export default router;
