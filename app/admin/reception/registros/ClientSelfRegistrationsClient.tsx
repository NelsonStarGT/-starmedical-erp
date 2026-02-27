"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ClientProfileType, ClientSelfRegistrationStatus } from "@prisma/client";
import { QrCode, CheckCircle2, XCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  actionApproveClientSelfRegistration,
  actionCreateClientRegistrationInvite,
  actionGetClientSelfRegistrationDetail,
  actionListClientSelfRegistrations,
  actionRejectClientSelfRegistration,
  type ClientSelfRegistrationDetail,
  type ClientSelfRegistrationQueueRow,
  type ClientSelfRegistrationDuplicateRow
} from "@/app/admin/reception/actions";
import { Modal } from "@/components/ui/Modal";
import type { ReceptionCapability } from "@/lib/reception/permissions";

type Props = {
  capabilities: ReceptionCapability[];
  initialRows: ClientSelfRegistrationQueueRow[];
  clientTypeOptions: Array<{ id: ClientProfileType; label: string }>;
};

type InviteResponse = {
  inviteId: string;
  clientType: ClientProfileType;
  note: string | null;
  expiresAt: string;
  token: string;
  urlPath: string;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("es-GT", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function statusPill(status: ClientSelfRegistrationStatus) {
  if (status === ClientSelfRegistrationStatus.APPROVED) {
    return "rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700";
  }
  if (status === ClientSelfRegistrationStatus.REJECTED) {
    return "rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700";
  }
  return "rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700";
}

function clientTypeLabel(value: ClientProfileType) {
  if (value === ClientProfileType.PERSON) return "Persona";
  if (value === ClientProfileType.COMPANY) return "Empresa";
  if (value === ClientProfileType.INSTITUTION) return "Institución";
  return "Aseguradora";
}

export default function ClientSelfRegistrationsClient({ capabilities, initialRows, clientTypeOptions }: Props) {
  const [rows, setRows] = useState<ClientSelfRegistrationQueueRow[]>(initialRows);
  const [filterStatus, setFilterStatus] = useState<string>("PENDING");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const [inviteType, setInviteType] = useState<ClientProfileType>(ClientProfileType.PERSON);
  const [inviteExpiryDays, setInviteExpiryDays] = useState<number>(7);
  const [inviteNote, setInviteNote] = useState("");
  const [latestInvite, setLatestInvite] = useState<InviteResponse | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const [origin, setOrigin] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<ClientSelfRegistrationDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [rejectReason, setRejectReason] = useState("");
  const [isRejectMode, setIsRejectMode] = useState(false);

  const canReview = useMemo(
    () => capabilities.includes("SETTINGS_EDIT") || capabilities.includes("QUEUE_SKIP") || capabilities.includes("QUEUE_TRANSFER"),
    [capabilities]
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const latestInviteUrl = useMemo(() => {
    if (!latestInvite) return null;
    if (!origin) return latestInvite.urlPath;
    return `${origin}${latestInvite.urlPath}`;
  }, [latestInvite, origin]);

  const refreshRows = (next?: { status?: string; q?: string }) => {
    const status = next?.status ?? filterStatus;
    const q = next?.q ?? search;

    startTransition(() => {
      (async () => {
        try {
          const nextRows = await actionListClientSelfRegistrations({
            status,
            q,
            take: 120
          });
          setRows(nextRows);
        } catch (error) {
          setFeedback({
            tone: "error",
            message: error instanceof Error ? error.message : "No se pudo actualizar la bandeja."
          });
        }
      })();
    });
  };

  const handleGenerateInvite = (event: FormEvent) => {
    event.preventDefault();
    setFeedback(null);

    startTransition(() => {
      (async () => {
        try {
          const result = await actionCreateClientRegistrationInvite({
            clientType: inviteType,
            expiryDays: inviteExpiryDays,
            note: inviteNote
          });
          setLatestInvite(result as InviteResponse);
          setFeedback({ tone: "success", message: "Link de auto-registro generado correctamente." });
          setInviteNote("");
          refreshRows();
        } catch (error) {
          setFeedback({
            tone: "error",
            message: error instanceof Error ? error.message : "No se pudo generar el enlace."
          });
        }
      })();
    });
  };

  const handleCopyLink = async () => {
    if (!latestInviteUrl) return;
    try {
      await navigator.clipboard.writeText(latestInviteUrl);
      setFeedback({ tone: "success", message: "Link copiado al portapapeles." });
    } catch {
      setFeedback({ tone: "error", message: "No se pudo copiar el link." });
    }
  };

  const handleOpenDetail = (registrationId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    setDetailError(null);
    setRejectReason("");
    setIsRejectMode(false);

    startTransition(() => {
      (async () => {
        try {
          const fetched = await actionGetClientSelfRegistrationDetail(registrationId);
          setDetail(fetched);
        } catch (error) {
          setDetailError(error instanceof Error ? error.message : "No se pudo cargar el detalle.");
        } finally {
          setDetailLoading(false);
        }
      })();
    });
  };

  const handleApprove = () => {
    if (!detail) return;
    setFeedback(null);

    startTransition(() => {
      (async () => {
        try {
          await actionApproveClientSelfRegistration({ registrationId: detail.id });
          setFeedback({ tone: "success", message: `Registro ${detail.provisionalCode} aprobado.` });
          setDetailOpen(false);
          setDetail(null);
          refreshRows();
        } catch (error) {
          setDetailError(error instanceof Error ? error.message : "No se pudo aprobar el registro.");
        }
      })();
    });
  };

  const handleReject = () => {
    if (!detail) return;
    if (rejectReason.trim().length < 5) {
      setDetailError("Ingresa un motivo de rechazo (mínimo 5 caracteres).");
      return;
    }

    setFeedback(null);
    setDetailError(null);

    startTransition(() => {
      (async () => {
        try {
          await actionRejectClientSelfRegistration({
            registrationId: detail.id,
            reason: rejectReason.trim()
          });
          setFeedback({ tone: "success", message: `Registro ${detail.provisionalCode} rechazado.` });
          setDetailOpen(false);
          setDetail(null);
          setRejectReason("");
          setIsRejectMode(false);
          refreshRows();
        } catch (error) {
          setDetailError(error instanceof Error ? error.message : "No se pudo rechazar el registro.");
        }
      })();
    });
  };

  const duplicateCard = (item: ClientSelfRegistrationDuplicateRow) => (
    <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
      <p className="font-semibold text-slate-900">{item.label}</p>
      <p>Tipo: {clientTypeLabel(item.type)}</p>
      <p>NIT: {item.nit || "—"} · DPI: {item.dpi || "—"}</p>
      <p>Email: {item.email || "—"} · Tel: {item.phone || "—"}</p>
      <Link href={`/admin/clientes/${item.id}`} className="mt-1 inline-flex text-[11px] font-semibold text-[#2e75ba] hover:text-[#4aadf5]">
        Abrir cliente
      </Link>
    </div>
  );

  return (
    <section className="space-y-4 rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Recepción</p>
        <h2 className="text-lg font-semibold text-[#102a43]">Auto-registros por link</h2>
        <p className="text-sm text-slate-600">Genera enlaces con QR, revisa pendientes y aprueba/rechaza para crear clientes reales.</p>
      </div>

      <form onSubmit={handleGenerateInvite} className="grid gap-3 rounded-xl border border-[#dce7f5] bg-[#f8fbff] p-4 md:grid-cols-12">
        <label className="space-y-1 md:col-span-4">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tipo</span>
          <select
            value={inviteType}
            onChange={(event) => setInviteType(event.target.value as ClientProfileType)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
          >
            {clientTypeOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Vence (días)</span>
          <input
            type="number"
            min={1}
            max={30}
            value={inviteExpiryDays}
            onChange={(event) => setInviteExpiryDays(Number(event.target.value || 7))}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
          />
        </label>

        <label className="space-y-1 md:col-span-4">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Nota (opcional)</span>
          <input
            type="text"
            value={inviteNote}
            onChange={(event) => setInviteNote(event.target.value)}
            placeholder="Ej. Registro para proveedor de laboratorio"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
          />
        </label>

        <div className="md:col-span-2 flex items-end">
          <button
            type="submit"
            disabled={isPending}
            className="h-11 w-full rounded-xl bg-[#4aa59c] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3f988f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Generando..." : "Generar link"}
          </button>
        </div>
      </form>

      {latestInvite && (
        <div className="grid gap-4 rounded-xl border border-[#cfe8e4] bg-[#eff8f7] p-4 md:grid-cols-[1fr_auto]">
          <div className="space-y-2 text-sm text-slate-700">
            <p className="font-semibold text-[#1f6f68]">Link generado para {clientTypeLabel(latestInvite.clientType)}</p>
            <p className="break-all rounded-lg border border-[#cde7e4] bg-white px-3 py-2 text-xs text-slate-700">{latestInviteUrl}</p>
            <p className="text-xs text-slate-500">Expira: {formatDateTime(latestInvite.expiresAt)}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="rounded-lg border border-[#4aa59c] px-3 py-1.5 text-xs font-semibold text-[#1f6f68] hover:bg-white"
              >
                Copiar link
              </button>
              {latestInviteUrl && (
                <Link
                  href={latestInviteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-[#4aa59c] px-3 py-1.5 text-xs font-semibold text-[#1f6f68] hover:bg-white"
                >
                  Abrir formulario
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center justify-center rounded-xl border border-[#cde7e4] bg-white p-3">
            {latestInviteUrl ? <QRCodeSVG value={latestInviteUrl} size={140} /> : <QrCode className="h-9 w-9 text-slate-400" />}
          </div>
        </div>
      )}

      {feedback && (
        <div
          className={
            feedback.tone === "success"
              ? "rounded-xl border border-[#cde7e4] bg-[#eff8f7] px-3 py-2 text-sm text-[#1f6f68]"
              : "rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
          }
        >
          {feedback.message}
        </div>
      )}

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-12">
        <label className="space-y-1 md:col-span-3">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Estado</span>
          <select
            value={filterStatus}
            onChange={(event) => {
              const next = event.target.value;
              setFilterStatus(next);
              refreshRows({ status: next });
            }}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
          >
            <option value="ALL">Todos</option>
            <option value="PENDING">Pendientes</option>
            <option value="APPROVED">Aprobados</option>
            <option value="REJECTED">Rechazados</option>
          </select>
        </label>

        <label className="space-y-1 md:col-span-7">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Buscar</span>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                refreshRows({ q: search });
              }
            }}
            placeholder="Correlativo, nombre, documento, email, teléfono"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
          />
        </label>

        <div className="md:col-span-2 flex items-end">
          <button
            type="button"
            onClick={() => refreshRows({ q: search })}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-[#4aa59c] hover:text-[#1f6f68]"
          >
            Aplicar
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-3 py-2">Correlativo</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Documento</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2 text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-800">{row.provisionalCode}</td>
                <td className="px-3 py-2 text-slate-700">{clientTypeLabel(row.clientType)}</td>
                <td className="px-3 py-2 text-slate-700">{row.displayName || "—"}</td>
                <td className="px-3 py-2 text-slate-600">{row.documentRef || "—"}</td>
                <td className="px-3 py-2">
                  <span className={statusPill(row.status)}>{row.status}</span>
                </td>
                <td className="px-3 py-2 text-slate-600">{formatDateTime(row.createdAt)}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleOpenDetail(row.id)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#4aa59c] hover:text-[#1f6f68]"
                  >
                    Ver
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-500">
                  No hay registros para los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetail(null);
          setDetailError(null);
          setRejectReason("");
          setIsRejectMode(false);
        }}
        title="Detalle de auto-registro"
        subtitle={detail ? `${detail.provisionalCode} · ${clientTypeLabel(detail.clientType)}` : "Cargando"}
        className="max-w-4xl"
        footer={
          detail ? (
            <div className="flex flex-wrap justify-end gap-2">
              {detail.status === ClientSelfRegistrationStatus.PENDING && canReview && (
                <>
                  {!isRejectMode ? (
                    <button
                      type="button"
                      onClick={() => setIsRejectMode(true)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Rechazar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleReject}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      <XCircle className="h-4 w-4" />
                      Confirmar rechazo
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleApprove}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#4aa59c] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f988f]"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Aprobar
                  </button>
                </>
              )}
              {detail.assignedClient?.id && (
                <Link
                  href={`/admin/clientes/${detail.assignedClient.id}`}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aa59c] hover:text-[#1f6f68]"
                >
                  Abrir cliente
                </Link>
              )}
            </div>
          ) : null
        }
      >
        {detailLoading && <p className="text-sm text-slate-500">Cargando detalle...</p>}

        {!detailLoading && detailError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{detailError}</div>
        )}

        {!detailLoading && detail && (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 md:grid-cols-2">
              <p>
                <span className="font-semibold text-slate-900">Nombre:</span> {detail.displayName || "—"}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Documento:</span> {detail.documentRef || "—"}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Email:</span> {detail.email || "—"}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Teléfono:</span> {detail.phone || "—"}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Estado:</span> {detail.status}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Creado:</span> {formatDateTime(detail.createdAt)}
              </p>
            </div>

            {isRejectMode && detail.status === ClientSelfRegistrationStatus.PENDING && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                <label className="space-y-1 text-sm text-rose-800">
                  <span className="font-semibold">Motivo de rechazo</span>
                  <textarea
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-rose-300 focus:outline-none"
                    placeholder="Explica por qué se rechaza el registro"
                  />
                </label>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Payload capturado</p>
              <pre className="max-h-64 overflow-auto rounded-xl border border-slate-200 bg-slate-950/95 p-3 text-[11px] text-slate-100">
                {JSON.stringify(detail.payloadJson, null, 2)}
              </pre>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Posibles duplicados</p>
              {detail.duplicates.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">Sin duplicados detectados.</p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">{detail.duplicates.map(duplicateCard)}</div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
