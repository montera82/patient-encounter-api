import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ApiKeyGuard } from './api-key.guard';
import { PrismaService } from '../prisma.service';
import { AppError } from '../app-error';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let prismaService: PrismaService;

  const mockRequest = {
    headers: { 'x-api-key': 'test-api-key' },
    ip: '127.0.0.1',
    requestId: 'test-request-id',
    provider: null as any,
  };

  const mockExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
    }),
  } as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyGuard,
        {
          provide: PrismaService,
          useValue: {
            provider: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should allow request with valid API key', async () => {
    const hashedKey = await bcrypt.hash('test-api-key', 10);
    jest.spyOn(prismaService.provider, 'findMany').mockResolvedValue([
      { id: 'provider-1', name: 'Test Provider', apiKey: hashedKey } as any,
    ]);

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
    expect(mockRequest.provider).toEqual({ id: 'provider-1', name: 'Test Provider' });
  });

  it('should reject request with missing API key', async () => {
    const requestWithoutKey = { headers: {}, ip: '127.0.0.1', requestId: 'test' };
    const contextWithoutKey = {
      switchToHttp: () => ({ getRequest: () => requestWithoutKey }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(contextWithoutKey)).rejects.toThrow(AppError);
  });
});
