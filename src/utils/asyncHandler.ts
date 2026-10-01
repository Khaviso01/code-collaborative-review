import { Request, Response, NextFunction, RequestHandler } from 'express';

// Type definition for asynchronous Express route handler functions returning a Promise
type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<any>;

// Higher-order wrapper function to catch unhandled rejections in async route handlers and pass them to Express error middleware
export function asyncHandler(fn: AsyncFn): RequestHandler {
  return (req, res, next) => {
    // Execute the async handler and automatically catch any errors, forwarding them to the global error handler via next()
    fn(req, res, next).catch(next);
  };
}