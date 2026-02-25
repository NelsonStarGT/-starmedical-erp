"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

type TabId =
  | "actividad"
  | "artefactos"
  | "plantillas"
  | "politicas"
  | "almacenamiento"
  | "salud"
  | "auditoria";

type JobStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";

type JobType =
  | "excel_export"
  | "excel_import"
  | "docx_render"
  | "pdf_render"
  | "image_transform"
  | "google_sheets_export"
  | "drive_upload";

type JobArtifact = {
  key: string;
  provider: string;
  mime?: string | null;
  size?: number | null;
  checksum?: string | null;
  signedUrl?: string | null;
};

type JobRecord = {
  jobId: string;
  tenantId: string;
  actorId: string;
  jobType: JobType;
  status: JobStatus;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  params?: Record<string, unknown>;
  limits?: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  error?: { message?: string } | null;
  artifacts: JobArtifact[];
};

type ArtifactRecord = JobArtifact & {
  jobId: string;
  tenantId: string;
  actorId: string;
  jobType: JobType;
  status: JobStatus;
  createdAt: string;
  finishedAt?: string | null;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
};

type TenantProcessingConfig = {
  tenantId: string;
  enabled: boolean;
  storageProvider: "s3" | "gcs" | "minio";
  bucket: string;
  prefix: string;
  retentionDaysByJobType: Record<string, number>;
  maxUploadMB: number;
  maxRowsExcel: number;
  maxPagesPdf: number;
  timeoutMs: number;
  maxConcurrency: number;
  allowedJobTypes: JobType[];
  notifyOnFailure: boolean;
  updatedAt: string | null;
  source: "db" | "defaults";
};

type HealthResponse = {
  status: "up" | "down";
  elapsedMs: number;
  summary?: {
    total: number;
    queued: number;
    running: number;
    succeeded: number;
    failed: number;
    canceled: number;
  };
  data?: Record<string, unknown>;
  error?: string;
};

type ApiEnvelope<T> = {
  ok?: boolean;
  data?: T;
  error?: string;
  code?: string;
};

type PaginatedApiData<T> = {
  items?: T[];
  page?: number;
  pageSize?: number;
  total?: number;
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    hasNextPage?: boolean;
  };
  jobs?: T[];
  artifacts?: T[];
};

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "actividad", label: "Actividad (Jobs)" },
  { id: "artefactos", label: "Artefactos" },
  { id: "plantillas", label: "Plantillas" },
  { id: "politicas", label: "Políticas & Límites" },
  { id: "almacenamiento", label: "Almacenamiento" },
  { id: "salud", label: "Salud & Métricas" },
  { id: "auditoria", label: "Auditoría" }
];

const JOB_TYPES: JobType[] = [
  "excel_export",
  "excel_import",
  "docx_render",
  "pdf_render",
  "image_transform",
  "google_sheets_export",
  "drive_upload"
];

const STATUS_LABELS: Record<JobStatus, string> = {
  queued: "En cola",
  running: "En ejecución",
  succeeded: "Completado",
  failed: "Falló",
  canceled: "Cancelado"
};

const EMPTY_PAGINATION: Pagination = {
  page: 1,
  pageSize: 25,
  total: 0,
  hasNextPage: false
};

const EMPTY_CONFIG: TenantProcessingConfig = {
  tenantId: "global",
  enabled: true,
  storageProvider: "s3",
  bucket: "processing-artifacts",
  prefix: "tenants",
  retentionDaysByJobType: {},
  maxUploadMB: 8,
  maxRowsExcel: 5000,
  maxPagesPdf: 120,
  timeoutMs: 15000,
  maxConcurrency: 2,
  allowedJobTypes: [...JOB_TYPES],
  notifyOnFailure: true,
  updatedAt: null,
  source: "defaults"
};

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toLocaleString();
}

