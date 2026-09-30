import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { UserRole } from '../types';

// Extend Express's Request type so `req.user` is recognized by TypeScript.
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: UserRole };
    }
  }
}

// Middleware to verify JWT authentication tokens from request headers and attach user info to the request object
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization; // expected format: "Bearer <token>"

  // Check if the authorization header is missing or does not start with the Bearer scheme
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Missing or invalid Authorization header');
  }

  // Extract the token string from the Bearer header
  const token = authHeader.split(' ')[1];

  try {
    // Verify the token validity and extract user details into the request object
    const payload = verifyToken(token);
    req.user = { id: payload.userId, role: payload.role };
    next();
  } catch {
    // Throw an unauthorized error if token verification fails
    throw new ApiError(401, 'Invalid or expired token');
  }
}

// Higher-order middleware to restrict endpoint access based on allowed user roles
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Ensure the user has passed authentication and exists on the request
    if (!req.user) {
      throw new ApiError(401, 'You must be logged in');
    }
    // Check if the user's role matches one of the allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, `This action requires one of these roles: ${allowedRoles.join(', ')}`);
    }
    // Proceed to the next middleware or route handler if authorized
    next();
  };
}