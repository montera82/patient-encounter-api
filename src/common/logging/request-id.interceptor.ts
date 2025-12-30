import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';
import { RequestContextService } from '../logging/request-context.service';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const requestId = (request.headers['x-request-id'] as string) || uuidv4();

    request.headers['x-request-id'] = requestId;
    (request as any).requestId = requestId; // eslint-disable-line @typescript-eslint/no-explicit-any

    response.setHeader('X-Request-ID', requestId);

    RequestContextService.setContext({
      requestId,
      timestamp: new Date(),
    });

    return next.handle();
  }
}
