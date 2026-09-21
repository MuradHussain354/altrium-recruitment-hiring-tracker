export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(statusCode: number, message: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;

    if (statusCode === 401) {
      this.name = 'Unauthorized';
    } else if (statusCode === 403) {
      this.name = 'Forbidden';
    } else if (statusCode === 404) {
      this.name = 'NotFound';
    } else if (statusCode === 400) {
      this.name = 'BadRequest';
    }

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
