import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError, ZodType } from 'zod';
import {
  UnprocessableEntityError,
  ErrorDetail,
} from '@/core/error.response.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      validated?: any;
    }
  }
}

type ValidateSchema = {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
};

export const validate =
  (schema: ValidateSchema): RequestHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated: any = {};

      if (schema.body) {
        validated.body = await schema.body.parseAsync(req.body);
      }

      if (schema.query) {
        validated.query = await schema.query.parseAsync(req.query);
      }

      if (schema.params) {
        validated.params = await schema.params.parseAsync(req.params);
      }

      req.validated = validated;

      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: ErrorDetail[] = error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return next(new UnprocessableEntityError('Validation failed', details));
      }

      return next(error);
    }
  };
