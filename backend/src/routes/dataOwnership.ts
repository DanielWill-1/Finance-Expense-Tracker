import { randomUUID } from 'crypto';
import { chmodSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { chmod } from 'fs/promises';
import { tmpdir } from 'os';
import { extname, join } from 'path';
import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { ValidationError } from '../utils/errors';
import { DataOwnershipController } from '../controllers/dataOwnershipController';

const uploadDir = join(tmpdir(), 'ghostledger-restore-uploads');
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true, mode: 0o700 });
try {
  chmodSync(uploadDir, 0o700);
} catch {
  /* Windows ACLs govern directory access on Windows. */
}
for (const name of readdirSync(uploadDir)) {
  const file = join(uploadDir, name);
  try {
    if (Date.now() - statSync(file).mtimeMs > 24 * 60 * 60 * 1000) unlinkSync(file);
  } catch {
    /* ignore stale temporary-upload cleanup errors */
  }
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDir),
    filename: (_req, _file, callback) => callback(null, `${randomUUID()}.db`),
  }),
  limits: { fileSize: 250 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (
      ['.db', '.sqlite', '.sqlite3', '.backup'].includes(extname(file.originalname).toLowerCase())
    )
      callback(null, true);
    else
      callback(
        new ValidationError('Backup file must use a .db, .sqlite, .sqlite3, or .backup extension'),
      );
  },
});

const controller = new DataOwnershipController();
const router = Router();
const attempts = new Map<string, { count: number; resetAt: number }>();
function limitSensitiveActions(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  const key = req.ip ?? 'local';
  for (const [key, value] of attempts) if (value.resetAt <= now) attempts.delete(key);
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + 60_000 });
    next();
  } else if (entry.count >= 5) {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many database operations. Try again in a minute.',
      },
    });
  } else {
    entry.count++;
    next();
  }
}

async function protectRestoreUpload(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const uploadedPath = req.file?.path;
  if (!uploadedPath) return next();
  try {
    await chmod(uploadedPath, 0o600);
    next();
  } catch (error) {
    try {
      unlinkSync(uploadedPath);
    } catch {
      /* best-effort cleanup if permissions cannot be restricted */
    }
    next(error);
  }
}

router.get('/backup', limitSensitiveActions, controller.backup);
router.get('/export.csv', controller.exportCSV);
router.post(
  '/restore',
  limitSensitiveActions,
  upload.single('backup'),
  protectRestoreUpload,
  controller.restore,
);
router.delete('/', limitSensitiveActions, controller.purge);

export default router;