function formatBytes(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function statusVariant(status: JobStatus): "success" | "neutral" | "warning" | "info" {
  if (status === "succeeded") return "success";
  if (status === "failed") return "warning";
  if (status === "running") return "info";
  return "neutral";
}

function getManifestArtifact(job: JobRecord | null) {
  if (!job) return null;
  return (job.artifacts || []).find((artifact) => String(artifact.key || "").endsWith("/logs/manifest.json")) || null;
}

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  return (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
}

function normalizePaginatedData<T>(input: PaginatedApiData<T> | undefined, fallbackPageSize: number) {
  const items = Array.isArray(input?.items)
    ? input?.items
    : Array.isArray(input?.jobs)
      ? input.jobs
      : Array.isArray(input?.artifacts)
        ? input.artifacts
        : [];

  const page = Number(input?.page || input?.pagination?.page || 1) || 1;
  const pageSize = Number(input?.pageSize || input?.pagination?.limit || fallbackPageSize) || fallbackPageSize;
  const total = Number(input?.total || input?.pagination?.total || items.length) || items.length;
  const hasNextPage =
    typeof input?.pagination?.hasNextPage === "boolean" ? input.pagination.hasNextPage : page * pageSize < total;

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      hasNextPage
    } satisfies Pagination
  };
}

function QueryStateCard({
  title,
  message,
  detail,
  onRetry,
  retryLabel = "Reintentar"
}: {
  title: string;
  message: string;
  detail?: string | null;
  onRetry: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
      <p className="text-sm font-semibold text-[#2e75ba]">{title}</p>
      <p className="mt-1 text-xs text-slate-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 rounded-md bg-[#4aa59c] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#3f9189]"
      >
        {retryLabel}
      </button>
      {detail ? (
        <details className="mt-2 rounded-md border border-slate-200 bg-white p-2 text-[11px] text-slate-600">
          <summary className="cursor-pointer font-semibold text-slate-700">Detalle técnico</summary>
          <p className="mt-2 whitespace-pre-wrap break-words font-mono">{detail}</p>
        </details>
      ) : null}
    </div>
  );
}

