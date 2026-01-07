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
import type { HrEmployee, HrEmployeeDocument, HrEmployeeStatus, HrEmployeeDocumentType, HrEmploymentType } from "@/types/hr";
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

export default function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const [tab, setTab] = useState<"datos" | "documentos">("datos");
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
      fileUrl: "",
      issuedAt: "",
      expiresAt: "",
      notes: ""
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

  const onDeleteDoc = async (doc: HrEmployeeDocument) => {
    await fetch(`/api/hr/employees/${params.id}/documents/${doc.id}`, { method: "DELETE" });
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
      fileUrl: "",
      issuedAt: "",
      expiresAt: "",
      notes: ""
    });
    await employeeQuery.refetch();
  };

  const actions = useMemo(() => {
    if (!employee) return [];
    const items: Array<{ label: string; intent: "ghost" | "danger" | "primary"; action: "suspend" | "activate" | "terminate" }> = [];
    if (employee.status === HrEmployeeStatus.ACTIVE) {
      items.push({ label: "Suspender", intent: "ghost", action: "suspend" });
      items.push({ label: "Terminar", intent: "danger", action: "terminate" });
    }
    if (employee.status === HrEmployeeStatus.SUSPENDED) {
      items.push({ label: "Activar", intent: "primary", action: "activate" });
      items.push({ label: "Terminar", intent: "danger", action: "terminate" });
    }
    if (employee.status === HrEmployeeStatus.TERMINATED) {
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
        <div>
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
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Código {employee.employeeCode} • {employee.position?.name || "Sin puesto"} •{" "}
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

      <div className="flex gap-3 border-b border-slate-200">
        <button
          onClick={() => setTab("datos")}
          className={cn(
            "px-4 py-2 text-sm font-semibold rounded-t-xl",
            tab === "datos" ? "bg-white border border-slate-200 border-b-white shadow-soft" : "text-slate-600"
          )}
        >
          Datos
        </button>
        <button
          onClick={() => setTab("documentos")}
          className={cn(
            "px-4 py-2 text-sm font-semibold rounded-t-xl",
            tab === "documentos" ? "bg-white border border-slate-200 border-b-white shadow-soft" : "text-slate-600"
          )}
        >
          Documentos
        </button>
      </div>

      {tab === "datos" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Información</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Código</p>
                <p className="font-semibold text-slate-900">{employee.employeeCode}</p>
              </div>
              <div>
                <p className="text-slate-500">Tipo</p>
                <p className="font-semibold text-slate-900">{employmentLabels[employee.employmentType]}</p>
              </div>
              <div>
                <p className="text-slate-500">Sucursal primaria</p>
                <p className="font-semibold text-slate-900">{employee.primaryBranch?.name || "—"}</p>
              </div>
              <div>
                <p className="text-slate-500">Departamento</p>
                <p className="font-semibold text-slate-900">{employee.department?.name || "—"}</p>
              </div>
              <div>
                <p className="text-slate-500">Puesto</p>
                <p className="font-semibold text-slate-900">{employee.position?.name || "—"}</p>
              </div>
              <div>
                <p className="text-slate-500">Fecha de ingreso</p>
                <p className="font-semibold text-slate-900">{formatDate(employee.hireDate)}</p>
              </div>
              <div>
                <p className="text-slate-500">Nacimiento</p>
                <p className="font-semibold text-slate-900">{formatDate(employee.birthDate)}</p>
              </div>
              <div>
                <p className="text-slate-500">Notas</p>
                <p className="font-semibold text-slate-900">{employee.notes || "—"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Asignaciones de sucursal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {employee.branchAssignments.length === 0 ? (
                <p className="text-slate-500">Sin asignaciones adicionales.</p>
              ) : (
                employee.branchAssignments.map((assign) => (
                  <div
                    key={assign.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2"
                  >
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
        </div>
      ) : (
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
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{doc.title}</p>
                      <p className="text-xs text-slate-500">
                        {documentLabels[doc.type]} • {formatDate(doc.issuedAt)}
                        {doc.expiresAt ? ` • Vence ${formatDate(doc.expiresAt)}` : ""}
                      </p>
                      <Link href={doc.fileUrl} className="text-brand-primary text-xs hover:underline" target="_blank">
                        {doc.fileUrl}
                      </Link>
                    </div>
                    <button
                      onClick={() => onDeleteDoc(doc)}
                      className="text-xs text-rose-600 hover:underline"
                      aria-label="Eliminar documento"
                    >
                      Eliminar
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
                    {...docForm.register("fileUrl")}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    placeholder="/uploads/..."
                  />
                  {docForm.formState.errors.fileUrl && (
                    <p className="text-xs text-rose-600 mt-1">{docForm.formState.errors.fileUrl.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-600">Emitido</label>
                    <input
                      type="date"
                      {...docForm.register("issuedAt")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600">Vence</label>
                    <input
                      type="date"
                      {...docForm.register("expiresAt")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-slate-600">Notas</label>
                  <textarea
                    {...docForm.register("notes")}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    rows={2}
                  />
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
              El empleado pasará a estado terminado y se registrará la fecha de salida. Las asignaciones de sucursal se
              cerrarán con esa fecha.
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
