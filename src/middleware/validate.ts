import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ApiError } from '../utils/ApiError';

// Higher-order middleware factory that validates incoming request bodies against a provided Zod schema
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Safely parse and validate the request body against the schema
    const result = schema.safeParse(req.body);

    // If validation fails, format Zod error details into a readable string and throw a 400 Bad Request error
    if (!result.success) {
      // Turn zod's error details into one readable message.
      const message = result.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      throw new ApiError(400, `Validation failed - ${message}`);
    }

    // Replace req.body with the successfully parsed and type-coerced data, then proceed
    req.body = result.data;
    next();
  };
}