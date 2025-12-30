import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { RequestContext } from '../types';

@Injectable()
export class RequestContextService {
  private static storage = new AsyncLocalStorage<RequestContext>();

  static setContext(context: RequestContext): void {
    RequestContextService.storage.enterWith(context);
  }

  static getContext(): RequestContext | undefined {
    return RequestContextService.storage.getStore();
  }

  static getRequestId(): string | undefined {
    const context = RequestContextService.getContext();
    return context?.requestId;
  }
}
