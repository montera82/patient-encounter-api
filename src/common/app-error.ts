/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpStatus } from '@nestjs/common';

export class AppError extends Error {
  public readonly httpStatus: HttpStatus;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly requestId?: string;
  public readonly internalMessage?: string;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    httpStatus: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    internalMessage?: string,
    context?: Record<string, any>,
    requestId?: string,
    isOperational: boolean = true
  ) {
    super(message);

    this.name = 'AppError';
    this.httpStatus = httpStatus;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.requestId = requestId;
    this.internalMessage = internalMessage;
    this.context = this.sanitizeContext(context);

    Error.captureStackTrace(this, this.constructor);
  }

  public toClientResponse() {
    return {
      error: {
        message: this.message,
        timestamp: this.timestamp.toISOString(),
      },
    };
  }

  public toLogObject() {
    return {
      name: this.name,
      message: this.message,
      internalMessage: this.internalMessage,
      httpStatus: this.httpStatus,
      isOperational: this.isOperational,
      timestamp: this.timestamp.toISOString(),
      requestId: this.requestId,
      context: this.context,
      stack: this.stack,
    };
  }

  private sanitizeContext(context?: Record<string, any>): Record<string, any> | undefined {
    if (!context) {
      return undefined;
    }

    const sanitized = { ...context };
    const sensitiveFields = [
      'password',
      'medicalRecordNumber',
      'dateOfBirth',
      'patientId',
      'apiKey',
      'token',
    ];

    function redactObject(obj: any, depth = 0): any {
      if (depth > 3) {
        return '[MAX_DEPTH_REACHED]';
      }

      if (obj === null || typeof obj !== 'object') {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map((item) => redactObject(item, depth + 1));
      }

      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();

        if (sensitiveFields.some((field) => lowerKey.includes(field.toLowerCase()))) {
          result[key] = '[REDACTED]';
        } else {
          result[key] = redactObject(value, depth + 1);
        }
      }
      return result;
    }

    return redactObject(sanitized);
  }

  static notFound(
    message: string = 'Resource not found',
    internalMessage?: string,
    context?: Record<string, any>,
    requestId?: string
  ): AppError {
    return new AppError(message, HttpStatus.NOT_FOUND, internalMessage, context, requestId);
  }

  static unauthorized(
    message: string = 'Unauthorized access',
    internalMessage?: string,
    context?: Record<string, any>,
    requestId?: string
  ): AppError {
    return new AppError(message, HttpStatus.UNAUTHORIZED, internalMessage, context, requestId);
  }

  static badRequest(
    message: string = 'Bad request',
    internalMessage?: string,
    context?: Record<string, any>,
    requestId?: string
  ): AppError {
    return new AppError(message, HttpStatus.BAD_REQUEST, internalMessage, context, requestId);
  }

  static conflict(
    message: string = 'Resource conflict',
    internalMessage?: string,
    context?: Record<string, any>,
    requestId?: string
  ): AppError {
    return new AppError(message, HttpStatus.CONFLICT, internalMessage, context, requestId);
  }

  static internal(
    message: string = 'Internal server error',
    internalMessage?: string,
    context?: Record<string, any>,
    requestId?: string
  ): AppError {
    return new AppError(
      message,
      HttpStatus.INTERNAL_SERVER_ERROR,
      internalMessage,
      context,
      requestId,
      false
    );
  }
}
