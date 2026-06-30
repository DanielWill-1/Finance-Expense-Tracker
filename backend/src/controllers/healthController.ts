import type { Request, Response } from 'express';
import type { ApiResponse, HealthStatus } from '../types/api';
import { db } from '../database/connection';
import { sql } from 'drizzle-orm';

export async function getHealth(_req: Request, res: Response<ApiResponse<HealthStatus>>): Promise<void> {
  let databaseStatus: HealthStatus['database'] = 'disconnected';

  try {
    await db.run(sql`SELECT 1`);
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
