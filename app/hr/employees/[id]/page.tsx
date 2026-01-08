"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { createEmployeeDocumentSchema } from "@/lib/hr/schemas";
import type {
  HrEmployee,
  HrEmployeeDocumentType,
  HrEmployeeStatus,
  HrEmploymentType,
  EmployeeDocumentVersion
} from "@/types/hr";
import { HR_EMPLOYEE_DOCUMENT_TYPES } from "@/types/hr";
import { cn } from "@/lib/utils";

type EmployeeResponse = { data: HrEmployee };

const statusCopy: Record<HrEmployeeStatus, { label: string; className: string }> = {
  ACTIVE: { label: "Activo", className: "bg-emerald-50 text-emerald-700" },
  SUSPENDED: { label: "Suspendido", className: "bg-amber-50 text-amber-700" },
  TERMINATED: { label: "Terminado", className: "bg-rose-50 text-rose-700" }
};

const employmentLabels: Record<HrEmploymentType, string> = {
  DEPENDENCIA: "Dependencia",
  HONORARIOS: "Honorarios",
  OUTSOURCING: "Outsourcing",
  TEMPORAL: "Temporal",
  PRACTICAS: "Prácticas"
};

const documentLabels: Record<HrEmployeeDocumentType, string> = {
  DPI: "DPI",
  CV: "CV",
  CONTRACT: "Contrato",
  TITLE: "Título",
  LICENSE: "Licencia",
  EVALUATION: "Evaluación",
  WARNING: "Advertencia",
  OTHER: "Otro"
};

async function fetchEmployee(id: string) {
  const res = await fetch(`/api/hr/employees/${id}`, { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "No se pudo cargar el empleado");
  }
  return (await res.json()) as EmployeeResponse;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-GT", { year: "numeric", month: "short", day: "numeric" });
}

function renderVersionMeta(version: EmployeeDocumentVersion | null) {
  if (!version) return "Sin versiones";
  return `${formatDate(version.issuedAt)} ${version.expiresAt ? `• Vence ${formatDate(version.expiresAt)}` : ""}`;
}

const tabs = [
  { key: "general", label: "General" },
  { key: "relacion", label: "Relación laboral" },
  { key: "asignaciones", label: "Sucursales/Puestos" },
  { key: "documentos", label: "Documentos" },
  { key: "colegiado", label: "Colegiado" }
] as const;

