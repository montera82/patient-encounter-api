/* eslint-disable @typescript-eslint/no-explicit-any */
import { AuditService } from './audit.service';
import { CreateAuditLogData, AuditQueryParams } from '../types';

const mockAuditRepository = {
  create: jest.fn(),
  findMany: jest.fn(),
};

const mockLogger = {
  error: jest.fn(),
};

describe('AuditService', () => {
  let service: AuditService;
  let auditRepository: any;
  let logger: any;

  beforeEach(() => {
    jest.clearAllMocks();
    auditRepository = mockAuditRepository;
    logger = mockLogger;
    service = new AuditService(auditRepository, logger);
  });

  describe('createAuditLog', () => {
    const mockAuditData: CreateAuditLogData = {
      resourcePath: '/encounters',
      method: 'POST',
      providerId: 'user-789',
      requestId: 'req-123',
      requestData: { patientId: 'patient-123' },
    };

    it('should create audit log successfully', async () => {
      auditRepository.create.mockResolvedValue(undefined);

      await service.createAuditLog(mockAuditData);

      expect(auditRepository.create).toHaveBeenCalledWith(mockAuditData);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should handle audit log creation failure gracefully', async () => {
      const error = new Error('Database error');
      auditRepository.create.mockRejectedValue(error);

      await expect(service.createAuditLog(mockAuditData)).resolves.not.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        'Audit log creation failed',
        error,
        expect.objectContaining({
          requestId: mockAuditData.requestId,
          operation: 'audit.createAuditLog',
          resource: 'auditLog',
          success: false,
        })
      );
    });
  });

  describe('queryAuditLogs', () => {
    const mockQueryParams: AuditQueryParams = {
      startDate: '2023-01-01',
      endDate: '2023-12-31',
      resourcePath: '/encounters',
      page: 1,
      limit: 50,
    };

    const mockAuditLogs = [
      {
        id: 'audit-1',
        resourcePath: '/encounters',
        method: 'POST',
        providerId: 'user-789',
        requestId: 'req-123',
        timestamp: new Date(),
        requestData: {},
        responseData: {},
      },
    ];

    it('should query audit logs successfully', async () => {
      auditRepository.findMany.mockResolvedValue({
        auditLogs: mockAuditLogs,
        total: 1,
      });

      const result = await service.queryAuditLogs(mockQueryParams);

      expect(auditRepository.findMany).toHaveBeenCalledWith(mockQueryParams);
      expect(result).toEqual({
        data: mockAuditLogs,
        meta: {
          total: 1,
          page: 1,
          limit: 50,
          totalPages: 1,
        },
      });
    });

    it('should use default pagination values', async () => {
      const paramsWithoutPagination = {
        resourcePath: '/encounters',
      };

      auditRepository.findMany.mockResolvedValue({
        auditLogs: mockAuditLogs,
        total: 1,
      });

      const result = await service.queryAuditLogs(paramsWithoutPagination);

      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
    });
  });
});
