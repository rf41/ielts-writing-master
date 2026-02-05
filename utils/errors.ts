/**
 * Custom error classes for better error handling
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class QuotaExceededError extends AppError {
  constructor() {
    super(
      'Daily quota exceeded. Please use your own API key for unlimited access.',
      'QUOTA_EXCEEDED',
      429
    );
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network connection failed. Please check your internet.') {
    super(message, 'NETWORK_ERROR', 0);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class APIError extends AppError {
  constructor(message: string = 'API request failed') {
    super(message, 'API_ERROR', 500);
  }
}

/**
 * Type guard to check if error is an instance of AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}
