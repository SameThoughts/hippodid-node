/**
 * Base error for all HippoDid SDK errors.
 */
export class HippoDidError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number = 0, code: string = "UNKNOWN") {
    super(message);
    this.name = "HippoDidError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Thrown when a resource is not found (404).
 */
export class NotFoundError extends HippoDidError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

/**
 * Thrown when the API key is invalid or missing (401/403).
 */
export class AuthenticationError extends HippoDidError {
  constructor(message: string = "Authentication failed") {
    super(message, 401, "AUTHENTICATION_FAILED");
    this.name = "AuthenticationError";
  }
}

/**
 * Thrown when rate limited (429).
 */
export class RateLimitError extends HippoDidError {
  readonly retryAfterMs: number;

  constructor(message: string = "Rate limit exceeded", retryAfterMs: number = 0) {
    super(message, 429, "RATE_LIMITED");
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Thrown when server returns a validation error (400).
 */
export class ValidationError extends HippoDidError {
  constructor(message: string = "Validation failed", status: number = 400) {
    super(message, status, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}