export default function ProcessingDocumentsPanel() {
  const { toasts, dismiss, showToast } = useToast();

  const [activeTab, setActiveTab] = useState<TabId>("actividad");
  const [filters, setFilters] = useState(() => {
    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - 7);
    return {
      from: toDateInputValue(from),
      to: toDateInputValue(now),
      jobType: "",
      status: "",
      createdBy: "",
      q: ""
    };
  });

  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [jobsPagination, setJobsPagination] = useState<Pagination>(EMPTY_PAGINATION);

  const [artifacts, setArtifacts] = useState<ArtifactRecord[]>([]);
  const [artifactsLoading, setArtifactsLoading] = useState(false);
  const [artifactsError, setArtifactsError] = useState<string | null>(null);
  const [artifactsPagination, setArtifactsPagination] = useState<Pagination>(EMPTY_PAGINATION);

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [config, setConfig] = useState<TenantProcessingConfig>(EMPTY_CONFIG);
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configSaving, setConfigSaving] = useState(false);
  const [retentionJson, setRetentionJson] = useState("{}");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [jobDetail, setJobDetail] = useState<JobRecord | null>(null);
  const [jobDetailLoading, setJobDetailLoading] = useState(false);
  const [jobActionLoading, setJobActionLoading] = useState(false);

  const canGoPrevJobs = jobsPagination.page > 1;
  const canGoNextJobs = jobsPagination.hasNextPage;
  const canGoPrevArtifacts = artifactsPagination.page > 1;
  const canGoNextArtifacts = artifactsPagination.hasNextPage;

  const loadJobs = useCallback(
    async (page = 1) => {
      setJobsLoading(true);
      setJobsError(null);
      try {
        const search = new URLSearchParams();
        search.set("page", String(page));
        search.set("limit", String(jobsPagination.pageSize || 25));
        if (filters.from) search.set("from", filters.from);
        if (filters.to) search.set("to", filters.to);
        if (filters.jobType) search.set("jobType", filters.jobType);
        if (filters.status) search.set("status", filters.status);
        if (filters.createdBy) search.set("createdBy", filters.createdBy);
        if (filters.q) search.set("q", filters.q);

        const response = await fetch(`/api/admin/processing/jobs?${search.toString()}`, {
          cache: "no-store"
        });
        const payload = await parseEnvelope<PaginatedApiData<JobRecord>>(response);

        if (!response.ok || payload.ok === false || !payload.data) {
          throw new Error(payload.error || "No se pudieron cargar jobs.");
        }

        const normalized = normalizePaginatedData(payload.data, jobsPagination.pageSize || 25);
        setJobs(normalized.items);
        setJobsPagination(normalized.pagination);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudieron cargar jobs.";
        setJobsError(message);
        showToast({
          tone: "error",
          title: "Error cargando actividad",
          message
        });
      } finally {
        setJobsLoading(false);
      }
    },
    [filters, jobsPagination.pageSize, showToast]
  );

  const loadArtifacts = useCallback(
    async (page = 1) => {
      setArtifactsLoading(true);
      setArtifactsError(null);
      try {
        const search = new URLSearchParams();
        search.set("page", String(page));
        search.set("limit", String(artifactsPagination.pageSize || 30));
        if (filters.from) search.set("from", filters.from);
        if (filters.to) search.set("to", filters.to);
        if (filters.jobType) search.set("jobType", filters.jobType);
        if (filters.status) search.set("status", filters.status);
        if (filters.q) search.set("q", filters.q);

        const response = await fetch(`/api/admin/processing/artifacts?${search.toString()}`, {
          cache: "no-store"
        });
        const payload = await parseEnvelope<PaginatedApiData<ArtifactRecord>>(response);

        if (!response.ok || payload.ok === false || !payload.data) {
          throw new Error(payload.error || "No se pudieron cargar artefactos.");
        }

        const normalized = normalizePaginatedData(payload.data, artifactsPagination.pageSize || 30);
        setArtifacts(normalized.items);
        setArtifactsPagination(normalized.pagination);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudieron cargar artefactos.";
        setArtifactsError(message);
        showToast({
          tone: "error",
          title: "Error cargando artefactos",
          message
        });
      } finally {
        setArtifactsLoading(false);
      }
    },
    [artifactsPagination.pageSize, filters, showToast]
  );

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const response = await fetch("/api/admin/processing/health", { cache: "no-store" });
      const payload = await parseEnvelope<HealthResponse>(response);

      if (!response.ok || payload.ok === false || !payload.data) {
        throw new Error(payload.error || "processing-service no disponible");
      }

      setHealth(payload.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo consultar health";
      setHealth(null);
      setHealthError(message);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    setConfigError(null);
    try {
      const response = await fetch("/api/admin/processing/config", { cache: "no-store" });
      const payload = await parseEnvelope<TenantProcessingConfig>(response);
      if (!response.ok || payload.ok === false || !payload.data) {
        throw new Error(payload.error || "No se pudo cargar configuración de procesamiento.");
      }
      setConfig(payload.data);
      setRetentionJson(JSON.stringify(payload.data.retentionDaysByJobType || {}, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo cargar configuración de procesamiento.";
      setConfigError(message);
      showToast({
        tone: "error",
        title: "Error cargando políticas",
        message
      });
    } finally {
      setConfigLoading(false);
    }
  }, [showToast]);

  const loadJobDetail = useCallback(
    async (jobId: string) => {
      setJobDetailLoading(true);
      try {
        const response = await fetch(`/api/admin/processing/jobs/${encodeURIComponent(jobId)}`, { cache: "no-store" });
        const payload = await parseEnvelope<JobRecord>(response);
        if (!response.ok || payload.ok === false || !payload.data) {
          throw new Error(payload.error || "No se pudo cargar el detalle del job.");
        }
        setJobDetail(payload.data);
        setDrawerOpen(true);
      } catch (error) {
        showToast({
          tone: "error",
          title: "Error cargando detalle",
          message: error instanceof Error ? error.message : "No se pudo cargar el detalle del job."
        });
      } finally {
        setJobDetailLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    void loadJobs(1);
    void loadArtifacts(1);
    void loadHealth();
    void loadConfig();
  }, [loadArtifacts, loadConfig, loadHealth, loadJobs]);

  const runRetry = useCallback(
    async (jobId: string) => {
      setJobActionLoading(true);
      try {
        const response = await fetch(`/api/admin/processing/jobs/${encodeURIComponent(jobId)}/retry`, {
          method: "POST"
        });
        const payload = await parseEnvelope<Record<string, unknown>>(response);
        if (!response.ok || payload.ok === false) {
          throw new Error(payload.error || "No se pudo reintentar el job.");
        }

        showToast({ tone: "success", title: "Job reintentado", message: "Se encoló un nuevo intento." });
        await Promise.all([loadJobs(jobsPagination.page), loadHealth()]);
      } catch (error) {
        showToast({
          tone: "error",
          title: "Error en retry",
          message: error instanceof Error ? error.message : "No se pudo reintentar el job."
        });
      } finally {
        setJobActionLoading(false);
      }
    },
    [jobsPagination.page, loadHealth, loadJobs, showToast]
  );

  const runCancel = useCallback(
    async (jobId: string) => {
      setJobActionLoading(true);
      try {
        const response = await fetch(`/api/admin/processing/jobs/${encodeURIComponent(jobId)}/cancel`, {
          method: "POST"
        });
        const payload = await parseEnvelope<Record<string, unknown>>(response);
        if (!response.ok || payload.ok === false) {
          throw new Error(payload.error || "No se pudo cancelar el job.");
        }

        showToast({ tone: "success", title: "Job cancelado" });
        await Promise.all([loadJobs(jobsPagination.page), loadHealth()]);
        if (jobDetail?.jobId === jobId) {
          await loadJobDetail(jobId);
        }
      } catch (error) {
        showToast({
          tone: "error",
          title: "Error cancelando",
          message: error instanceof Error ? error.message : "No se pudo cancelar el job."
        });
      } finally {
        setJobActionLoading(false);
      }
    },
    [jobDetail?.jobId, jobsPagination.page, loadHealth, loadJobDetail, loadJobs, showToast]
  );

  const saveConfig = useCallback(async () => {
    setConfigSaving(true);
    try {
      let retention: Record<string, number> = {};
      if (retentionJson.trim()) {
        const parsed = JSON.parse(retentionJson);
        retention = parsed && typeof parsed === "object" ? parsed : {};
      }

      const response = await fetch("/api/admin/processing/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: config.enabled,
          storageProvider: config.storageProvider,
          bucket: config.bucket,
          prefix: config.prefix,
          retentionDaysByJobType: retention,
          maxUploadMB: Number(config.maxUploadMB),
          maxRowsExcel: Number(config.maxRowsExcel),
          maxPagesPdf: Number(config.maxPagesPdf),
          timeoutMs: Number(config.timeoutMs),
          maxConcurrency: Number(config.maxConcurrency),
          allowedJobTypes: config.allowedJobTypes,
          notifyOnFailure: config.notifyOnFailure
        })
      });

      const payload = await parseEnvelope<TenantProcessingConfig>(response);
      if (!response.ok || payload.ok === false || !payload.data) {
        throw new Error(payload.error || "No se pudo guardar configuración de procesamiento.");
      }

      setConfig(payload.data);
      setRetentionJson(JSON.stringify(payload.data.retentionDaysByJobType || {}, null, 2));
      showToast({ tone: "success", title: "Políticas actualizadas" });
    } catch (error) {
      showToast({
        tone: "error",
        title: "Error guardando",
        message: error instanceof Error ? error.message : "No se pudo guardar configuración."
      });
    } finally {
      setConfigSaving(false);
    }
  }, [config, retentionJson, showToast]);

  const manifestArtifact = useMemo(() => getManifestArtifact(jobDetail), [jobDetail]);

  const activityColumns = useMemo(
    () => [
      {
        header: "Job",
        render: (row: JobRecord) => (
          <div>
            <p className="font-mono text-xs text-slate-800">{row.jobId}</p>
            <p className="text-xs text-slate-500">{row.jobType}</p>
          </div>
        )
      },
      {
        header: "Estado",
        render: (row: JobRecord) => <Badge variant={statusVariant(row.status)}>{STATUS_LABELS[row.status]}</Badge>
      },
      {
        header: "Creado",
        render: (row: JobRecord) => (
          <div>
            <p className="text-xs text-slate-800">{formatDateTime(row.createdAt)}</p>
            <p className="text-xs text-slate-500">{row.actorId}</p>
          </div>
        )
      },
      {
        header: "Salida",
        render: (row: JobRecord) => {
          const first = row.artifacts?.[0];
          return (
            <div>
              <p className="text-xs text-slate-800">{first ? formatBytes(first.size) : "-"}</p>
              <p className="line-clamp-1 text-xs text-slate-500">{first?.key || "Sin artefactos"}</p>
            </div>
          );
        }
      },
      {
        header: "Acciones",
        render: (row: JobRecord) => (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadJobDetail(row.jobId)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:border-[#4aadf5]"
            >
              Detalle
            </button>
            <button
              type="button"
              onClick={() => void runRetry(row.jobId)}
              className="rounded-md bg-[#4aa59c] px-2 py-1 text-xs font-semibold text-white hover:bg-[#3f9189]"
              disabled={jobActionLoading}
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => void runCancel(row.jobId)}
              className="rounded-md border border-rose-200 bg-white px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
              disabled={jobActionLoading || row.status !== "queued"}
            >
              Cancel
            </button>
          </div>
        )
      }
    ],
    [jobActionLoading, loadJobDetail, runCancel, runRetry]
  );

  const artifactColumns = useMemo(
    () => [
      {
        header: "Archivo",
        render: (row: ArtifactRecord) => (
          <div>
            <p className="line-clamp-1 font-mono text-xs text-slate-800">{row.key}</p>
            <p className="text-xs text-slate-500">{row.mime || row.provider}</p>
          </div>
        )
      },
      {
        header: "Origen",
        render: (row: ArtifactRecord) => (
          <div>
            <p className="font-mono text-xs text-slate-800">{row.jobId}</p>
            <p className="text-xs text-slate-500">{row.jobType}</p>
          </div>
        )
      },
      {
        header: "Checksum",
        render: (row: ArtifactRecord) => <p className="font-mono text-xs text-slate-700">{row.checksum || "-"}</p>
      },
      {
        header: "Tamaño",
        render: (row: ArtifactRecord) => <p className="text-xs text-slate-700">{formatBytes(row.size)}</p>
      }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <ToastContainer toasts={toasts} onDismiss={dismiss} placement="top-right" />

      <Card>
        <CardHeader>
          <CardTitle className="text-[#2e75ba]">Panel de procesamiento</CardTitle>
          <p className="text-xs text-slate-600">
            Operación multi-tenant y auditoría del processing-service. Todas las consultas están aisladas por tenant activo.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs font-semibold transition",
                    active
                      ? "border-[#2e75ba] bg-[#2e75ba] text-white"
                      : "border-slate-200 bg-[#F8FAFC] text-slate-700 hover:border-[#4aadf5]"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {activeTab === "actividad" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-[#2e75ba]">Actividad de jobs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FilterBar
              actions={
                <button
                  type="button"
                  onClick={() => void loadJobs(1)}
                  className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white hover:bg-[#3f9189]"
                >
                  Refrescar
                </button>
              }
            >
              <input
                type="date"
                value={filters.from}
                onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
              />
              <input
                type="date"
                value={filters.to}
                onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
              />
              <select
                value={filters.jobType}
                onChange={(event) => setFilters((prev) => ({ ...prev, jobType: event.target.value }))}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
              >
                <option value="">Todos los tipos</option>
                {JOB_TYPES.map((jobType) => (
                  <option key={jobType} value={jobType}>
                    {jobType}
                  </option>
                ))}
              </select>
              <select
                value={filters.status}
                onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
              >
                <option value="">Todos los estados</option>
                {(["queued", "running", "succeeded", "failed", "canceled"] as JobStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
              <input
                value={filters.createdBy}
                onChange={(event) => setFilters((prev) => ({ ...prev, createdBy: event.target.value }))}
                placeholder="createdBy"
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
              />
              <input
                value={filters.q}
                onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
                placeholder="jobId o filename"
                className="min-w-[180px] rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
              />
            </FilterBar>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => void loadJobs(jobsPagination.page - 1)}
                disabled={!canGoPrevJobs || jobsLoading}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-xs text-slate-600">
                Página {jobsPagination.page} · {jobsPagination.total} registros
              </span>
              <button
                type="button"
                onClick={() => void loadJobs(jobsPagination.page + 1)}
                disabled={!canGoNextJobs || jobsLoading}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>

            {jobsLoading ? <p className="text-xs text-slate-500">Cargando jobs...</p> : null}
            {jobsError ? (
              <QueryStateCard
                title="No se pudo cargar la actividad"
                message="La consulta de jobs falló para el tenant actual."
                detail={jobsError}
                onRetry={() => void loadJobs(1)}
              />
            ) : null}

            {jobs.length === 0 && !jobsLoading && !jobsError ? (
              <EmptyState
                title="Sin jobs para este filtro"
                description="Ajusta rango, estado o tipo para consultar actividad del tenant actual."
              />
            ) : null}

            {jobs.length > 0 && !jobsError ? <DataTable columns={activityColumns} data={jobs} /> : null}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "artefactos" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-[#2e75ba]">Artefactos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => void loadArtifacts(artifactsPagination.page - 1)}
                disabled={!canGoPrevArtifacts || artifactsLoading}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-xs text-slate-600">
                Página {artifactsPagination.page} · {artifactsPagination.total} archivos
              </span>
              <button
                type="button"
                onClick={() => void loadArtifacts(artifactsPagination.page + 1)}
                disabled={!canGoNextArtifacts || artifactsLoading}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>

            {artifactsLoading ? <p className="text-xs text-slate-500">Cargando artefactos...</p> : null}
            {artifactsError ? (
              <QueryStateCard
                title="No se pudieron cargar artefactos"
                message="La consulta de artefactos devolvió error."
                detail={artifactsError}
                onRetry={() => void loadArtifacts(1)}
              />
            ) : null}

            {artifacts.length === 0 && !artifactsLoading && !artifactsError ? (
              <EmptyState
                title="Sin artefactos"
                description="Los artefactos aparecerán cuando los jobs del tenant generen salidas."
              />
            ) : null}

            {artifacts.length > 0 && !artifactsError ? <DataTable columns={artifactColumns} data={artifacts} /> : null}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "plantillas" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-[#2e75ba]">Plantillas internas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>
              `docx_render` usa plantillas internas en storage. Por seguridad, no se aceptan plantillas DOCX del usuario final.
            </p>
            <p>
              Prefijo recomendado: <span className="font-mono text-xs">templates/docx/&lt;tenant&gt;/&lt;nombre&gt;.docx</span>
            </p>
            <p className="rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-xs text-slate-600">
              Para carga operativa usa endpoint interno firmado <span className="font-mono">POST /templates/docx</span> vía BFF
              admin.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "politicas" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-[#2e75ba]">Políticas & límites por tenant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {configLoading ? <p className="text-xs text-slate-500">Cargando configuración...</p> : null}
            {configError ? (
              <QueryStateCard
                title="No se pudo cargar configuración"
                message="No fue posible consultar políticas del tenant."
                detail={configError}
                onRetry={() => void loadConfig()}
              />
            ) : null}
            {configError ? null : (
              <>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={(event) => setConfig((prev) => ({ ...prev, enabled: event.target.checked }))}
                    />
                    Habilitar processing-service
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={config.notifyOnFailure}
                      onChange={(event) => setConfig((prev) => ({ ...prev, notifyOnFailure: event.target.checked }))}
                    />
                    Notificar fallos
                  </label>
                </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="text-xs text-slate-600">Storage provider</label>
                <select
                  value={config.storageProvider}
                  onChange={(event) =>
                    setConfig((prev) => ({ ...prev, storageProvider: event.target.value as TenantProcessingConfig["storageProvider"] }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="s3">s3</option>
                  <option value="minio">minio</option>
                  <option value="gcs">gcs</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-600">Bucket</label>
                <input
                  value={config.bucket}
                  onChange={(event) => setConfig((prev) => ({ ...prev, bucket: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">Prefix</label>
                <input
                  value={config.prefix}
                  onChange={(event) => setConfig((prev) => ({ ...prev, prefix: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-5">
              <div>
                <label className="text-xs text-slate-600">Max upload (MB)</label>
                <input
                  type="number"
                  min={1}
                  value={config.maxUploadMB}
                  onChange={(event) => setConfig((prev) => ({ ...prev, maxUploadMB: Number(event.target.value) || 1 }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">Max filas Excel</label>
                <input
                  type="number"
                  min={1}
                  value={config.maxRowsExcel}
                  onChange={(event) => setConfig((prev) => ({ ...prev, maxRowsExcel: Number(event.target.value) || 1 }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">Max páginas PDF</label>
                <input
                  type="number"
                  min={1}
                  value={config.maxPagesPdf}
                  onChange={(event) => setConfig((prev) => ({ ...prev, maxPagesPdf: Number(event.target.value) || 1 }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">Timeout (ms)</label>
                <input
                  type="number"
                  min={1000}
                  value={config.timeoutMs}
                  onChange={(event) => setConfig((prev) => ({ ...prev, timeoutMs: Number(event.target.value) || 1000 }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">Concurrency</label>
                <input
                  type="number"
                  min={1}
                  value={config.maxConcurrency}
                  onChange={(event) => setConfig((prev) => ({ ...prev, maxConcurrency: Number(event.target.value) || 1 }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2e75ba]">Tipos permitidos</p>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                {JOB_TYPES.map((jobType) => {
                  const checked = config.allowedJobTypes.includes(jobType);
                  return (
                    <label key={jobType} className="flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          setConfig((prev) => {
                            const list = new Set(prev.allowedJobTypes);
                            if (event.target.checked) list.add(jobType);
                            else list.delete(jobType);
                            return { ...prev, allowedJobTypes: Array.from(list) as JobType[] };
                          });
                        }}
                      />
                      {jobType}
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-600">retentionDaysByJobType (JSON)</label>
              <textarea
                value={retentionJson}
                onChange={(event) => setRetentionJson(event.target.value)}
                className="mt-1 h-28 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
              />
            </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void saveConfig()}
                    disabled={configSaving}
                    className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white hover:bg-[#3f9189] disabled:opacity-60"
                  >
                    {configSaving ? "Guardando..." : "Guardar políticas"}
                  </button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "almacenamiento" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-[#2e75ba]">Almacenamiento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2e75ba]">Ruta base</p>
              <p className="mt-1 font-mono text-xs text-slate-700">
                {config.prefix}/{'{tenantId}'}/processing/{'{jobType}'}/YYYY/MM/DD/{'{jobId}'}/(input|output|logs)
              </p>
              <p className="mt-1 text-xs text-slate-500">
                bucket: <span className="font-mono">{config.bucket}</span> · provider: <span className="font-mono">{config.storageProvider}</span>
              </p>
            </div>
            <p className="text-xs text-slate-600">
              El manifest por job se espera en <span className="font-mono">.../logs/manifest.json</span> con hashes y límites aplicados.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "salud" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-[#2e75ba]">Salud & métricas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void loadHealth()}
                className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white hover:bg-[#3f9189]"
                disabled={healthLoading}
              >
                {healthLoading ? "Consultando..." : "Refrescar health"}
              </button>
            </div>

            {healthError ? (
              <QueryStateCard
                title="No se pudo consultar salud del servicio"
                message="El endpoint de health no respondió correctamente."
                detail={healthError}
                onRetry={() => void loadHealth()}
              />
            ) : null}

            {!healthLoading && !healthError && !health ? (
              <EmptyState
                title="Sin telemetría disponible"
                description="No hay datos de salud para mostrar en este momento."
              />
            ) : null}

            {health ? (
              <>
                <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2e75ba]">Estado</p>
                  <p className="mt-1 text-sm text-slate-700">
                    {health.status === "up" ? "UP" : "DOWN"} · {health.elapsedMs || 0} ms
                  </p>
                  {health.error ? <p className="mt-1 text-xs text-rose-700">{health.error}</p> : null}
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                    <p className="text-slate-500">Total jobs</p>
                    <p className="text-lg font-semibold text-slate-900">{health.summary?.total || 0}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                    <p className="text-slate-500">En ejecución</p>
                    <p className="text-lg font-semibold text-slate-900">{health.summary?.running || 0}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                    <p className="text-slate-500">Fallidos</p>
                    <p className="text-lg font-semibold text-slate-900">{health.summary?.failed || 0}</p>
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "auditoria" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-[#2e75ba]">Auditoría operacional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-slate-700">
            <p>Eventos mostrados sin PII: actorId, tenantId, tipo de job, tamaño, duración y outcome.</p>
            <p>
              Para detalle por evento, usa el drawer del job y revisa manifest/logs con checksum SHA-256 de entradas y salidas.
            </p>
            <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
              {jobs.slice(0, 8).map((job) => (
                <p key={job.jobId} className="font-mono text-[11px] text-slate-700">
                  {job.jobId} · {job.tenantId} · {job.actorId} · {job.jobType} · {job.status}
                </p>
              ))}
              {jobs.length === 0 ? <p className="text-slate-500">Sin eventos en el rango actual.</p> : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 flex">
          <button
            aria-label="Cerrar detalle"
            onClick={() => setDrawerOpen(false)}
            className="h-full flex-1 bg-slate-900/40"
          />
          <aside className="h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 border-b border-slate-200 bg-white px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Detalle de job</p>
                  <p className="font-mono text-xs text-slate-700">{jobDetail?.jobId || "-"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:border-[#4aadf5]"
                >
                  Cerrar
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {jobDetail ? <Badge variant={statusVariant(jobDetail.status)}>{STATUS_LABELS[jobDetail.status]}</Badge> : null}
                {jobDetail ? <Badge>{jobDetail.jobType}</Badge> : null}
              </div>
            </div>

            <div className="space-y-4 p-4">
              {jobDetailLoading ? <p className="text-xs text-slate-500">Cargando detalle...</p> : null}

              {jobDetail ? (
                <>
                  <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2e75ba]">Timeline</p>
                    <p className="mt-1 text-xs text-slate-700">Creado: {formatDateTime(jobDetail.createdAt)}</p>
                    <p className="text-xs text-slate-700">Inicio: {formatDateTime(jobDetail.startedAt)}</p>
                    <p className="text-xs text-slate-700">Fin: {formatDateTime(jobDetail.finishedAt)}</p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2e75ba]">Inputs / límites</p>
                    <pre className="mt-2 max-h-36 overflow-auto rounded border border-slate-100 bg-slate-50 p-2 text-[11px] text-slate-700">
                      {JSON.stringify({ params: jobDetail.params || {}, limits: jobDetail.limits || {} }, null, 2)}
                    </pre>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2e75ba]">Outputs / sha256</p>
                    <div className="mt-2 space-y-2">
                      {(jobDetail.artifacts || []).map((artifact) => (
                        <div key={artifact.key} className="rounded-md border border-slate-100 bg-slate-50 p-2">
                          <p className="font-mono text-[11px] text-slate-800">{artifact.key}</p>
                          <p className="text-[11px] text-slate-600">
                            {artifact.mime || artifact.provider} · {formatBytes(artifact.size)} · {artifact.checksum || "sin checksum"}
                          </p>
                          {artifact.signedUrl ? (
                            <a
                              href={artifact.signedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-block rounded-md bg-[#4aa59c] px-2 py-1 text-[11px] font-semibold text-white hover:bg-[#3f9189]"
                            >
                              Descargar
                            </a>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2e75ba]">Manifest / logs</p>
                    <p className="mt-1 font-mono text-[11px] text-slate-700">{manifestArtifact?.key || "Sin manifest disponible"}</p>
                    {manifestArtifact?.signedUrl ? (
                      <a
                        href={manifestArtifact.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:border-[#4aadf5]"
                      >
                        Abrir manifest.json
                      </a>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void runRetry(jobDetail.jobId)}
                      disabled={jobActionLoading}
                      className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white hover:bg-[#3f9189] disabled:opacity-60"
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => void runCancel(jobDetail.jobId)}
                      disabled={jobActionLoading || jobDetail.status !== "queued"}
                      className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void loadJobDetail(jobDetail.jobId)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-[#4aadf5]"
                    >
                      Refrescar detalle
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
