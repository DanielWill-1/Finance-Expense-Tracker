import type { Request, Response } from 'express';
import type { ApiResponse, HealthStatus } from '../types/api';
import { sqlite } from '../database/connection';

export function getHealth(_req: Request, res: Response<ApiResponse<HealthStatus>>): void {
  let databaseStatus: HealthStatus['database'] = 'disconnected';

  try {
    sqlite.prepare('SELECT 1').get();
    databaseStatus = 'connected';
  } catch {
    databaseStatus = 'error';
  }

  const health: HealthStatus = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: databaseStatus,
  };

  res.json({
    success: true,
    data: health,
  });
}
