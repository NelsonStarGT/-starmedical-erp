"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileText, FolderOpen, Loader2, PanelRightOpen } from "lucide-react";
import ClientIdentityCardPersonView from "@/components/clients/ClientIdentityCardPersonView";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

type PreviewSection = "summary" | "documents";

type ClientPreviewSummary = {
  id: string;
  type: "PERSON" | "COMPANY" | "INSTITUTION" | "INSURER";
  typeLabel: string;
  displayName: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  secondLastName: string | null;
  dpi: string | null;
  nit: string | null;
  identifier: string | null;
  phone: string | null;
  email: string | null;
  photoUrl: string | null;
  address: string | null;
  city: string | null;
  department: string | null;
  country: string | null;
  statusLabel: string | null;
  isIncomplete: boolean;
  healthScore: number;
  hasExpiredDocs: boolean;
  hasExpiringDocs: boolean;
  requiredPendingCount: number;
  requiredRejectedCount: number;
  requiredExpiredCount: number;
  profileHref: string;
};

type ClientPreviewDocument = {
  id: string;
  title: string;
  documentTypeName: string | null;
  expiresAt: string | null;
  createdAt: string;
  fileUrl: string | null;
  originalName: string | null;
  status: "Vencido" | "Por vencer" | "Vigente" | "Faltante";
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  version: number;
};

type PreviewResponse = {
  ok: boolean;
  client: ClientPreviewSummary;
  documents: ClientPreviewDocument[];
  permissions: {
    canViewDocs: boolean;
    canEditDocs: boolean;
    canApproveDocs: boolean;
    canEditProfile: boolean;
  };
  error?: string;
};

export type ClientPreviewSeed = {
  displayName: string;
  identifier: string | null;
  phone: string | null;
  email: string | null;
  statusLabel: string | null;
  isIncomplete: boolean;
  healthScore: number;
  hasExpiredDocs: boolean;
  hasExpiringDocs: boolean;
};

