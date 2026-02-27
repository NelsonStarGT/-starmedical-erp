export type SystemEventSeverity = "INFO" | "WARN" | "ERROR" | "CRITICAL";
export type PrismaSchemaClassification = "OPTIONAL" | "REQUIRED";
export type PrismaSchemaIssueKind = "missing_table" | "legacy_schema";

export type PrismaSchemaEventLogInput = {
  domain: string;
  context: string;
  issue: PrismaSchemaIssueKind;
  classification: PrismaSchemaClassification;
  code?: string | null;
  table?: string | null;
  actionHint?: string | null;
  detail?: string | null;
  tenantId?: string | null;
};

export type SystemEventLogItem = {
  id: string;
  createdAt: string;
  tenantId: string | null;
  domain: string;
  eventType: string;
  severity: SystemEventSeverity;
  code: string | null;
  resource: string | null;
  messageShort: string;
  digest: string;
  metaJson: Record<string, unknown> | null;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  resolutionNote: string | null;
};

export type SystemEventListResult = {
  source: "db" | "fallback";
  notice: string | null;
  items: SystemEventLogItem[];
};

export type ListSystemEventLogsInput = {
  tenantId?: string | null;
  includeGlobalTenantEvents?: boolean;
  domains?: string[];
  severities?: SystemEventSeverity[];
  eventTypes?: string[];
  from?: Date | null;
  to?: Date | null;
  limit?: number;
};

export type RecordSystemEventInput = {
  tenantId?: string | null;
  domain: string;
  eventType: string;
  severity: SystemEventSeverity;
  code?: string | null;
  resource?: string | null;
  messageShort: string;
  metaJson?: Record<string, unknown> | null;
  digestKey?: string | null;
};

export type ResolveSystemEventDigestInput = {
  digest: string;
  resolved: boolean;
  resolvedByUserId?: string | null;
  resolutionNote?: string | null;
  tenantId?: string | null;
  domain?: string | null;
};

export type PurgeSystemEventLogInput = {
  olderThanDays?: number;
  tenantId?: string | null;
};
