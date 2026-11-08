import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export function localRequestGuard(req: Request, res: Response, next: NextFunction): void {
  const host = (req.hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!env.ALLOW_REMOTE && !LOCAL_HOSTS.has(host)) {
    res.status(403).json({
      success: false,
      error: { code: 'LOCAL_ONLY', message: 'GhostLedger accepts local requests by default.' },
    });
    return;
  }

  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || !req.headers.origin) {
    next();
    return;
  }

  let originHost: string;
  let originAuthority: string;
  try {
    const origin = new URL(req.headers.origin);
    originHost = origin.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    originAuthority = origin.host.toLowerCase();
  } catch {
    res.status(403).json({
      success: false,
      error: { code: 'INVALID_ORIGIN', message: 'Request origin is not allowed.' },
    });
    return;
  }

  const sameHost = originAuthority === (req.get('host') || '').toLowerCase();
  const originPort = new URL(req.headers.origin).port;
  const allowedDevelopmentPorts = new Set(['5173']);
  if (env.NODE_ENV === 'test' && process.env.GHOSTLEDGER_E2E_FRONTEND_PORT)
    allowedDevelopmentPorts.add(process.env.GHOSTLEDGER_E2E_FRONTEND_PORT);
  const localDevelopmentOrigin =
    LOCAL_HOSTS.has(originHost) && allowedDevelopmentPorts.has(originPort);
  if (!sameHost && !localDevelopmentOrigin) {
    res.status(403).json({
      success: false,
      error: { code: 'INVALID_ORIGIN', message: 'Request origin is not allowed.' },
    });
    return;
  }
  next();
}
