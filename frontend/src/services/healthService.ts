import { apiClient } from './apiClient';
import type { ApiResponse, HealthStatus } from '../types/api';

export async function fetchHealth(): Promise<ApiResponse<HealthStatus>> {
  const { data } = await apiClient.get<ApiResponse<HealthStatus>>('/health');
  return data;
}
