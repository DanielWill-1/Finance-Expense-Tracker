import { Router } from 'express';
import multer from 'multer';
import { resolve } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { ImportController } from '../controllers/importController';

const uploadDir = resolve(__dirname, '../../uploads');
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

const router = Router();
const controller = new ImportController();

router.post('/', upload.single('file'), controller.upload);
router.post('/:id/confirm', controller.confirm);
router.post('/:id/undo', controller.undo);
router.get('/history', controller.history);
router.get('/history/:id', controller.getById);

export default router;
