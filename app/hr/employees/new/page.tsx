"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  HR_EMPLOYEE_DOCUMENT_TYPES,
  HR_EMPLOYEE_STATUSES,
  HR_EMPLOYMENT_TYPES,
  PAY_FREQUENCIES,
  type HrBranch,
  type HrDepartment,
  type HrPosition,
  type HrEmployeeDocumentType,
  type HrEmploymentType,
  type PayFrequency,
  type LegalEntitySummary
} from "@/types/hr";

type FormValues = {
  employeeCode: string;
  firstName: string;
  lastName: string;
  dpi: string;
  nit: string;
  email: string;
  personalEmail: string;
  phone: string;
  homePhone: string;
  birthDate: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  residenceProofUrl: string;
  dpiPhotoUrl: string;
  rtuFileUrl: string;
  photoUrl: string;
  startDate: string;
  endDate: string;
  legalEntityId: string;
  employmentType: HrEmploymentType;
  compensationAmount: string;
  compensationFrequency: PayFrequency;
  branchId: string;
  positionId: string;
  departmentId: string;
  licenseApplies: boolean;
  licenseNumber: string;
  licenseIssuedAt: string;
  licenseExpiresAt: string;
  licenseFileUrl: string;
  licenseReminderDays: string;
  documentType: HrEmployeeDocumentType;
  documentTitle: string;
  documentFileUrl: string;
  documentIssuedAt: string;
  documentDeliveredAt: string;
  documentExpiresAt: string;
  documentNotes: string;
};

type DocumentDraft = {
  type: HrEmployeeDocumentType;
  title: string;
  notes?: string | null;
  version: {
    versionNumber: number;
    fileUrl: string;
    issuedAt?: string | null;
    deliveredAt?: string | null;
    expiresAt?: string | null;
    notes?: string | null;
  };
};

async function fetchBranches(): Promise<HrBranch[]> {
  const res = await fetch("/api/hr/branches", { cache: "no-store" });
  if (!res.ok) return [];
  const payload = await res.json();
  return payload.data || [];
}

async function fetchDepartments(): Promise<HrDepartment[]> {
  const res = await fetch("/api/hr/departments", { cache: "no-store" });
  if (!res.ok) return [];
  const payload = await res.json();
  return payload.data || [];
}

async function fetchPositions(): Promise<HrPosition[]> {
  const res = await fetch("/api/hr/positions", { cache: "no-store" });
  if (!res.ok) return [];
  const payload = await res.json();
  return payload.data || [];
}

async function fetchLegalEntities(): Promise<LegalEntitySummary[]> {
  const res = await fetch("/api/finanzas/legal-entities", { cache: "no-store" });
  if (!res.ok) return [];
  const payload = await res.json();
  return payload.data || [];
}

const employmentLabels: Record<HrEmploymentType, string> = {
  DEPENDENCIA: "Dependencia",
  HONORARIOS: "Honorarios",
  OUTSOURCING: "Outsourcing",
  TEMPORAL: "Temporal",
  PRACTICAS: "Prácticas"
};

const steps = ["Datos", "Relación", "Documentos"];

