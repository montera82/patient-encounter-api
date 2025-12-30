import { LoggerService } from './logger.service';
import { Logger as WinstonLogger } from 'winston';

const mockWinston = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
} as unknown as WinstonLogger;

jest.mock('./request-context.service', () => ({
  RequestContextService: {
    getRequestId: jest.fn(() => 'test-request-id'),
  },
}));

describe('LoggerService - PHI Redaction', () => {
  let loggerService: LoggerService;

  beforeEach(() => {
    jest.clearAllMocks();
    loggerService = new LoggerService(mockWinston);
  });

  describe('PHI field redaction', () => {
    const sensitiveFields = [
      'patientId', 'patient_id', 'PATIENTID',
      'providerId', 'provider_id',
      'encounterId', 'encounter_id',
      'userId', 'user_id',
      'clinicalData', 'notes', 'assessment', 'observations',
    ];

    sensitiveFields.forEach((field) => {
      it(`redacts ${field}`, () => {
        loggerService.info('Test message', {
          [field]: 'sensitive-data-123',
          normalField: 'safe-data',
        });

        expect(mockWinston.info).toHaveBeenCalledWith('Test message', {
          [field]: '[REDACTED - PHI]',
          normalField: 'safe-data',
          requestId: 'test-request-id',
        });
      });
    });

    it('redacts multiple PHI fields', () => {
      loggerService.info('Multiple PHI test', {
        patientId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        providerId: 'g58bd21c-69dd-5483-b678-1f13c3d4e590',
        notes: 'Patient has diabetes',
        clinicalData: { assessment: 'Condition stable' },
        safeField: 'this is ok',
        requestId: 'should-be-preserved',
      });

      expect(mockWinston.info).toHaveBeenCalledWith('Multiple PHI test', {
        patientId: '[REDACTED - PHI]',
        providerId: '[REDACTED - PHI]',
        notes: '[REDACTED - PHI]',
        clinicalData: '[REDACTED - PHI]',
        safeField: 'this is ok',
        requestId: 'should-be-preserved',
      });
    });

    it('handles nested objects', () => {
      loggerService.info('Nested object test', {
        request: {
          body: {
            patientId: 'secret-patient-id',
            encounterType: 'INITIAL_ASSESSMENT',
          },
        },
        metadata: {
          provider_id: 'secret-provider-id',
        },
      });

      const loggedContext = (mockWinston.info as jest.Mock).mock.calls[0][1];
      expect(loggedContext.request).toBeDefined();
      expect(loggedContext.metadata).toBeDefined();
    });

    it('preserves safe medical terms', () => {
      loggerService.info('Safe medical terms', {
        encounterType: 'INITIAL_ASSESSMENT',
        status: 'ACTIVE',
        department: 'CARDIOLOGY',
        action: 'CREATE_ENCOUNTER',
      });

      expect(mockWinston.info).toHaveBeenCalledWith('Safe medical terms', {
        encounterType: 'INITIAL_ASSESSMENT',
        status: 'ACTIVE',
        department: 'CARDIOLOGY',
        action: 'CREATE_ENCOUNTER',
        requestId: 'test-request-id',
      });
    });
  });

  describe('Error logging', () => {
    it('redacts PHI in error context', () => {
      const error = new Error('Database connection failed');
      loggerService.error('Operation failed', error, {
        patientId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        operation: 'CREATE_ENCOUNTER',
        timestamp: new Date().toISOString(),
      });

      expect(mockWinston.error).toHaveBeenCalledWith('Operation failed', {
        patientId: '[REDACTED - PHI]',
        operation: 'CREATE_ENCOUNTER',
        timestamp: expect.any(String),
        errorName: 'Error',
        requestId: 'test-request-id',
      });
    });
  });

  describe('Request ID handling', () => {
    it('adds requestId when not provided', () => {
      loggerService.info('Test message', { someField: 'someValue' });

      expect(mockWinston.info).toHaveBeenCalledWith('Test message', {
        someField: 'someValue',
        requestId: 'test-request-id',
      });
    });

    it('preserves existing requestId', () => {
      loggerService.info('Test message', {
        requestId: 'existing-request-id',
        someField: 'someValue',
      });

      expect(mockWinston.info).toHaveBeenCalledWith('Test message', {
        requestId: 'existing-request-id',
        someField: 'someValue',
      });
    });
  });

  describe('Edge cases', () => {
    it('handles undefined context', () => {
      loggerService.info('Test message');
      expect(mockWinston.info).toHaveBeenCalledWith('Test message', {
        requestId: 'test-request-id',
      });
    });

    it('handles null values', () => {
      loggerService.info('Test message', {
        patientId: null,
        normalField: 'value',
      });

      expect(mockWinston.info).toHaveBeenCalledWith('Test message', {
        patientId: '[REDACTED - PHI]',
        normalField: 'value',
        requestId: 'test-request-id',
      });
    });
  });
});
