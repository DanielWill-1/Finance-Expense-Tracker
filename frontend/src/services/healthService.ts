import { apiClient } from './apiClient';
import type { ApiResponse } from '../types/api';

interface HealthStatus {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
  database: string;
}

export async function fetchHealth(): Promise<ApiResponse<HealthStatus>> {
  const { data } = await apiClient.get<ApiResponse<HealthStatus>>('/health');
  return data;
}
