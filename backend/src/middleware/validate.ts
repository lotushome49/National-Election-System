import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type Target = 'body' | 'query' | 'params';

/**
 * Zod validation middleware factory.
 *
 * Usage:
 *   router.post('/login', validate(loginSchema), handler)
 *   router.get('/users', validate(paginationSchema, 'query'), handler)
 */
export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      // Let the global error handler format the ZodError
      return next(result.error);
    }

    // Replace with parsed (coerced + stripped) data
    req[target] = result.data;
    next();
  };
}
