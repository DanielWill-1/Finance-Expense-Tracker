export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface HealthStatus {
  status: 'ok';
  timestamp: string;
  uptime: number;
  environment: string;
  database: 'connected' | 'disconnected' | 'error';
}
