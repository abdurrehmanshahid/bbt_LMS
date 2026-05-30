import {
  ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type { Request, Response } from 'express';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status: number =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= 500) {
      Sentry.captureException(exception, {
        extra: { url: request.url, method: request.method },
      });
      this.logger.error(exception);
    }

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    response.status(status).json(
      typeof message === 'object' ? message : { statusCode: status, message },
    );
  }
}