export default function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("general");
  const [actionModal, setActionModal] = useState<null | "suspend" | "activate" | "terminate">(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [terminationDate, setTerminationDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const employeeQuery = useQuery({
    queryKey: ["hr-employee", params.id],
    queryFn: () => fetchEmployee(params.id)
  });

  const docForm = useForm<z.infer<typeof createEmployeeDocumentSchema>>({
    resolver: zodResolver(createEmployeeDocumentSchema),
    defaultValues: {
      type: "OTHER",
      title: "",
      notes: "",
      retentionUntil: "",
      version: {
        versionNumber: 1,
        fileUrl: "",
        issuedAt: "",
        deliveredAt: "",
        expiresAt: "",
        notes: ""
      }
    }
  });

  const employee = employeeQuery.data?.data;

  const runAction = async () => {
    if (!actionModal) return;
    setActionError(null);
    const endpoint =
      actionModal === "suspend"
        ? `/api/hr/employees/${params.id}/suspend`
        : actionModal === "activate"
          ? `/api/hr/employees/${params.id}/activate`
          : `/api/hr/employees/${params.id}/terminate`;
    const payload = actionModal === "terminate" ? { terminationDate } : undefined;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: payload ? { "Content-Type": "application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setActionError(err?.error || "No se pudo completar la acción");
      return;
    }
    await employeeQuery.refetch();
    setActionModal(null);
  };

  const onDeleteDoc = async (docId: string) => {
    await fetch(`/api/hr/employees/${params.id}/documents/${docId}`, { method: "DELETE" });
    await employeeQuery.refetch();
  };

  const onSubmitDoc = async (values: z.infer<typeof createEmployeeDocumentSchema>) => {
    const res = await fetch(`/api/hr/employees/${params.id}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      docForm.setError("title", { message: err?.error || "No se pudo guardar" });
      return;
    }
    docForm.reset({
      type: "OTHER",
      title: "",
      notes: "",
      retentionUntil: "",
      version: { versionNumber: 1, fileUrl: "", issuedAt: "", deliveredAt: "", expiresAt: "", notes: "" }
    });
    await employeeQuery.refetch();
  };

  const actions = useMemo(() => {
    if (!employee) return [];
    const items: Array<{ label: string; intent: "ghost" | "danger" | "primary"; action: "suspend" | "activate" | "terminate" }> = [];
    if (employee.status === "ACTIVE") {
      items.push({ label: "Suspender", intent: "ghost", action: "suspend" });
      items.push({ label: "Terminar", intent: "danger", action: "terminate" });
    }
    if (employee.status === "SUSPENDED") {
      items.push({ label: "Activar", intent: "primary", action: "activate" });
      items.push({ label: "Terminar", intent: "danger", action: "terminate" });
    }
    if (employee.status === "TERMINATED") {
      items.push({ label: "Reactivar", intent: "primary", action: "activate" });
    }
    return items;
  }, [employee]);

  if (employeeQuery.isLoading) {
    return <p className="text-sm text-slate-600">Cargando empleado...</p>;
  }

  if (!employee) {
    return (
      <div className="space-y-2">
        <p className="text-lg font-semibold text-slate-900">Empleado no encontrado</p>
        <Link href="/hr/employees" className="text-brand-primary text-sm hover:underline">
          Volver al listado
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-slate-500">Empleado</p>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{employee.fullName}</h1>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                statusCopy[employee.status].className
              )}
            >
              {statusCopy[employee.status].label}
            </span>
            {employee.alerts.documentsExpiring > 0 && <Badge variant="warning">{employee.alerts.documentsExpiring} doc vence</Badge>}
            {employee.alerts.licenseExpiring && <Badge variant="warning">Colegiado vence</Badge>}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Código {employee.employeeCode} • {employee.primaryPosition?.name || "Sin puesto"} •{" "}
            {employee.primaryBranch?.name || "Sin sucursal"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((btn) => (
            <button
              key={btn.action}
              onClick={() => setActionModal(btn.action)}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold border transition",
                btn.intent === "primary" && "bg-brand-primary text-white border-brand-primary",
                btn.intent === "danger" && "bg-rose-50 text-rose-700 border-rose-200",
                btn.intent === "ghost" && "bg-white text-slate-800 border-slate-200"
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 border-b border-slate-200 flex-wrap">
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              "px-4 py-2 text-sm font-semibold rounded-t-xl",
              tab === item.key ? "bg-white border border-slate-200 border-b-white shadow-soft" : "text-slate-600"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "general" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Información personal</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Código</p>
                <p className="font-semibold text-slate-900">{employee.employeeCode}</p>
              </div>
              <div>
                <p className="text-slate-500">Razón social primaria</p>
                <p className="font-semibold text-slate-900">
                  {employee.primaryLegalEntity?.comercialName || employee.primaryLegalEntity?.name || "—"}
                </p>
              </div>
              <div>
                <p className="text-slate-500">DPI</p>
                <p className="font-semibold text-slate-900">{employee.dpi}</p>
              </div>
              <div>
                <p className="text-slate-500">NIT</p>
                <p className="font-semibold text-slate-900">{employee.nit || "—"}</p>
              </div>
              <div>
                <p className="text-slate-500">Correo</p>
                <p className="font-semibold text-slate-900">{employee.email || "—"}</p>
              </div>
              <div>
                <p className="text-slate-500">Correo personal</p>
                <p className="font-semibold text-slate-900">{employee.personalEmail || "—"}</p>
              </div>
              <div>
                <p className="text-slate-500">Teléfono móvil</p>
                <p className="font-semibold text-slate-900">{employee.phone || "—"}</p>
              </div>
              <div>
                <p className="text-slate-500">Teléfono casa</p>
                <p className="font-semibold text-slate-900">{employee.homePhone || "—"}</p>
              </div>
              <div>
                <p className="text-slate-500">Dirección</p>
                <p className="font-semibold text-slate-900">{employee.address || "—"}</p>
              </div>
              <div>
                <p className="text-slate-500">Contacto emergencia</p>
                <p className="font-semibold text-slate-900">
                  {employee.emergencyContactName || "—"} {employee.emergencyContactPhone ? `(${employee.emergencyContactPhone})` : ""}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Foto DPI</p>
                <p className="font-semibold text-slate-900">{employee.dpiPhotoUrl || "—"}</p>
              </div>
              <div>
                <p className="text-slate-500">RTU actualizado</p>
                <p className="font-semibold text-slate-900">{employee.rtuFileUrl || "—"}</p>
              </div>
              <div>
                <p className="text-slate-500">Comprobante vivienda</p>
                <p className="font-semibold text-slate-900">{employee.residenceProofUrl || "—"}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Estado y alertas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                <div>
                  <p className="text-slate-500">Estado</p>
                  <p className="font-semibold text-slate-900">{statusCopy[employee.status].label}</p>
                </div>
                {employee.primaryEngagement && (
                  <Badge variant="info">{employmentLabels[employee.primaryEngagement.employmentType]}</Badge>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Alertas</p>
                {employee.alerts.items.length === 0 ? (
                  <p className="text-slate-600 text-sm">Sin alertas pendientes.</p>
                ) : (
                  employee.alerts.items.map((alert) => (
                    <div key={`${alert.type}-${alert.entityId}`} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-semibold text-slate-900">{alert.title}</p>
                        <p className="text-xs text-slate-500">{alert.dueAt ? `Vence ${formatDate(alert.dueAt)}` : "Pendiente"}</p>
                      </div>
                      <Badge variant={alert.severity === "CRITICAL" ? "warning" : "info"}>
                        {alert.type === "LICENSE_EXPIRY" ? "Colegiado" : "Documento"}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "relacion" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Relaciones laborales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {employee.engagements.length === 0 ? (
                <p className="text-slate-500">Sin relaciones registradas.</p>
              ) : (
                employee.engagements.map((eng) => (
                  <div key={eng.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 px-3 py-2 gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {eng.legalEntity.comercialName || eng.legalEntity.name} • {employmentLabels[eng.employmentType]}
                      </p>
                      <p className="text-xs text-slate-500">
                        Inicio {formatDate(eng.startDate)} {eng.endDate ? `• Fin ${formatDate(eng.endDate)}` : ""} •{" "}
                        {eng.compensationAmount ? `Compensación Q${eng.compensationAmount}` : "Sin monto"}
                      </p>
                    </div>
                    {eng.isPrimary && <Badge variant="info">Principal</Badge>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "asignaciones" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Sucursales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {employee.branchAssignments.length === 0 ? (
                <p className="text-slate-500">Sin asignaciones.</p>
              ) : (
                employee.branchAssignments.map((assign) => (
                  <div key={assign.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                    <div>
                      <p className="font-semibold text-slate-900">{assign.branch?.name || assign.branchId}</p>
                      <p className="text-xs text-slate-500">
                        {formatDate(assign.startDate)} {assign.endDate ? `• Fin ${formatDate(assign.endDate)}` : ""}
                      </p>
                    </div>
                    {assign.isPrimary && <Badge variant="info">Primaria</Badge>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Puestos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {employee.positionAssignments.length === 0 ? (
                <p className="text-slate-500">Sin puestos asignados.</p>
              ) : (
                employee.positionAssignments.map((assign) => (
                  <div key={assign.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                    <div>
                      <p className="font-semibold text-slate-900">{assign.position?.name || assign.positionId}</p>
                      <p className="text-xs text-slate-500">
                        {assign.department?.name || "Sin departamento"} • {formatDate(assign.startDate)}{" "}
                        {assign.endDate ? `• Fin ${formatDate(assign.endDate)}` : ""}
                      </p>
                    </div>
                    {assign.isPrimary && <Badge variant="info">Primario</Badge>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "documentos" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Documentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {employee.documents.length === 0 ? (
                <p className="text-slate-500 text-sm">No hay documentos cargados.</p>
              ) : (
                employee.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-start justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm gap-3"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-900">{doc.title}</p>
                      <p className="text-xs text-slate-500">
                        {documentLabels[doc.type]} • {renderVersionMeta(doc.currentVersion)}
                      </p>
                      {doc.currentVersion?.fileUrl && (
                        <Link href={doc.currentVersion.fileUrl} className="text-brand-primary text-xs hover:underline" target="_blank">
                          {doc.currentVersion.fileUrl}
                        </Link>
                      )}
                      {doc.versions.length > 1 && (
                        <p className="text-xs text-slate-500">Versiones: {doc.versions.length}</p>
                      )}
                    </div>
                    <button
                      onClick={() => onDeleteDoc(doc.id)}
                      className="text-xs text-rose-600 hover:underline"
                      aria-label="Archivar documento"
                    >
                      Archivar
                    </button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Agregar documento</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3 text-sm" onSubmit={docForm.handleSubmit(onSubmitDoc)}>
                <div>
                  <label className="text-slate-600">Tipo</label>
                  <select
                    {...docForm.register("type")}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  >
                    {HR_EMPLOYEE_DOCUMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {documentLabels[type]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-600">Título</label>
                  <input
                    {...docForm.register("title")}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  />
                  {docForm.formState.errors.title && (
                    <p className="text-xs text-rose-600 mt-1">{docForm.formState.errors.title.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-slate-600">URL / Ruta</label>
                  <input
                    {...docForm.register("version.fileUrl")}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    placeholder="/uploads/..."
                  />
                  {docForm.formState.errors.version?.fileUrl && (
                    <p className="text-xs text-rose-600 mt-1">{docForm.formState.errors.version.fileUrl.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-600">Emitido</label>
                    <input
                      type="date"
                      {...docForm.register("version.issuedAt")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600">Entregado</label>
                    <input
                      type="date"
                      {...docForm.register("version.deliveredAt")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600">Vence</label>
                    <input
                      type="date"
                      {...docForm.register("version.expiresAt")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600">Notas</label>
                    <input
                      {...docForm.register("version.notes")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={docForm.formState.isSubmitting}
                  className="w-full rounded-xl bg-brand-primary px-4 py-2 text-white font-semibold shadow-soft disabled:opacity-60"
                >
                  {docForm.formState.isSubmitting ? "Guardando..." : "Guardar documento"}
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "colegiado" && (
        <Card>
          <CardHeader>
            <CardTitle>Colegiado</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Aplica</p>
              <p className="font-semibold text-slate-900">{employee.professionalLicense?.applies ? "Sí" : "No"}</p>
            </div>
            <div>
              <p className="text-slate-500">Número</p>
              <p className="font-semibold text-slate-900">{employee.professionalLicense?.number || "—"}</p>
            </div>
            <div>
              <p className="text-slate-500">Emisión</p>
              <p className="font-semibold text-slate-900">{formatDate(employee.professionalLicense?.issuedAt)}</p>
            </div>
            <div>
              <p className="text-slate-500">Vence</p>
              <p className="font-semibold text-slate-900">{formatDate(employee.professionalLicense?.expiresAt)}</p>
            </div>
            <div>
              <p className="text-slate-500">Archivo</p>
              <p className="font-semibold text-slate-900">{employee.professionalLicense?.fileUrl || "—"}</p>
            </div>
            <div>
              <p className="text-slate-500">Recordar antes</p>
              <p className="font-semibold text-slate-900">
                {employee.professionalLicense?.reminderDays ? `${employee.professionalLicense.reminderDays} días` : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Modal
        open={Boolean(actionModal)}
        onClose={() => setActionModal(null)}
        title="Confirmar acción"
        subtitle={actionModal === "terminate" ? "Terminar contrato" : actionModal === "suspend" ? "Suspender" : "Activar"}
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setActionModal(null)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancelar
            </button>
            <button
              onClick={runAction}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold",
                actionModal === "terminate"
                  ? "bg-rose-600 text-white"
                  : actionModal === "activate"
                    ? "bg-brand-primary text-white"
                    : "bg-amber-500 text-white"
              )}
            >
              Confirmar
            </button>
          </div>
        }
      >
        {actionModal === "terminate" ? (
          <div className="space-y-3 text-sm">
            <p className="text-slate-600">
              El empleado pasará a estado terminado y se cerrarán las relaciones y asignaciones activas con esa fecha.
            </p>
            <label className="text-slate-600">Fecha de terminación</label>
            <input
              type="date"
              value={terminationDate}
              onChange={(e) => setTerminationDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-200"
            />
          </div>
        ) : actionModal === "suspend" ? (
          <p className="text-sm text-slate-600">El empleado quedará suspendido hasta reactivarlo.</p>
        ) : (
          <p className="text-sm text-slate-600">El empleado volverá a estado Activo.</p>
        )}
        {actionError && <p className="text-sm text-rose-600 mt-2">{actionError}</p>}
      </Modal>
    </div>
  );
}
