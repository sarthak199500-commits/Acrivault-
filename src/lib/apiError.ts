import { MockApiError } from '@/mocks/api';

export interface ApiErrorInfo {
  code?: string;
  message: string;
}

/** Normalize an unknown thrown value into a code + user-facing message. */
export function errorInfo(err: unknown): ApiErrorInfo {
  if (err instanceof MockApiError) return { code: err.code, message: err.message };
  if (err instanceof Error) return { message: err.message };
  return { message: 'Something went wrong. Please try again.' };
}
