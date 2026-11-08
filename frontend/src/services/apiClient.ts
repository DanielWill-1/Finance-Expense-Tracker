import axios from 'axios';
import type { ApiResponse } from '../types/api';

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiResponse>(error)) {
    const message = error.response?.data?.error?.message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

export const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error(`API ${error.response.status}:`, error.response.data);
    } else if (error.request) {
      console.error('Network Error:', error.message);
    }
    return Promise.reject(error);
  },
);
