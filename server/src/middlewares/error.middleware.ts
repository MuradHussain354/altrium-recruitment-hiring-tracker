import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Handle operational AppErrors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.name || 'Error',
      message: err.message,
      ...(err.details ? { details: err.details } : {})
    });
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'ValidationError',
      message: 'Invalid request input',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
    return;
  }

  // Handle unexpected errors (never log secrets or database connections)
  console.error('[UNHANDLED SERVER ERROR]', err.name, err.message);
  res.status(500).json({
    error: 'InternalServerError',
    message: 'An unexpected error occurred on the server.'
  });
};
