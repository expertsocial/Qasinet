export type ErrorCategory =
  | 'VALIDATION_ERROR'
  | 'PAYMENT_ERROR'
  | 'PROVIDER_ERROR'
  | 'TIMEOUT'
  | 'DUPLICATE_REQUEST'
  | 'INSUFFICIENT_FLOAT'
  | 'SERVICE_UNAVAILABLE'
  | 'UNKNOWN';

export class QasiNetError extends Error {
  public readonly category: ErrorCategory;
  public readonly internalDetails?: any;
  public readonly isQasiNetError = true;

  constructor(category: ErrorCategory, message: string, internalDetails?: any) {
    super(message);
    this.name = 'QasiNetError';
    this.category = category;
    this.internalDetails = internalDetails;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, QasiNetError);
    }
  }

  // Prevents leaking internal details/secrets to the client
  public toClientResponse() {
    return {
      error: this.category,
      message: this.message,
    };
  }
}
