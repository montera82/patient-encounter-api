import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

import { AppError } from './app-error';
import { LoggerService } from './logging/logger.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const requestId = request.headers['x-request-id'] as string;

    if (exception instanceof AppError) {
      this.handleAppError(exception, request, response);
    } else if (exception instanceof ZodError) {
      this.handleZodError(exception, request, response, requestId);
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.handlePrismaError(exception, request, response, requestId);
    } else if (exception instanceof HttpException) {
      this.handleHttpException(exception, request, response, requestId);
    } else {
      this.handleUnknownError(exception, request, response, requestId);
    }
  }

  private handleAppError(error: AppError, request: Request, response: Response) {
    if (error.isOperational) {
      this.logger.info('Operational application error', {
        requestId: error.context?.requestId as string,
        operation: 'appError',
        resourcePath: request.url,
        success: false,
        statusCode: error.httpStatus,
      });
    } else {
      this.logger.error('System application error', error, {
        requestId: error.context?.requestId as string,
        operation: 'appError',
        resourcePath: request.url,
        success: false,
        statusCode: error.httpStatus,
      });
    }

    if (error.requestId) {
      response.setHeader('X-Request-ID', error.requestId);
    }

    response.status(error.httpStatus).json(error.toClientResponse());
  }

  private handleZodError(
    error: ZodError,
    request: Request,
    response: Response,
    requestId?: string
  ) {
    const safeValidationErrors = error.errors.map((err) => ({
      field: err.path.join('.'),
      code: err.code,
    }));

    this.logger.info('Validation error occurred', {
      requestId,
      operation: 'validation',
      resource: 'validation',
      success: false,
      statusCode: HttpStatus.BAD_REQUEST,
      errorCount: error.errors.length,
    });

    const appError = new AppError(
      'Validation failed',
      HttpStatus.BAD_REQUEST,
      undefined,
      { validationErrors: safeValidationErrors },
      requestId
    );

    response.setHeader('X-Request-ID', requestId || 'unknown');

    response.status(HttpStatus.BAD_REQUEST).json({
      ...appError.toClientResponse(),
      details: {
        validationErrors: safeValidationErrors.map((err) => ({
          field: err.field,
          message: 'Invalid value provided',
        })),
      },
    });
  }

  private handlePrismaError(
    error: Prisma.PrismaClientKnownRequestError,
    request: Request,
    response: Response,
    requestId?: string
  ) {
    let appError: AppError;

    switch (error.code) {
      case 'P2002':
        appError = AppError.conflict(
          `Unique constraint violation: ${error.message}`,
          undefined,
          { target: error.meta?.target },
          requestId
        );
        break;
      case 'P2025':
        appError = AppError.notFound(
          `Record not found: ${error.message}`,
          undefined,
          undefined,
          requestId
        );
        break;
      case 'P2003':
        appError = AppError.badRequest(
          `Foreign key constraint violation: ${error.message}`,
          undefined,
          undefined,
          requestId
        );
        break;
      default:
        appError = AppError.internal(
          `Database error: ${error.message}`,
          undefined,
          { code: error.code },
          requestId
        );
    }

    this.handleAppError(appError, request, response);
  }

  private handleHttpException(
    exception: HttpException,
    request: Request,
    response: Response,
    requestId?: string
  ) {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const appError = new AppError(
      exception.message,
      status,
      undefined,
      { originalResponse: exceptionResponse },
      requestId
    );

    this.handleAppError(appError, request, response);
  }

  private handleUnknownError(
    error: unknown,
    request: Request,
    response: Response,
    requestId?: string
  ) {
    this.logger.error('Unhandled exception occurred', error as Error, {
      operation: 'unknownError',
      resourcePath: request.url,
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });

    const appError = AppError.internal(
      'An unexpected error occurred',
      undefined,
      undefined,
      requestId
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(appError.toClientResponse());
  }
}
