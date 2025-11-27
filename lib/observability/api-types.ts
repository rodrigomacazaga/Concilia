/**
 * Standardized API Response Types
 * All API endpoints should use these types for consistency
 */

// Error codes for categorization
export enum ErrorCode {
  // 4xx Client Errors
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',

  // 5xx Server Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // Domain-specific
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  INVALID_API_KEY = 'INVALID_API_KEY',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
}

// Error details structure
export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  traceId?: string;
}

// Success response
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    traceId?: string;
    duration?: number;
  };
}

// Error response
export interface ApiErrorResponse {
  success: false;
  error: ApiError;
  meta?: {
    timestamp: string;
    traceId?: string;
  };
}

// Union type for all API responses
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Helper to create success response
export function createSuccessResponse<T>(
  data: T,
  meta?: { traceId?: string; duration?: number }
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

// Helper to create error response
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
  traceId?: string
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      traceId,
    },
    meta: {
      timestamp: new Date().toISOString(),
      traceId,
    },
  };
}

// HTTP status codes mapping
export const ERROR_STATUS_CODES: Record<ErrorCode, number> = {
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.VALIDATION_ERROR]: 422,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.TIMEOUT]: 504,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCode.PROJECT_NOT_FOUND]: 404,
  [ErrorCode.FILE_NOT_FOUND]: 404,
  [ErrorCode.INVALID_API_KEY]: 401,
  [ErrorCode.PROVIDER_ERROR]: 502,
};

// Get status code for error code
export function getStatusCode(code: ErrorCode): number {
  return ERROR_STATUS_CODES[code] || 500;
}

// Type guard to check if response is successful
export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is ApiSuccessResponse<T> {
  return response.success === true;
}

// Type guard to check if response is error
export function isErrorResponse<T>(
  response: ApiResponse<T>
): response is ApiErrorResponse {
  return response.success === false;
}

/**
 * Validation helpers
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
}

export function createValidationError(
  errors: Array<{ field: string; message: string }>,
  traceId?: string
): ApiErrorResponse {
  return createErrorResponse(
    ErrorCode.VALIDATION_ERROR,
    'Validation failed',
    { errors },
    traceId
  );
}
