import { Request, Response, NextFunction, RequestHandler } from 'express';
type ParamsDictionary = Record<string, string>;
import { logger } from './logger.js';
import { SuccessResponse } from '@/core/success.response.js';

export const wrapRequestHandler = <
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Record<string, unknown>,
>(
  fn: (
    req: Request<P, ResBody, ReqBody, ReqQuery>,
    res: Response<ResBody>,
    next: NextFunction,
  ) => unknown,
): RequestHandler<P, ResBody, ReqBody, ReqQuery> => {
  return (
    req: Request<P, ResBody, ReqBody, ReqQuery>,
    res: Response<ResBody>,
    next: NextFunction,
  ) => {
    Promise.resolve(fn(req, res, next))
      .then((result) => {
        if (result instanceof SuccessResponse) {
          result.send(res);
        }
      })
      .catch((err) => {
        logger.error('Error caught in wrapRequestHandler:', err);
        next(err);
      });
  };
};

export const wrapAsyncHandler = wrapRequestHandler;
