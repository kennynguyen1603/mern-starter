import { ErrorResponse } from '@/core/error.response.js';
import reasonPhrases from '@/core/reasonPhrases.js';
import httpStatusCode from '@/core/statusCodes.js';
import { logger } from '@/utils/logger.js';
import { sanitizeRequest } from '@/utils/pick.js';
import { ErrorRequestHandler } from 'express';
import _ from 'lodash';
const { omit } = _;

export const defaultErrorHandler: ErrorRequestHandler = (
  err,
  req,
  res,
  next,
) => {
  if (res.headersSent) return next(err);

  // Hide programming error in production
  if (process.env.NODE_ENV === 'production' && !err.isOperational) {
    err.status = httpStatusCode.INTERNAL_SERVER_ERROR;
    err.message = reasonPhrases.INTERNAL_SERVER_ERROR;
  }

  const status =
    err instanceof ErrorResponse
      ? err.status
      : err.status || err.statusCode || httpStatusCode.INTERNAL_SERVER_ERROR;

  logger.error(
    err.message || reasonPhrases.INTERNAL_SERVER_ERROR,
    'ErrorHandler',
    Array.isArray(req.headers['x-request-id'])
      ? req.headers['x-request-id'][0]
      : req.headers['x-request-id'] || 'NO_REQUEST_ID',
    {
      errorName: err.name,
      errorStack: err.stack,
      status,
      requestInfo: sanitizeRequest(req),
    },
  );

  res.setHeader('Content-Type', 'application/json');

  if (err instanceof ErrorResponse) {
    err.send(res);
    return;
  }

  // Handle generic / unknown runtime errors
  let details: any[] | undefined = err.details;

  if (process.env.NODE_ENV === 'development') {
    Object.getOwnPropertyNames(err).forEach((key) => {
      Object.defineProperty(err, key, { enumerable: true });
    });

    details = [
      {
        field: 'unknown',
        message: err.message,
        value: { ...omit(err, ['stack']) },
      },
    ];
  }

  res.status(status).json({
    error: {
      message: err.message || reasonPhrases.INTERNAL_SERVER_ERROR,
      status,
      details,
    },
  });
};
