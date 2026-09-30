import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

// Centralized error handling middleware to catch operational ApiErrors and unexpected server crashes
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Check if the thrown error is a custom operational ApiError with a specific status code
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Log unexpected errors to the server console for debugging
  console.error('Unexpected error:', err);
  
  // Return a generic 500 internal server error response for unhandled exceptions
  return res.status(500).json({ error: 'Something went wrong on our end.' });
}

// Catches requests to routes that don't exist at all and returns a 404 JSON response.
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}