import { httpStatusCode, reasonPhrases } from '@/core/httpStatusCode.js';

interface SuccessResponseParams {
  message?: string;
  statusCode?: number;
  reasonStatusCode?: string;
  data?: any;
}

export class SuccessResponse {
  message: string;
  status: number;
  data: any;

  constructor({
    message,
    statusCode = httpStatusCode.OK,
    reasonStatusCode = reasonPhrases.OK,
    data = null,
  }: SuccessResponseParams) {
    this.message = message || reasonStatusCode || 'Success';
    this.status = statusCode;
    this.data = data;
  }

  send(res: any, headers: Record<string, string> = {}) {
    Object.entries(headers).forEach(([key, value]) =>
      res.setHeader(key, value),
    );
    return res.status(this.status).json({
      message: this.message,
      status: this.status,
      data: this.data,
    });
  }
}

export class OkResponse extends SuccessResponse {
  constructor({
    message = reasonPhrases.OK,
    data = null,
  }: { message?: string; data?: any } = {}) {
    super({
      message,
      statusCode: httpStatusCode.OK,
      reasonStatusCode: reasonPhrases.OK,
      data,
    });
  }
}

export class CreatedResponse extends SuccessResponse {
  constructor({
    message = reasonPhrases.CREATED,
    data = null,
  }: { message?: string; data?: any } = {}) {
    super({
      message,
      statusCode: httpStatusCode.CREATED,
      reasonStatusCode: reasonPhrases.CREATED,
      data,
    });
  }
}

export { OkResponse as OK, CreatedResponse as CREATED };