export default function NewEmployeePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [documents, setDocuments] = useState<DocumentDraft[]>([]);

  const form = useForm<FormValues>({
    defaultValues: {
      employeeCode: "",
      firstName: "",
      lastName: "",
      dpi: "",
      nit: "",
      email: "",
      personalEmail: "",
      phone: "",
      homePhone: "",
      birthDate: "",
      address: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      residenceProofUrl: "",
      dpiPhotoUrl: "",
      rtuFileUrl: "",
      photoUrl: "",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "",
      legalEntityId: "",
      employmentType: HR_EMPLOYMENT_TYPES[0],
      compensationAmount: "",
      compensationFrequency: PAY_FREQUENCIES[2],
      branchId: "",
      positionId: "",
      departmentId: "",
      licenseApplies: false,
      licenseNumber: "",
      licenseIssuedAt: "",
      licenseExpiresAt: "",
      licenseFileUrl: "",
      licenseReminderDays: "",
      documentType: HR_EMPLOYEE_DOCUMENT_TYPES[0],
      documentTitle: "",
      documentFileUrl: "",
      documentIssuedAt: "",
      documentDeliveredAt: "",
      documentExpiresAt: "",
      documentNotes: ""
    }
  });

  const branchesQuery = useQuery({ queryKey: ["hr-branches"], queryFn: fetchBranches });
  const departmentsQuery = useQuery({ queryKey: ["hr-departments"], queryFn: fetchDepartments });
  const positionsQuery = useQuery({ queryKey: ["hr-positions"], queryFn: fetchPositions });
  const legalEntitiesQuery = useQuery({ queryKey: ["legal-entities"], queryFn: fetchLegalEntities });

  const loadingCatalogs = branchesQuery.isLoading || positionsQuery.isLoading || legalEntitiesQuery.isLoading;

  useEffect(() => {
    if (branchesQuery.data && branchesQuery.data.length && !form.getValues("branchId")) {
      form.setValue("branchId", branchesQuery.data[0].id);
    }
  }, [branchesQuery.data, form]);

  useEffect(() => {
    if (positionsQuery.data && positionsQuery.data.length && !form.getValues("positionId")) {
      form.setValue("positionId", positionsQuery.data[0].id);
    }
  }, [positionsQuery.data, form]);

  useEffect(() => {
    if (legalEntitiesQuery.data && legalEntitiesQuery.data.length && !form.getValues("legalEntityId")) {
      form.setValue("legalEntityId", legalEntitiesQuery.data[0].id);
    }
  }, [legalEntitiesQuery.data, form]);

  const addDocument = () => {
    const values = form.getValues();
    if (!values.documentTitle || !values.documentFileUrl) return;
    const next: DocumentDraft = {
      type: values.documentType,
      title: values.documentTitle,
      notes: values.documentNotes || null,
      version: {
        versionNumber: 1,
        fileUrl: values.documentFileUrl,
        issuedAt: values.documentIssuedAt || null,
        deliveredAt: values.documentDeliveredAt || null,
        expiresAt: values.documentExpiresAt || null,
        notes: values.documentNotes || null
      }
    };
    setDocuments((prev) => [...prev, next]);
    form.setValue("documentTitle", "");
    form.setValue("documentFileUrl", "");
    form.setValue("documentIssuedAt", "");
    form.setValue("documentDeliveredAt", "");
    form.setValue("documentExpiresAt", "");
    form.setValue("documentNotes", "");
  };

  const removeDocument = (idx: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== idx));
  };

  const onSubmit = async (values: FormValues) => {
    setError(null);
    const payload = {
      employeeCode: values.employeeCode || undefined,
      firstName: values.firstName,
      lastName: values.lastName,
      dpi: values.dpi,
      nit: values.nit || null,
      email: values.email || null,
      personalEmail: values.personalEmail || null,
      phone: values.phone || null,
      homePhone: values.homePhone,
      birthDate: values.birthDate || null,
      address: values.address,
      emergencyContactName: values.emergencyContactName,
      emergencyContactPhone: values.emergencyContactPhone,
      residenceProofUrl: values.residenceProofUrl,
      dpiPhotoUrl: values.dpiPhotoUrl,
      rtuFileUrl: values.rtuFileUrl,
      photoUrl: values.photoUrl || null,
      status: HR_EMPLOYEE_STATUSES[0],
      engagements: [
        {
          legalEntityId: values.legalEntityId,
          employmentType: values.employmentType,
          status: HR_EMPLOYEE_STATUSES[0],
          startDate: values.startDate,
          endDate: values.endDate || null,
          isPrimary: true,
          isPayrollEligible: true,
          compensationAmount: values.compensationAmount ? Number(values.compensationAmount) : undefined,
          compensationCurrency: "GTQ",
          compensationFrequency: values.compensationFrequency,
          compensationNotes: null
        }
      ],
      branchAssignments: [
        {
          branchId: values.branchId,
          isPrimary: true,
          startDate: values.startDate,
          endDate: values.endDate || null
        }
      ],
      positionAssignments: [
        {
          positionId: values.positionId,
          departmentId: values.departmentId || null,
          isPrimary: true,
          startDate: values.startDate,
          endDate: values.endDate || null
        }
      ],
      documents,
      professionalLicense: values.licenseApplies
        ? {
            applies: true,
            number: values.licenseNumber || null,
            issuedAt: values.licenseIssuedAt || null,
            expiresAt: values.licenseExpiresAt || null,
            fileUrl: values.licenseFileUrl || null,
            reminderDays: values.licenseReminderDays ? Number(values.licenseReminderDays) : null
          }
        : { applies: false }
    };

    const res = await fetch("/api/hr/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err?.error || "No se pudo crear el empleado");
      return;
    }
    const data = await res.json();
    const id = data?.data?.id;
    router.push(id ? `/hr/employees/${id}` : "/hr/employees");
  };

  const currentStepLabel = useMemo(() => steps[step], [step]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">RRHH</p>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Nuevo empleado</h1>
          <p className="text-sm text-slate-500 mt-1">Datos mínimos para activar a un colaborador.</p>
        </div>
        <Link href="/hr/employees" className="text-sm text-brand-primary hover:underline">
          ← Volver al listado
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {steps.map((label, idx) => (
          <div
            key={label}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${idx === step ? "border-brand-primary bg-brand-primary/10 text-brand-primary" : "border-slate-200 text-slate-600"}`}
          >
            <span className="text-xs font-semibold">{idx + 1}</span>
            <span className="text-sm font-semibold">{label}</span>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Paso {step + 1}: {currentStepLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            {step === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-slate-600">Nombres</label>
                    <input
                      {...form.register("firstName", { required: true })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Apellidos</label>
                    <input
                      {...form.register("lastName", { required: true })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Código (opcional)</label>
                    <input
                      {...form.register("employeeCode")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                      placeholder="EMP-0003"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-slate-600">DPI</label>
                    <input
                      {...form.register("dpi", { required: true })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">NIT</label>
                    <input
                      {...form.register("nit")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Correo</label>
                    <input
                      type="email"
                      {...form.register("email")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                      placeholder="correo@empresa.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-slate-600">Correo personal</label>
                    <input
                      type="email"
                      {...form.register("personalEmail")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                      placeholder="personal@email.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Teléfono móvil</label>
                    <input
                      {...form.register("phone")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                      placeholder="+502..."
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Teléfono casa</label>
                    <input
                      {...form.register("homePhone", { required: true })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                      placeholder="Casa..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-slate-600">Contacto emergencia</label>
                    <input
                      {...form.register("emergencyContactName", { required: true })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                      placeholder="Nombre"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Teléfono emergencia</label>
                    <input
                      {...form.register("emergencyContactPhone", { required: true })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                      placeholder="+502..."
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Fecha nacimiento</label>
                    <input
                      type="date"
                      {...form.register("birthDate")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm text-slate-600">Dirección</label>
                    <input
                      {...form.register("address", { required: true })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                      placeholder="Dirección completa"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Foto / selfie</label>
                    <input
                      {...form.register("photoUrl")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                      placeholder="/uploads/..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-slate-600">Foto DPI</label>
                    <input
                      {...form.register("dpiPhotoUrl", { required: true })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                      placeholder="/uploads/..."
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">RTU actualizado</label>
                    <input
                      {...form.register("rtuFileUrl", { required: true })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                      placeholder="/uploads/..."
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Comprobante vivienda (agua/luz)</label>
                    <input
                      {...form.register("residenceProofUrl", { required: true })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                      placeholder="/uploads/..."
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-slate-600">Razón social</label>
                    <select
                      {...form.register("legalEntityId", { required: true })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    >
                      {(legalEntitiesQuery.data || []).map((entity) => (
                        <option key={entity.id} value={entity.id}>
                          {entity.comercialName || entity.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Tipo de contratación</label>
                    <select
                      {...form.register("employmentType", { required: true })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    >
                      {HR_EMPLOYMENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {employmentLabels[type]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Fecha de inicio</label>
                    <input
                      type="date"
                      {...form.register("startDate", { required: true })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-slate-600">Sucursal primaria</label>
                    <select
                      {...form.register("branchId", { required: true })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    >
                      {(branchesQuery.data || []).map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Puesto</label>
                    <select
                      {...form.register("positionId", { required: true })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    >
                      {(positionsQuery.data || []).map((pos) => (
                        <option key={pos.id} value={pos.id}>
                          {pos.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Departamento (opcional)</label>
                    <select
                      {...form.register("departmentId")}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    >
                      <option value="">Sin asignar</option>
                      {(departmentsQuery.data || []).map((dep) => (
                        <option key={dep.id} value={dep.id}>
                          {dep.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-slate-600">Salario base</label>
                    <input
                      type="number"
                      {...form.register("compensationAmount")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Frecuencia pago</label>
                    <select
                      {...form.register("compensationFrequency")}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    >
                      {PAY_FREQUENCIES.map((freq) => (
                        <option key={freq} value={freq}>
                          {freq === "MONTHLY" ? "Mensual" : freq === "BIWEEKLY" ? "Quincenal" : "Semanal"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Fecha fin (opcional)</label>
                    <input
                      type="date"
                      {...form.register("endDate")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-slate-600">Tipo documento</label>
                    <select
                      {...form.register("documentType")}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    >
                      {HR_EMPLOYEE_DOCUMENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-slate-600">Título documento</label>
                    <input
                      {...form.register("documentTitle")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                      placeholder="Ej. Contrato indefinido"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm text-slate-600">Archivo / URL</label>
                    <input
                      {...form.register("documentFileUrl")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                      placeholder="/uploads/..."
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Vence</label>
                    <input
                      type="date"
                      {...form.register("documentExpiresAt")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-slate-600">Emitido</label>
                    <input
                      type="date"
                      {...form.register("documentIssuedAt")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Entregado</label>
                    <input
                      type="date"
                      {...form.register("documentDeliveredAt")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Notas</label>
                    <input
                      {...form.register("documentNotes")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                      placeholder="Observaciones"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={addDocument}
                    className="inline-flex items-center gap-2 rounded-xl border border-dashed border-brand-primary px-4 py-2 text-sm font-semibold text-brand-primary hover:-translate-y-px transition"
                  >
                    + Agregar documento
                  </button>
                  <p className="text-xs text-slate-500">Sincronizado con retención de 5 años y alertas de vencimiento.</p>
                </div>

                {documents.length > 0 && (
                  <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                    {documents.map((doc, idx) => (
                      <div key={`${doc.title}-${idx}`} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-semibold text-slate-900">{doc.title}</p>
                          <p className="text-xs text-slate-500">
                            {doc.type} • {doc.version.issuedAt || "Sin fecha"} {doc.version.expiresAt ? `• Vence ${doc.version.expiresAt}` : ""}
                          </p>
                        </div>
                        <button onClick={() => removeDocument(idx)} className="text-xs text-rose-600 hover:underline">
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 space-y-3">
                  <p className="text-sm font-semibold text-slate-800">Colegiado profesional</p>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" {...form.register("licenseApplies")} id="licenseApplies" className="h-4 w-4" />
                    <label htmlFor="licenseApplies" className="text-sm text-slate-700">
                      Aplica colegiado
                    </label>
                  </div>
                  {form.watch("licenseApplies") && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm text-slate-600">Número</label>
                        <input
                          {...form.register("licenseNumber")}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-slate-600">Emitido</label>
                        <input
                          type="date"
                          {...form.register("licenseIssuedAt")}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-slate-600">Vence</label>
                        <input
                          type="date"
                          {...form.register("licenseExpiresAt")}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-slate-600">Archivo</label>
                        <input
                          {...form.register("licenseFileUrl")}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                          placeholder="/uploads/..."
                        />
                      </div>
                      <div>
                        <label className="text-sm text-slate-600">Recordar antes (días)</label>
                        <input
                          type="number"
                          {...form.register("licenseReminderDays")}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                          placeholder="30"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <div className="flex items-center gap-3">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((prev) => Math.max(prev - 1, 0))}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:-translate-y-px transition"
                >
                  ← Anterior
                </button>
              )}
              {step < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((prev) => Math.min(prev + 1, steps.length - 1))}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft hover:-translate-y-px transition disabled:opacity-60"
                  disabled={loadingCatalogs}
                >
                  Siguiente →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={form.formState.isSubmitting || loadingCatalogs}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft hover:-translate-y-px transition disabled:opacity-60"
                >
                  {form.formState.isSubmitting ? "Guardando..." : loadingCatalogs ? "Cargando catálogos..." : "Crear empleado"}
                </button>
              )}
              <p className="text-xs text-slate-500">Se generará un código automático si dejas el campo vacío.</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
