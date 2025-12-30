import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedProvider } from '../types';

export const CurrentProvider = createParamDecorator(
  (
    data: keyof AuthenticatedProvider | undefined,
    ctx: ExecutionContext
  ): AuthenticatedProvider | any => { // eslint-disable-line
    const request = ctx.switchToHttp().getRequest();
    const provider = request.provider;

    return data ? provider?.[data] : provider;
  }
);

export const RequestId = createParamDecorator((data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  return request.requestId || request.headers['x-request-id'] || 'unknown';
});
