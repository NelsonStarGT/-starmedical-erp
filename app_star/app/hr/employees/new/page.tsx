"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import UploadField from "@/components/ui/UploadField";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { usePermissions } from "@/hooks/usePermissions";
import type { HrBranch, HrEmployee, HrEmployeeDocumentType, HrPaymentScheme, EmployeeDocument } from "@/types/hr";
import { HR_EMPLOYEE_DOCUMENT_TYPES, HR_PAYMENT_SCHEMES } from "@/types/hr";
import { wizardStep1Schema, wizardStep2Schema, wizardStep3Schema, wizardStep4Schema, wizardStep5Schema } from "@/lib/hr/schemas";

const steps = [
  { id: 1, label: "Identidad" },
  { id: 2, label: "Contacto" },
  { id: 3, label: "Ubicación" },
  { id: 4, label: "Relación" },
  { id: 5, label: "Compensación" },
  { id: 6, label: "Documentos" }
];

type WizardForm = {
  employeeCode: string;
  firstName: string;
  lastName: string;
  dpi: string;
  biometricId: string;
  phoneMobile: string;
  addressHome: string;
  branchId: string;
  legalEntityId: string;
  professionalType: "INTERNAL" | "EXTERNAL";
  employmentRelation: "DEPENDENCIA" | "SIN_DEPENDENCIA";
  payScheme: HrPaymentScheme;
  baseSalary: string;
  baseAllowance: string;
};

type LegalEntity = { id: string; name: string; comercialName: string | null };

type DocumentForm = {
  type: HrEmployeeDocumentType;
  visibility: "PERSONAL" | "EMPRESA" | "RESTRINGIDO";
  issuedAt: string;
  expiresAt: string;
  notes: string;
  fileUrl: string;
  fileName: string;
  mime?: string | null;
};

type HrSettings = { currencyCode: "GTQ" | "USD" };

const emptyForm: WizardForm = {
  employeeCode: "",
  firstName: "",
  lastName: "",
  dpi: "",
  biometricId: "",
  phoneMobile: "",
  addressHome: "",
  branchId: "",
  legalEntityId: "",
  professionalType: "INTERNAL",
  employmentRelation: "DEPENDENCIA",
  payScheme: "MONTHLY",
  baseSalary: "",
  baseAllowance: ""
};

const emptyDocument: DocumentForm = {
  type: "CONTRATO",
  visibility: "PERSONAL",
  issuedAt: "",
  expiresAt: "",
  notes: "",
  fileUrl: "",
  fileName: "",
  mime: null
};

async function fetchBranches(): Promise<HrBranch[]> {
  const res = await fetch("/api/hr/branches", { cache: "no-store" });
  if (!res.ok) return [];
  const payload = await res.json();
  return payload.data || [];
}

async function fetchLegalEntities(): Promise<LegalEntity[]> {
  const res = await fetch("/api/finanzas/legal-entities", { cache: "no-store" });
  if (!res.ok) return [];
  const payload = await res.json();
  return payload.data || [];
}

async function fetchSettings(): Promise<HrSettings | null> {
  const res = await fetch("/api/hr/settings", { cache: "no-store" });
  if (!res.ok) return null;
  const payload = await res.json();
  return payload.data || null;
}

