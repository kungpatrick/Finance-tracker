import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Global Error Handler:', err); // Log the error for debugging

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors,
    });
  }

  // Postgres Unique Violation (e.g. duplicate category name for a user)
  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Conflict: A record with this unique identifier already exists.',
      detail: err.detail
    });
  }

  // Generic server error
  res.status(err.statusCode || 500).json({
    error: err.message || 'Something went wrong',
  });
};

export default errorHandler;