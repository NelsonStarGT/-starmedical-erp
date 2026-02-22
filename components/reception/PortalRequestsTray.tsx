"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  actionConfirmPortalAppointmentRequest,
  actionRejectPortalAppointmentRequest,
  type PortalAppointmentRequestRow
} from "@/app/admin/reception/actions";
import { Modal } from "@/components/ui/Modal";
import type { ReceptionCapability } from "@/lib/reception/permissions";

type DoctorOption = {
  id: string;
  name: string;
  email: string;
};

type Props = {
  siteId: string;
  capabilities: ReceptionCapability[];
  initialRows: PortalAppointmentRequestRow[];
  doctorOptions: DoctorOption[];
};

function formatDateTime(value: string) {
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

function toDatetimeLocalValue(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function compactText(value: string, maxLength = 110) {
  const normalized = value.trim();
  if (!normalized) return "Sin motivo registrado.";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3)}...`;
}

export default function PortalRequestsTray({ siteId, capabilities, initialRows, doctorOptions }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState<PortalAppointmentRequestRow[]>(initialRows);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const [confirmTarget, setConfirmTarget] = useState<PortalAppointmentRequestRow | null>(null);
  const [confirmDateTime, setConfirmDateTime] = useState("");
  const [confirmSpecialistId, setConfirmSpecialistId] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const [rejectTarget, setRejectTarget] = useState<PortalAppointmentRequestRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);

  const canProcess = useMemo(() => capabilities.includes("VISIT_CREATE"), [capabilities]);

  const openConfirm = (row: PortalAppointmentRequestRow) => {
    setFeedback(null);
    setConfirmError(null);
    setConfirmTarget(row);
    setConfirmDateTime(toDatetimeLocalValue(row.preferredDate1 || row.scheduledAt));
    setConfirmSpecialistId("");
  };

  const openReject = (row: PortalAppointmentRequestRow) => {
    setFeedback(null);
    setRejectError(null);
    setRejectTarget(row);
    setRejectReason("");
  };

  const closeConfirm = () => {
    setConfirmTarget(null);
    setConfirmDateTime("");
    setConfirmSpecialistId("");
    setConfirmError(null);
  };

  const closeReject = () => {
    setRejectTarget(null);
    setRejectReason("");
    setRejectError(null);
  };

  const handleConfirm = (event: FormEvent) => {
    event.preventDefault();
    if (!confirmTarget) return;
    if (!confirmDateTime) {
      setConfirmError("Debes seleccionar fecha y hora final.");
      return;
    }

    startTransition(() => {
      (async () => {
        try {
          await actionConfirmPortalAppointmentRequest({
            appointmentId: confirmTarget.id,
            siteId,
            scheduledAt: confirmDateTime,
            specialistId: confirmSpecialistId || null
          });

          setRows((prev) => prev.filter((row) => row.id !== confirmTarget.id));
          setFeedback({ tone: "success", message: "Solicitud confirmada correctamente." });
          closeConfirm();
          router.refresh();
        } catch (error) {
          setConfirmError(error instanceof Error ? error.message : "No se pudo confirmar la solicitud.");
        }
      })();
    });
  };

  const handleReject = (event: FormEvent) => {
    event.preventDefault();
    if (!rejectTarget) return;
    const trimmedReason = rejectReason.trim();
    if (trimmedReason.length < 5) {
      setRejectError("El motivo debe tener al menos 5 caracteres.");
      return;
    }

    startTransition(() => {
      (async () => {
        try {
          await actionRejectPortalAppointmentRequest({
            appointmentId: rejectTarget.id,
            siteId,
            reason: trimmedReason
          });

          setRows((prev) => prev.filter((row) => row.id !== rejectTarget.id));
          setFeedback({ tone: "success", message: "Solicitud rechazada y cancelada." });
          closeReject();
          router.refresh();
        } catch (error) {
          setRejectError(error instanceof Error ? error.message : "No se pudo rechazar la solicitud.");
        }
      })();
    });
  };

  return (
    <section className="space-y-4 rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Solicitudes Portal</p>
          <h2 className="mt-1 text-lg font-semibold text-[#102a43]">Bandeja de solicitudes por confirmar</h2>
          <p className="mt-1 text-sm text-slate-600">Gestiona solicitudes con estado REQUESTED y conviértelas en citas confirmadas.</p>
        </div>
        <span className="rounded-full border border-[#dce7f5] bg-[#f8fbff] px-3 py-1 text-xs font-semibold text-[#2e75ba]">
          Pendientes: {rows.length}
        </span>
      </div>

      {!canProcess && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Tu rol no tiene permiso para confirmar/rechazar solicitudes de portal.
        </div>
      )}

      {feedback && (
        <div
          className={
            feedback.tone === "success"
              ? "rounded-xl border border-[#cde7e4] bg-[#eff8f7] px-3 py-2 text-sm text-[#1f6f68]"
              : "rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          }
        >
          {feedback.message}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#d2e2f6] bg-[#f8fbff] px-4 py-8 text-sm text-slate-500">
          No hay solicitudes pendientes para la sede activa.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#dce7f5]">
          <table className="min-w-[1100px] w-full divide-y divide-[#e2ebf8]">
            <thead className="bg-[#f6fbff]">
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                <th className="px-3 py-2">Paciente</th>
                <th className="px-3 py-2">DPI / Teléfono</th>
                <th className="px-3 py-2">Tipo / Sede</th>
                <th className="px-3 py-2">Preferencia 1</th>
                <th className="px-3 py-2">Preferencia 2</th>
                <th className="px-3 py-2">Motivo</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef3fb] bg-white">
              {rows.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="px-3 py-3">
                    <p className="text-sm font-semibold text-[#102a43]">{row.patientName}</p>
                    <p className="mt-1 text-xs text-slate-500">Solicitada: {formatDateTime(row.requestedAt)}</p>
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-700">
                    <p>{row.patientDpi || "—"}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.patientPhone || "Sin teléfono"}</p>
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-700">
                    <p>{row.typeName}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.branchName || "Sede no disponible"}</p>
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-700">{formatDateTime(row.preferredDate1)}</td>
                  <td className="px-3 py-3 text-sm text-slate-700">{row.preferredDate2 ? formatDateTime(row.preferredDate2) : "—"}</td>
                  <td className="px-3 py-3 text-sm text-slate-700">{compactText(row.reason)}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openConfirm(row)}
                        disabled={!canProcess || isPending}
                        className="rounded-lg bg-[#4aa59c] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#3f988f] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => openReject(row)}
                        disabled={!canProcess || isPending}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Rechazar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={Boolean(confirmTarget)}
        onClose={closeConfirm}
        title="Confirmar solicitud portal"
        subtitle="REQUESTED → CONFIRMADA"
        className="max-w-2xl"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeConfirm}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="confirm-portal-request-form"
              disabled={isPending}
              className="rounded-lg bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f988f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Guardando..." : "Confirmar cita"}
            </button>
          </div>
        }
      >
        {confirmTarget ? (
          <form id="confirm-portal-request-form" onSubmit={handleConfirm} className="space-y-4">
            <div className="rounded-xl border border-[#dce7f5] bg-[#f8fbff] px-3 py-2 text-sm text-slate-700">
              <p>
                <span className="font-semibold text-[#102a43]">Paciente:</span> {confirmTarget.patientName}
              </p>
              <p className="mt-1">
                <span className="font-semibold text-[#102a43]">Preferencia 1:</span> {formatDateTime(confirmTarget.preferredDate1)}
              </p>
              {confirmTarget.preferredDate2 ? (
                <p className="mt-1">
                  <span className="font-semibold text-[#102a43]">Preferencia 2:</span> {formatDateTime(confirmTarget.preferredDate2)}
                </p>
              ) : null}
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Fecha/hora final
              <input
                type="datetime-local"
                value={confirmDateTime}
                onChange={(event) => setConfirmDateTime(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[#d2e2f6] bg-white px-3 py-2 text-sm text-slate-900"
                required
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Especialista (opcional)
              <select
                value={confirmSpecialistId}
                onChange={(event) => setConfirmSpecialistId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[#d2e2f6] bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="">Mantener especialista actual</option>
                {doctorOptions.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name} ({doctor.email})
                  </option>
                ))}
              </select>
            </label>

            {confirmError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{confirmError}</p>}
          </form>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(rejectTarget)}
        onClose={closeReject}
        title="Rechazar solicitud portal"
        subtitle="REQUESTED → CANCELADA"
        className="max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeReject}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="reject-portal-request-form"
              disabled={isPending}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Guardando..." : "Confirmar rechazo"}
            </button>
          </div>
        }
      >
        {rejectTarget ? (
          <form id="reject-portal-request-form" onSubmit={handleReject} className="space-y-4">
            <div className="rounded-xl border border-[#dce7f5] bg-[#f8fbff] px-3 py-2 text-sm text-slate-700">
              <p>
                <span className="font-semibold text-[#102a43]">Paciente:</span> {rejectTarget.patientName}
              </p>
              <p className="mt-1">
                <span className="font-semibold text-[#102a43]">Motivo original:</span> {compactText(rejectTarget.reason, 180)}
              </p>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Motivo de rechazo
              <textarea
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                rows={4}
                className="mt-1 w-full rounded-lg border border-[#d2e2f6] bg-white px-3 py-2 text-sm text-slate-900"
                placeholder="Ejemplo: No hay disponibilidad para el servicio en esta sede."
                required
              />
            </label>

            {rejectError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{rejectError}</p>}
          </form>
        ) : null}
      </Modal>
    </section>
  );
}