async function fetchEmployee(id: string): Promise<HrEmployee | null> {
  const res = await fetch(`/api/hr/employees/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  const payload = await res.json();
  return payload.data || null;
}

async function fetchEmployeeDocuments(id: string): Promise<EmployeeDocument[]> {
  const res = await fetch(`/api/hr/employees/${id}/documents`, { cache: "no-store" });
  if (!res.ok) return [];
  const payload = await res.json();
  return payload.data || [];
}

function formatCurrency(value?: string | null, currency: "GTQ" | "USD" = "GTQ") {
  if (!value) return currency === "USD" ? "$0.00" : "Q0.00";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return `${currency === "USD" ? "$" : "Q"}${value}`;
  return new Intl.NumberFormat("es-GT", { style: "currency", currency, minimumFractionDigits: 2 }).format(numeric);
}

function EmployeeWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toasts, showToast, dismiss } = useToast();
  const employeeId = searchParams.get("id");
  const mode = (searchParams.get("mode") || "").toLowerCase();
  const isViewMode = mode === "view";
  const isEditMode = mode === "edit" || !mode;
  const { hasPermission } = usePermissions();
  const canUploadRestricted = hasPermission("HR:DOCS:RESTRICTED");

  const [form, setForm] = useState<WizardForm>(emptyForm);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [documentForm, setDocumentForm] = useState<DocumentForm>(emptyDocument);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const hasHydrated = useRef(false);
  const draftRequested = useRef(false);

  const branchesQuery = useQuery({ queryKey: ["hr-branches"], queryFn: fetchBranches });
  const legalEntitiesQuery = useQuery({ queryKey: ["legal-entities"], queryFn: fetchLegalEntities });
  const settingsQuery = useQuery({ queryKey: ["hr-settings"], queryFn: fetchSettings, staleTime: 30_000, retry: 1 });

  const employeeQuery = useQuery({
    queryKey: ["hr-employee", employeeId],
    queryFn: () => fetchEmployee(employeeId as string),
    enabled: Boolean(employeeId)
  });

  const documentsQuery = useQuery({
    queryKey: ["hr-employee-documents", employeeId],
    queryFn: () => fetchEmployeeDocuments(employeeId as string),
    enabled: Boolean(employeeId)
  });

  const createDraftMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/hr/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "DRAFT" })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "No se pudo crear borrador");
      }
      return res.json();
    },
    onSuccess: (payload) => {
      const nextId = payload?.data?.id as string | undefined;
      const code = payload?.data?.employeeCode as string | undefined;
      if (nextId) {
        if (typeof window !== "undefined") {
          localStorage.setItem("hrEmployeeDraftId", nextId);
        }
        setForm((prev) => ({ ...prev, employeeCode: code || prev.employeeCode }));
        router.replace(`/hr/employees/new?id=${nextId}`);
      }
    },
    onError: (err: any) => {
      showToast(err?.message || "Error creando borrador", "error");
    }
  });

  useEffect(() => {
    if (!canUploadRestricted && documentForm.visibility === "RESTRINGIDO") {
      setDocumentForm((f) => ({ ...f, visibility: "PERSONAL" }));
    }
  }, [canUploadRestricted, documentForm.visibility]);

  const updateEmployeeMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!employeeId) throw new Error("Sin colaborador");
      const res = await fetch(`/api/hr/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "No se pudo guardar");
      }
      return res.json();
    },
    onError: (err: any) => {
      showToast(err?.message || "Error al guardar", "error");
    }
  });

  const updateCompensationMutation = useMutation({
    mutationFn: async (payload: { baseSalary?: number; baseAllowance?: number; payScheme?: string }) => {
      if (!employeeId) throw new Error("Sin colaborador");
      const res = await fetch(`/api/hr/employees/${employeeId}/compensation/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "No se pudo actualizar compensación");
      }
      return res.json();
    },
    onError: (err: any) => {
      showToast(err?.message || "Error actualizando compensación", "error");
    }
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async (payload: DocumentForm) => {
      if (!employeeId) throw new Error("Sin colaborador");
      const res = await fetch(`/api/hr/employees/${employeeId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: payload.type,
          title: payload.type,
          visibility: payload.visibility,
          notes: payload.notes || null,
          version: {
            fileUrl: payload.fileUrl,
            issuedAt: payload.issuedAt || null,
            expiresAt: payload.expiresAt || null,
            notes: payload.notes || null
          }
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "No se pudo adjuntar documento");
      }
      return res.json();
    },
    onSuccess: () => {
      showToast("Documento guardado", "success");
      setDocumentForm(emptyDocument);
      void documentsQuery.refetch();
    },
    onError: (err: any) => {
      showToast(err?.message || "Error al guardar documento", "error");
    }
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!employeeId) throw new Error("Sin colaborador");
      const res = await fetch(`/api/hr/employees/${employeeId}/complete`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "No se pudo completar el alta");
      }
      return res.json();
    },
    onSuccess: () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("hrEmployeeDraftId");
      }
      showToast("Alta completada", "success");
      router.push("/hr/employees");
    },
    onError: (err: any) => {
      showToast(err?.message || "Error al completar alta", "error");
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!employeeId) {
      const stored = localStorage.getItem("hrEmployeeDraftId");
      if (stored) setResumeId(stored);
    }
  }, [employeeId]);

  useEffect(() => {
    if (employeeId || resumeId || draftRequested.current) return;
    draftRequested.current = true;
    createDraftMutation.mutate();
  }, [employeeId, resumeId, createDraftMutation]);

  useEffect(() => {
    const employee = employeeQuery.data;
    if (!employee || hasHydrated.current) return;
    hasHydrated.current = true;
    const engagementRelation = employee.primaryEngagement?.employmentType === "HONORARIOS" ? "SIN_DEPENDENCIA" : "DEPENDENCIA";
    setForm((prev) => ({
      ...prev,
      employeeCode: employee.employeeCode || prev.employeeCode,
      firstName: employee.firstName || "",
      lastName: employee.lastName || "",
      dpi: employee.dpi || "",
      biometricId: employee.biometricId || "",
      phoneMobile: employee.phoneMobile || "",
      addressHome: employee.addressHome || "",
      branchId: employee.primaryBranch?.id || "",
      legalEntityId: employee.primaryEngagement?.legalEntity?.id || "",
      professionalType: employee.isExternal ? "EXTERNAL" : "INTERNAL",
      employmentRelation: engagementRelation,
      payScheme: (employee.primaryEngagement?.paymentScheme as HrPaymentScheme) || "MONTHLY",
      baseSalary: employee.primaryEngagement?.baseSalary || "",
      baseAllowance: employee.primaryEngagement?.baseAllowance || ""
    }));
    setCurrentStep(employee.onboardingStep || 1);
  }, [employeeQuery.data]);

  const selectedBranch = useMemo(
    () => (branchesQuery.data || []).find((branch) => branch.id === form.branchId) || null,
    [branchesQuery.data, form.branchId]
  );

  const currencyCode = settingsQuery.data?.currencyCode || "GTQ";

  const handleResume = () => {
    if (!resumeId) return;
    router.push(`/hr/employees/new?id=${resumeId}`);
  };

  const handleCreateNew = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("hrEmployeeDraftId");
    }
    setResumeId(null);
    draftRequested.current = false;
    createDraftMutation.mutate();
  };

  const mapErrors = (issues: Record<string, string[] | undefined>) => {
    const next: Record<string, string> = {};
    Object.entries(issues).forEach(([key, value]) => {
      if (value && value.length > 0) next[key] = value[0];
    });
    return next;
  };

  const advanceStep = (next: number) => {
    setErrors({});
    setCurrentStep(next);
  };

  const handleNext = async () => {
    if (isViewMode) return;
    if (!employeeId) return;

    if (currentStep === 1) {
      const result = wizardStep1Schema.safeParse({
        firstName: form.firstName,
        lastName: form.lastName,
        dpi: form.dpi || null,
        biometricId: form.biometricId || null
      });
      if (!result.success) {
        setErrors(mapErrors(result.error.flatten().fieldErrors));
        return;
      }
      await updateEmployeeMutation.mutateAsync({
        firstName: form.firstName,
        lastName: form.lastName,
        dpi: form.dpi ? form.dpi.trim() : null,
        biometricId: form.biometricId ? form.biometricId.trim() : null,
        onboardingStatus: "DRAFT",
        onboardingStep: 2
      });
      advanceStep(2);
      return;
    }

    if (currentStep === 2) {
      const result = wizardStep2Schema.safeParse({
        phoneMobile: form.phoneMobile,
        addressHome: form.addressHome
      });
      if (!result.success) {
        setErrors(mapErrors(result.error.flatten().fieldErrors));
        return;
      }
      await updateEmployeeMutation.mutateAsync({
        phoneMobile: form.phoneMobile,
        addressHome: form.addressHome,
        onboardingStatus: "DRAFT",
        onboardingStep: 3
      });
      advanceStep(3);
      return;
    }

    if (currentStep === 3) {
      const result = wizardStep3Schema.safeParse({
        branchId: form.branchId,
        legalEntityId: form.legalEntityId || null
      });
      if (!result.success) {
        setErrors(mapErrors(result.error.flatten().fieldErrors));
        return;
      }
      if ((legalEntitiesQuery.data || []).length > 0 && !form.legalEntityId) {
        setErrors({ legalEntityId: "Selecciona una entidad" });
        return;
      }
      const branchCode = selectedBranch?.code || selectedBranch?.name || "";
      await updateEmployeeMutation.mutateAsync({
        branchAssignments: [
          {
            branchId: form.branchId,
            isPrimary: true,
            code: branchCode
          }
        ],
        onboardingStatus: "DRAFT",
        onboardingStep: 4
      });
      advanceStep(4);
      return;
    }

    if (currentStep === 4) {
      const derivedRelation = form.professionalType === "EXTERNAL" ? "SIN_DEPENDENCIA" : "DEPENDENCIA";
      const result = wizardStep4Schema.safeParse({
        professionalType: form.professionalType,
        employmentRelation: derivedRelation
      });
      if (!result.success) {
        setErrors(mapErrors(result.error.flatten().fieldErrors));
        return;
      }
      const legalEntityId = form.legalEntityId || legalEntitiesQuery.data?.[0]?.id || "";
      if (!legalEntityId) {
        setErrors({ legalEntityId: "Selecciona una entidad" });
        return;
      }
      const employmentType = derivedRelation === "DEPENDENCIA" ? "DEPENDENCIA" : "HONORARIOS";
      await updateEmployeeMutation.mutateAsync({
        isExternal: form.professionalType === "EXTERNAL",
        engagements: [
          {
            legalEntityId,
            employmentType,
            status: "ACTIVE",
            startDate: new Date().toISOString().slice(0, 10),
            isPrimary: true,
            isPayrollEligible: derivedRelation === "DEPENDENCIA",
            paymentScheme: form.payScheme || "MONTHLY"
          }
        ],
        onboardingStatus: "DRAFT",
        onboardingStep: 5
      });
      setForm((prev) => ({ ...prev, employmentRelation: derivedRelation }));
      advanceStep(5);
      return;
    }

    if (currentStep === 5) {
      const result = wizardStep5Schema.safeParse({
        payScheme: form.payScheme,
        baseSalary: form.baseSalary === "" ? undefined : Number(form.baseSalary),
        baseAllowance: form.baseAllowance === "" ? undefined : Number(form.baseAllowance)
      });
      if (!result.success) {
        setErrors(mapErrors(result.error.flatten().fieldErrors));
        return;
      }
      if (form.employmentRelation === "DEPENDENCIA" && !form.baseSalary) {
        setErrors({ baseSalary: "Salario base requerido" });
        return;
      }
      await updateCompensationMutation.mutateAsync({
        baseSalary: form.baseSalary ? Number(form.baseSalary) : undefined,
        baseAllowance: form.baseAllowance ? Number(form.baseAllowance) : undefined,
        payScheme: form.payScheme
      });
      await updateEmployeeMutation.mutateAsync({ onboardingStatus: "DRAFT", onboardingStep: 6 });
      advanceStep(6);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((step) => step - 1);
  };

  const handleSaveExit = async () => {
    if (isViewMode) return;
    if (employeeId && typeof window !== "undefined") {
      localStorage.setItem("hrEmployeeDraftId", employeeId);
    }
    showToast("Borrador guardado", "success");
    router.push("/hr/employees");
  };

  const summaryBranch = selectedBranch?.name || "—";
  const summaryLocation = selectedBranch?.address || "—";
  const summaryEntity = (legalEntitiesQuery.data || []).find((e) => e.id === form.legalEntityId);

  return (
    <div className="space-y-4">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">RRHH</p>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Expediente del colaborador</h1>
          <p className="text-xs text-slate-500">Completa la información laboral y documentos.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveExit}
            disabled={isViewMode}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Guardar y salir
          </button>
          <button
            onClick={() => router.push("/hr/employees")}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
        </div>
      </div>

      {employeeId && employeeQuery.isError && (
        <Card className="border border-rose-200 bg-rose-50">
          <CardContent className="p-4 flex items-center justify-between">
            <p className="text-sm text-rose-700">No se pudo cargar el borrador.</p>
            <button
              onClick={() => employeeQuery.refetch()}
              className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700"
            >
              Reintentar
            </button>
          </CardContent>
        </Card>
      )}

      {!employeeId && resumeId && (
        <Card className="border border-slate-200">
          <CardContent className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Tienes un borrador en curso</p>
              <p className="text-xs text-slate-500">Puedes reanudarlo o crear un nuevo colaborador.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResume}
                className="rounded-xl bg-brand-primary px-4 py-2 text-xs font-semibold text-white shadow-soft"
              >
                Reanudar
              </button>
              <button
                onClick={handleCreateNew}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Crear nuevo
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border border-slate-200">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base">Progreso</CardTitle>
            <p className="text-xs text-slate-500">Paso {currentStep} de 6</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {steps.map((step) => (
              <Badge key={step.id} variant={step.id === currentStep ? "success" : "info"}>
                {step.id}. {step.label}
              </Badge>
            ))}
          </div>
        </CardHeader>
      </Card>

      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">{steps.find((s) => s.id === currentStep)?.label}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {currentStep === 1 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-slate-600">Código</label>
                <input
                  value={form.employeeCode}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600"
                />
              </div>
              <div />
              <div className="space-y-1">
                <label className="text-slate-600">Nombres</label>
                <input
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                />
                {errors.firstName && <p className="text-xs text-rose-600">{errors.firstName}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-slate-600">Apellidos</label>
                <input
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                />
                {errors.lastName && <p className="text-xs text-rose-600">{errors.lastName}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-slate-600">DPI (si aplica / si ya lo tienes)</label>
                <input
                  value={form.dpi}
                  onChange={(e) => setForm((f) => ({ ...f, dpi: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                />
                {errors.dpi && <p className="text-xs text-rose-600">{errors.dpi}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-slate-600">ID biométrico (reloj)</label>
                <input
                  value={form.biometricId}
                  onChange={(e) => setForm((f) => ({ ...f, biometricId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  placeholder="Ej. 101"
                />
                <p className="text-[11px] text-slate-500">Solo dígitos, máximo 12. Se usa para vincular marcajes.</p>
                {errors.biometricId && <p className="text-xs text-rose-600">{errors.biometricId}</p>}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-slate-600">Teléfono</label>
                <input
                  value={form.phoneMobile}
                  onChange={(e) => setForm((f) => ({ ...f, phoneMobile: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                />
                {errors.phoneMobile && <p className="text-xs text-rose-600">{errors.phoneMobile}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-slate-600">Dirección de vivienda</label>
                <input
                  value={form.addressHome}
                  onChange={(e) => setForm((f) => ({ ...f, addressHome: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                />
                {errors.addressHome && <p className="text-xs text-rose-600">{errors.addressHome}</p>}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-slate-600">Sucursal</label>
                <select
                  value={form.branchId}
                  onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white"
                >
                  <option value="">Selecciona</option>
                  {(branchesQuery.data || []).map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                {errors.branchId && <p className="text-xs text-rose-600">{errors.branchId}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-slate-600">Ubicación laboral</label>
                <input
                  value={selectedBranch?.address || ""}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-600">Entidad / Empresa</label>
                <select
                  value={form.legalEntityId}
                  onChange={(e) => setForm((f) => ({ ...f, legalEntityId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white"
                >
                  <option value="">Selecciona</option>
                  {(legalEntitiesQuery.data || []).map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.comercialName || entity.name}
                    </option>
                  ))}
                </select>
                {errors.legalEntityId && <p className="text-xs text-rose-600">{errors.legalEntityId}</p>}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-slate-600">Tipo profesional</label>
                <select
                  value={form.professionalType}
                  onChange={(e) => {
                    const value = e.target.value as "INTERNAL" | "EXTERNAL";
                    setForm((f) => ({
                      ...f,
                      professionalType: value,
                      employmentRelation: value === "EXTERNAL" ? "SIN_DEPENDENCIA" : "DEPENDENCIA"
                    }));
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white"
                >
                  <option value="INTERNAL">Interno</option>
                  <option value="EXTERNAL">Externo</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-slate-600">Relación laboral</label>
                <input
                  value={form.employmentRelation === "DEPENDENCIA" ? "Dependencia" : "Sin dependencia"}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600"
                />
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-3">
              {form.employmentRelation !== "DEPENDENCIA" && (
                <p className="text-xs text-slate-500">Relación sin dependencia: salario base opcional.</p>
              )}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-slate-600">Esquema de pago</label>
                  <select
                    value={form.payScheme}
                    onChange={(e) => setForm((f) => ({ ...f, payScheme: e.target.value as HrPaymentScheme }))}
                    disabled={form.employmentRelation !== "DEPENDENCIA"}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    {HR_PAYMENT_SCHEMES.map((scheme) => (
                      <option key={scheme} value={scheme}>
                        {scheme}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-600">Salario base</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.baseSalary}
                    onChange={(e) => setForm((f) => ({ ...f, baseSalary: e.target.value }))}
                    disabled={form.employmentRelation !== "DEPENDENCIA"}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 disabled:bg-slate-50 disabled:text-slate-400"
                  />
                  {errors.baseSalary && <p className="text-xs text-rose-600">{errors.baseSalary}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-slate-600">Bono base fijo</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.baseAllowance}
                    onChange={(e) => setForm((f) => ({ ...f, baseAllowance: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">Moneda: {currencyCode}</p>
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-800">Resumen</p>
                <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-slate-600 md:grid-cols-2">
                  <p>Nombre: {form.firstName} {form.lastName}</p>
                  <p>Sucursal: {summaryBranch}</p>
                  <p>Ubicación: {summaryLocation}</p>
                  <p>Relación: {form.employmentRelation}</p>
                  <p>Compensación: {formatCurrency(form.baseSalary || "0", currencyCode)}</p>
                  <p>Bono base: {formatCurrency(form.baseAllowance || "0", currencyCode)}</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Documentos</p>
                    <p className="text-xs text-slate-500">Sube contrato, DPI u otros.</p>
                  </div>
                  <button
                    onClick={() => uploadDocumentMutation.mutate(documentForm)}
                    disabled={!documentForm.fileUrl || uploadDocumentMutation.isPending}
                    className="rounded-xl bg-brand-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {uploadDocumentMutation.isPending ? "Guardando..." : "Agregar"}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-slate-600">Tipo</label>
                    <select
                      value={documentForm.type}
                      onChange={(e) => setDocumentForm((f) => ({ ...f, type: e.target.value as HrEmployeeDocumentType }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white"
                    >
                      {HR_EMPLOYEE_DOCUMENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-600">Visibilidad</label>
                    <select
                      value={documentForm.visibility}
                      onChange={(e) => setDocumentForm((f) => ({ ...f, visibility: e.target.value as any }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white"
                    >
                      <option value="PERSONAL">Personal</option>
                      <option value="EMPRESA">Empresa</option>
                      <option value="RESTRINGIDO" disabled={!canUploadRestricted}>
                        Restringido
                      </option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-600">Emisión</label>
                    <input
                      type="date"
                      value={documentForm.issuedAt}
                      onChange={(e) => setDocumentForm((f) => ({ ...f, issuedAt: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-600">Vencimiento</label>
                    <input
                      type="date"
                      value={documentForm.expiresAt}
                      onChange={(e) => setDocumentForm((f) => ({ ...f, expiresAt: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600">Notas</label>
                  <textarea
                    value={documentForm.notes}
                    onChange={(e) => setDocumentForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  />
                </div>

                <UploadField
                  value={documentForm.fileUrl}
                  accept="application/pdf,image/*"
                  onChange={(url, info) =>
                    setDocumentForm((f) => ({
                      ...f,
                      fileUrl: url,
                      fileName: info?.name || url.split("/").pop() || "Documento",
                      mime: info?.mime || null
                    }))
                  }
                />

                {documentsQuery.data && documentsQuery.data.length > 0 && (
                  <div className="space-y-2">
                    {documentsQuery.data.map((doc) => (
                      <div key={doc.id} className="rounded-lg border border-slate-100 px-3 py-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800">{doc.title || doc.type}</span>
                          {doc.currentVersion?.fileUrl && (
                            <a
                              href={doc.currentVersion.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-primary font-semibold"
                            >
                              Ver
                            </a>
                          )}
                        </div>
                        <p className="text-slate-500">{doc.visibility}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 1}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
        >
          Atrás
        </button>
        {currentStep < 6 && (
          <button
            onClick={handleNext}
            disabled={isViewMode || updateEmployeeMutation.isPending || updateCompensationMutation.isPending}
            className="rounded-xl bg-brand-primary px-6 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-60"
          >
            {updateEmployeeMutation.isPending || updateCompensationMutation.isPending ? "Guardando..." : "Continuar"}
          </button>
        )}
        {currentStep === 6 && (
          <button
            onClick={() => completeMutation.mutate()}
            disabled={isViewMode || completeMutation.isPending}
            className="rounded-xl bg-brand-primary px-6 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-60"
          >
            {completeMutation.isPending ? "Finalizando..." : "Finalizar alta"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function EmployeeWizardPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-600">Cargando asistente...</div>}>
      <EmployeeWizardContent />
    </Suspense>
  );
}
