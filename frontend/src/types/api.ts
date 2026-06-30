export interface HealthStatus {
  status: 'ok';
  timestamp: string;
  uptime: number;
  environment: string;
  database: 'connected' | 'disconnected' | 'error';
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
