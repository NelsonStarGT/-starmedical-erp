export type OpsHealthGlobalStatus = "ok" | "degraded" | "down";

export type OpsHealthServiceStatus = "up" | "down" | "degraded" | "optional_down";

export type OpsHealthServiceReport = {
  serviceKey: string;
  label: string;
  status: OpsHealthServiceStatus;
  required: boolean;
  latencyMs: number | null;
  checkedAt: string;
  detail?: string;
  httpStatus?: number | null;
  target?: string | null;
};

export type OpsBuildInfo = {
  commit: string;
  version: string;
  nodeEnv: string;
};

export type OpsHealthSnapshot = {
  status: OpsHealthGlobalStatus;
  timestamp: string;
  durationMs: number;
  build: OpsBuildInfo;
  services: OpsHealthServiceReport[];
};

export type OpsHealthHistoryRow = {
  id: string;
  checkId: string;
  checkCreatedAt: string;
  globalStatus: OpsHealthGlobalStatus;
  serviceKey: string;
  serviceLabel: string;
  serviceStatus: OpsHealthServiceStatus;
  required: boolean;
  latencyMs: number | null;
  checkedAt: string;
  detail: string | null;
  requestId: string | null;
  source: string | null;
  actorUserId: string | null;
  actorRole: string | null;
};

export type OpsAuditRow = {
  id: string;
  createdAt: string;
  actorUserId: string | null;
  actorRole: string | null;
  action: string;
  module: string | null;
  tenantId: string | null;
  branchId: string | null;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  metadata: Record<string, unknown>;
};

export type OpsMetricsRange = "5m" | "15m" | "1h";

export type OpsMetricsServiceStatus = "up" | "down";

export type OpsMetricsServiceRow = {
  serviceKey: string;
  status: OpsMetricsServiceStatus;
  sampleWindow: OpsMetricsRange;
  cpuPercent: number;
  cpuPct: number;
  memoryBytes: number;
  memBytes: number;
  memoryPercent: number | null;
  memPct: number | null;
  networkRxBytesPerSec: number;
  netRxBytes: number;
  networkTxBytesPerSec: number;
  netTxBytes: number;
  bandwidthBytesPerSec: number;
  checkedAt: string;
};

export type OpsMetricsSnapshot = {
  status: OpsHealthGlobalStatus;
  timestamp: string;
  range: OpsMetricsRange;
  projectName: string;
  durationMs: number;
  services: OpsMetricsServiceRow[];
};

export type OpsMetricsHistoryRow = {
  id: string;
  snapshotId: string;
  createdAt: string;
  tenantId: string | null;
  projectName: string;
  range: OpsMetricsRange;
  globalStatus: OpsHealthGlobalStatus;
  source: string | null;
  requestId: string | null;
  serviceKey: string;
  serviceStatus: OpsMetricsServiceStatus;
  cpuPercent: number;
  memoryBytes: number;
  memoryPercent: number | null;
  netRxBps: number;
  netTxBps: number;
  bandwidthBps: number;
  checkedAt: string;
};

export type OpsAlertLevel = "info" | "warning" | "critical";

export type OpsAlertType = "health_transition" | "metrics_threshold" | "service_down" | "recovery";

export type OpsAlertEventRow = {
  id: string;
  createdAt: string;
  tenantId: string | null;
  branchId: string | null;
  level: OpsAlertLevel;
  type: OpsAlertType;
  fromStatus: string | null;
  toStatus: string | null;
  serviceKey: string | null;
  summary: string;
  detailJson: Record<string, unknown>;
  dedupeKey: string;
  cooldownUntil: string | null;
  requestId: string | null;
  source: string | null;
};

export type OpsSchedulerChannels = {
  email: boolean;
  whatsapp: boolean;
};

export type OpsSchedulerRecipients = {
  emails: string[];
  whatsapp: string[];
};

export type OpsSchedulerConfig = {
  tenantId: string;
  enabled: boolean;
  frequencySeconds: number;
  channels: OpsSchedulerChannels;
  recipients: OpsSchedulerRecipients;
  createdAt: string;
  updatedAt: string;
};

export type OpsSchedulerConfigPublic = OpsSchedulerConfig & {
  maskedRecipients: OpsSchedulerRecipients;
};

export type OpsResourceRecommendation = {
  service: string;
  recommendedCpus: number;
  recommendedMemoryMb: number;
  reason: string;
  whenToIncrease: string;
};

export type OpsResourceConfig = {
  cpus: number;
  memoryMb: number;
};

export type OpsResourcesState = {
  tenantId: string;
  projectName: string;
  services: Record<string, OpsResourceConfig>;
  updatedAt: string;
  overrideFile: string;
  recommendations: OpsResourceRecommendation[];
};

export type OpsDataResetScope = "module" | "global";

export type OpsDataResetModule =
  | "inventory_runtime"
  | "ops_health"
  | "processing_jobs"
  | "portal_runtime";

export type OpsDataResetModuleSummary = {
  module: OpsDataResetModule;
  title: string;
  description: string;
  warning: string;
  tables: string[];
};

export type OpsDataResetResult = {
  scope: OpsDataResetScope;
  module: OpsDataResetModule | null;
  executedAt: string;
  tenantId: string | null;
  summary: Record<string, number>;
  touchedTables: string[];
};
