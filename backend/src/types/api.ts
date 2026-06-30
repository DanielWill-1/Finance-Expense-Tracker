export type ApiResponse<T = unknown> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
    };

export type HealthStatus = {
  status: 'ok';
  timestamp: string;
  uptime: number;
  environment: string;
  database: 'connected' | 'disconnected' | 'error';
};
