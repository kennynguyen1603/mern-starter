import httpStatusCode from '@/core/statusCodes.js';
import reasonPhrases from '@/core/reasonPhrases.js';

export interface ErrorDetail {
  field: string;
  message: string;
  value?: any;
}

interface ErrorResponseParams {
  message?: string;
  statusCode?: number;
  reasonStatusCode?: string;
  data?: any;
  details?: ErrorDetail[];
  isOperational?: boolean;
}

export class ErrorResponse extends Error {
  status: number;
  data: any;
  details?: ErrorDetail[];
  isOperational: boolean;

  constructor({
    message,
    statusCode = httpStatusCode.INTERNAL_SERVER_ERROR,
    reasonStatusCode = reasonPhrases.INTERNAL_SERVER_ERROR,
    data = null,
    details,
    isOperational = true,
  }: ErrorResponseParams) {
    super(message || reasonStatusCode || 'Unknown error');
    this.name = this.constructor.name;
    this.status = statusCode;
    this.data = data;
    this.details = details;
    this.isOperational = isOperational;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  send(res: any, headers: Record<string, string> = {}) {
    Object.entries(headers).forEach(([key, value]) =>
      res.setHeader(key, value),
    );
    return res.status(this.status).json({
      error: {
        message: this.message,
        status: this.status,
        details: this.details,
      },
      data: this.data,
    });
  }
}

export const errorConverter = (err: any, req: any, res: any, next: any) => {
  let error = err;

  if (!(error instanceof ErrorResponse)) {
    const statusCode = error.statusCode || httpStatusCode.INTERNAL_SERVER_ERROR;
    const message = error.message || reasonPhrases.INTERNAL_SERVER_ERROR;

    error = new ErrorResponse({
      message,
      statusCode,
      isOperational: false,
    });
  }

  next(error);
};

export class BadRequestError extends ErrorResponse {
  constructor(message = reasonPhrases.BAD_REQUEST, data: any = null) {
    super({
      message,
      statusCode: httpStatusCode.BAD_REQUEST,
      reasonStatusCode: reasonPhrases.BAD_REQUEST,
      data,
    });
  }
}

export class UnauthorizedError extends ErrorResponse {
  constructor(message = reasonPhrases.UNAUTHORIZED, data: any = null) {
    super({
      message,
      statusCode: httpStatusCode.UNAUTHORIZED,
      reasonStatusCode: reasonPhrases.UNAUTHORIZED,
      data,
    });
  }
}

export class NotFoundError extends ErrorResponse {
  constructor(message = reasonPhrases.NOT_FOUND, data: any = null) {
    super({
      message,
      statusCode: httpStatusCode.NOT_FOUND,
      reasonStatusCode: reasonPhrases.NOT_FOUND,
      data,
    });
  }
}

export class ForbiddenError extends ErrorResponse {
  constructor(message = reasonPhrases.FORBIDDEN, data: any = null) {
    super({
      message,
      statusCode: httpStatusCode.FORBIDDEN,
      reasonStatusCode: reasonPhrases.FORBIDDEN,
      data,
    });
  }
}

export class ConflictError extends ErrorResponse {
  constructor(message = reasonPhrases.CONFLICT, data: any = null) {
    super({
      message,
      statusCode: httpStatusCode.CONFLICT,
      reasonStatusCode: reasonPhrases.CONFLICT,
      data,
    });
  }
}

export class InternalServerError extends ErrorResponse {
  constructor(message = reasonPhrases.INTERNAL_SERVER_ERROR, data: any = null) {
    super({
      message,
      statusCode: httpStatusCode.INTERNAL_SERVER_ERROR,
      reasonStatusCode: reasonPhrases.INTERNAL_SERVER_ERROR,
      data,
    });
  }
}

export class UnprocessableEntityError extends ErrorResponse {
  constructor(
    message = reasonPhrases.UNPROCESSABLE_ENTITY,
    details?: ErrorDetail[],
  ) {
    super({
      message,
      statusCode: httpStatusCode.UNPROCESSABLE_ENTITY,
      reasonStatusCode: reasonPhrases.UNPROCESSABLE_ENTITY,
      details,
    });
  }
}

export class TooManyRequestsError extends ErrorResponse {
  constructor(message = reasonPhrases.TOO_MANY_REQUESTS, data: any = null) {
    super({
      message,
      statusCode: httpStatusCode.TOO_MANY_REQUESTS,
      reasonStatusCode: reasonPhrases.TOO_MANY_REQUESTS,
      data,
    });
  }
}

export {
  BadRequestError as BAD_REQUEST,
  UnauthorizedError as UNAUTHORIZED,
  NotFoundError as NOT_FOUND,
  ForbiddenError as FORBIDDEN,
  ConflictError as CONFLICT,
  InternalServerError as INTERNAL_SERVER_ERROR,
  TooManyRequestsError as TOO_MANY_REQUESTS,
};
