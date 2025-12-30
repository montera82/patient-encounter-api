import { JsonValue } from '@prisma/client/runtime/library';

export class AuditLogEntity {
  id: string;
  resourcePath: string;
  method: string;
  providerId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  requestData?: JsonValue;
  responseData?: JsonValue;
  action?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  fieldsAccessed?: string[];
  timestamp: Date;

  constructor(data: {
    id: string;
    resourcePath: string;
    method: string;
    providerId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    requestId?: string | null;
    requestData?: JsonValue;
    responseData?: JsonValue;
    action?: string | null;
    resourceType?: string | null;
    resourceId?: string | null;
    fieldsAccessed?: string[];
    timestamp: Date;
  }) {
    this.id = data.id;
    this.resourcePath = data.resourcePath;
    this.method = data.method;
    this.providerId = data.providerId;
    this.ipAddress = data.ipAddress;
    this.userAgent = data.userAgent;
    this.requestId = data.requestId;
    this.requestData = data.requestData;
    this.responseData = data.responseData;
    this.action = data.action;
    this.resourceType = data.resourceType;
    this.resourceId = data.resourceId;
    this.fieldsAccessed = data.fieldsAccessed || [];
    this.timestamp = data.timestamp;
  }
}