function statusTone(status: ClientPreviewDocument["status"]) {
  if (status === "Vencido") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "Por vencer") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "Vigente") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function approvalTone(status: ClientPreviewDocument["approvalStatus"]) {
  if (status === "APPROVED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "REJECTED") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

function approvalLabel(status: ClientPreviewDocument["approvalStatus"]) {
  if (status === "APPROVED") return "Aprobado";
  if (status === "REJECTED") return "Rechazado";
  return "Pendiente";
}

function buildInitials(input: string) {
  const normalized = input
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  return normalized || "CL";
}

export default function ClientPreviewSheet({
  open,
  onClose,
  clientId,
  initialSection,
  seed
}: {
  open: boolean;
  onClose: () => void;
  clientId: string;
  initialSection: PreviewSection;
  seed: ClientPreviewSeed;
}) {
  const [activeSection, setActiveSection] = useState<PreviewSection>(initialSection);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PreviewResponse | null>(null);

  useEffect(() => {
    if (!open) return;
    setActiveSection(initialSection);
  }, [open, initialSection]);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    setLoading(true);
    setData(null);

    fetch(`/api/admin/clientes/${encodeURIComponent(clientId)}/preview`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store"
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as PreviewResponse | null;

        if (!response.ok || !payload?.ok) {
          const errorCode = payload?.error ?? "";
          if (process.env.NODE_ENV !== "production") {
            console.warn("[DEV][clients.preview] No se pudo cargar preview", {
              clientId,
              status: response.status,
              error: errorCode || "unknown"
            });
          }
          if (response.status === 404 && errorCode === "not_found") {
            throw new Error("not_found");
          }
          throw new Error("preview_load_failed");
        }

        setData(payload);
      })
      .catch((err) => {
        if ((err as Error).name === "AbortError") return;
        if (process.env.NODE_ENV !== "production") {
          console.warn("[DEV][clients.preview] fallback to seed summary", {
            clientId,
            message: (err as Error)?.message ?? "unknown"
          });
        }
        setData(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [clientId, open]);

  const effectiveCanViewDocs = data?.permissions.canViewDocs ?? true;
  const effectiveCanEditDocs = data?.permissions.canEditDocs ?? false;
  const effectiveCanApproveDocs = data?.permissions.canApproveDocs ?? false;
  const documents = data?.documents ?? [];
  const profileHref = data?.client.profileHref ?? `/admin/clientes/${clientId}`;

  const summary = useMemo(
    () => ({
      type: data?.client.type ?? "PERSON",
      displayName: data?.client.displayName ?? seed.displayName,
      identifier: data?.client.identifier ?? seed.identifier,
      phone: data?.client.phone ?? seed.phone,
      email: data?.client.email ?? seed.email,
      statusLabel: data?.client.statusLabel ?? seed.statusLabel,
      isIncomplete: data?.client.isIncomplete ?? seed.isIncomplete,
      healthScore: data?.client.healthScore ?? seed.healthScore,
      hasExpiredDocs: data?.client.hasExpiredDocs ?? seed.hasExpiredDocs,
      hasExpiringDocs: data?.client.hasExpiringDocs ?? seed.hasExpiringDocs,
      typeLabel: data?.client.typeLabel ?? "Cliente",
      firstName: data?.client.firstName ?? null,
      middleName: data?.client.middleName ?? null,
      lastName: data?.client.lastName ?? null,
      secondLastName: data?.client.secondLastName ?? null,
      dpi: data?.client.dpi ?? ((data?.client.type ?? "PERSON") === "PERSON" ? seed.identifier : null),
      nit: data?.client.nit ?? null,
      photoUrl: data?.client.photoUrl ?? null,
      address: data?.client.address ?? null,
      city: data?.client.city ?? null,
      department: data?.client.department ?? null,
      country: data?.client.country ?? null,
      requiredPendingCount: data?.client.requiredPendingCount ?? 0,
      requiredRejectedCount: data?.client.requiredRejectedCount ?? 0,
      requiredExpiredCount: data?.client.requiredExpiredCount ?? 0
    }),
    [data, seed]
  );

  const isPerson = summary.type === "PERSON";
  const avatarLabel =
    [summary.firstName, summary.middleName, summary.lastName, summary.secondLastName].filter(Boolean).join(" ") || summary.displayName;
  const avatarInitials = buildInitials(avatarLabel);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={summary.displayName}
      subtitle={`${summary.typeLabel} · Vista rápida`}
      className="max-w-5xl"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setActiveSection("summary")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aadf5]",
                activeSection === "summary" ? "bg-[#2e75ba] text-white" : "text-slate-700 hover:bg-slate-100"
              )}
            >
              Ficha
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("documents")}
              disabled={!effectiveCanViewDocs}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aadf5]",
                activeSection === "documents" ? "bg-[#2e75ba] text-white" : "text-slate-700 hover:bg-slate-100",
                !effectiveCanViewDocs && "cursor-not-allowed opacity-50 hover:bg-transparent"
              )}
            >
              Documentos
            </button>
          </div>

          <Link
            href={profileHref}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
          >
            <PanelRightOpen size={14} />
            Abrir perfil
          </Link>
        </div>

        {loading && !data && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            <Loader2 size={16} className="animate-spin" />
            Cargando ficha...
          </div>
        )}

        {activeSection === "summary" && isPerson && (
          <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-[#f8fafc] text-sm font-semibold text-slate-600 shadow-sm">
                  {summary.photoUrl ? (
                    <Image
                      src={summary.photoUrl}
                      alt={`Foto de ${summary.displayName}`}
                      width={80}
                      height={80}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    avatarInitials
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">{summary.typeLabel}</p>
                  <p className="truncate text-lg font-semibold text-slate-900">{summary.displayName}</p>
                  <p className="text-xs text-slate-500">{summary.statusLabel ? `Estado: ${summary.statusLabel}` : "Sin estado"}</p>
                </div>
              </div>

              <ClientIdentityCardPersonView
                firstName={summary.firstName}
                middleName={summary.middleName}
                lastName={summary.lastName}
                secondLastName={summary.secondLastName}
                dpi={summary.dpi}
                nit={summary.nit}
                email={summary.email}
                phone={summary.phone}
                address={summary.address}
                city={summary.city}
                department={summary.department}
                country={summary.country}
              />

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contacto rápido</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {summary.phone ? (
                    <a
                      href={`tel:${summary.phone}`}
                      className="inline-flex rounded-full border border-slate-200 bg-[#f8fafc] px-3 py-1 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                    >
                      Llamar
                    </a>
                  ) : null}
                  {summary.email ? (
                    <a
                      href={`mailto:${summary.email}`}
                      className="inline-flex rounded-full border border-slate-200 bg-[#f8fafc] px-3 py-1 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                    >
                      Correo
                    </a>
                  ) : null}
                  {!summary.phone && !summary.email && <span className="text-xs text-slate-500">Sin contacto directo.</span>}
                </div>
              </div>
            </div>

            <aside className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Acciones</p>
                <div className="mt-3 flex flex-col gap-2">
                  <Link
                    href={`${profileHref}?tab=resumen`}
                    className="inline-flex justify-center rounded-full bg-[#2e75ba] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#245e97]"
                  >
                    Completar perfil
                  </Link>
                  <button
                    type="button"
                    onClick={() => setActiveSection("documents")}
                    disabled={!effectiveCanViewDocs}
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]",
                      !effectiveCanViewDocs && "cursor-not-allowed opacity-60"
                    )}
                  >
                    <FolderOpen size={14} />
                    Documentos
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-[#dce7f5] bg-[#f8fafc] p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Health score</p>
                  <p className="text-sm font-semibold text-slate-900">{summary.healthScore}%</p>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-[#4aa59c]" style={{ width: `${summary.healthScore}%` }} />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Alertas</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {summary.isIncomplete && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                      <AlertTriangle size={12} />
                      Perfil incompleto
                    </span>
                  )}
                  {summary.requiredPendingCount > 0 && (
                    <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">
                      Requeridos pendientes: {summary.requiredPendingCount}
                    </span>
                  )}
                  {summary.requiredRejectedCount > 0 && (
                    <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                      Requeridos rechazados: {summary.requiredRejectedCount}
                    </span>
                  )}
                  {summary.requiredExpiredCount > 0 && (
                    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                      Requeridos vencidos: {summary.requiredExpiredCount}
                    </span>
                  )}
                  {summary.hasExpiredDocs && (
                    <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                      Docs vencidos
                    </span>
                  )}
                  {!summary.hasExpiredDocs && summary.hasExpiringDocs && (
                    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                      Docs por vencer
                    </span>
                  )}
                  {!summary.isIncomplete &&
                    !summary.requiredPendingCount &&
                    !summary.requiredRejectedCount &&
                    !summary.requiredExpiredCount &&
                    !summary.hasExpiredDocs &&
                    !summary.hasExpiringDocs && <span className="text-xs text-slate-500">Sin alertas operativas.</span>}
                </div>
              </div>
            </aside>
          </section>
        )}

        {activeSection === "summary" && !isPerson && (
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">La vista rápida PRO está optimizada para personas.</p>
          </section>
        )}

        {activeSection === "documents" && (
          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Documentos</p>
              {effectiveCanEditDocs ? (
                <Link
                  href={`${profileHref}?tab=documentos`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                >
                  <FolderOpen size={14} />
                  Administrar
                </Link>
              ) : (
                <span className="text-xs text-slate-500">Solo lectura</span>
              )}
              {effectiveCanApproveDocs && <span className="text-xs font-semibold text-[#2e75ba]">Permiso de aprobación activo</span>}
            </div>

            {!effectiveCanViewDocs && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Tu rol no tiene permiso para ver documentos.
              </div>
            )}

            {effectiveCanViewDocs && !documents.length && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Este cliente aun no tiene documentos.
              </div>
            )}

            {effectiveCanViewDocs && documents.length > 0 && (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {doc.title} <span className="text-xs font-medium text-slate-500">v{doc.version}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {doc.documentTypeName ? `${doc.documentTypeName} · ` : ""}
                        {doc.expiresAt ? `Vence ${new Date(doc.expiresAt).toLocaleDateString()}` : "Sin vencimiento"}
                      </p>
                      {doc.approvalStatus === "REJECTED" && doc.rejectionReason && (
                        <p className="mt-1 text-xs text-rose-700">Motivo: {doc.rejectionReason}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", statusTone(doc.status))}>{doc.status}</span>
                      <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", approvalTone(doc.approvalStatus))}>
                        {approvalLabel(doc.approvalStatus)}
                      </span>
                      {doc.fileUrl ? (
                        <Link
                          href={doc.fileUrl}
                          target="_blank"
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                        >
                          <FileText size={13} />
                          Ver
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-500">Sin archivo</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </Modal>
  );
}
