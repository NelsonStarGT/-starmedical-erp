"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import UploadField from "@/components/ui/UploadField";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import type { HrBranch, HrEmployee, HrEmployeeStatus } from "@/types/hr";
import { HR_EMPLOYEE_STATUSES } from "@/types/hr";

type EmployeesResponse = {
  data: HrEmployee[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
};

type WarningAttachment = { id: string; fileUrl: string; fileName: string; mime?: string | null };
type Warning = { id: string; title: string; description?: string | null; issuedAt: string; createdAt?: string; attachments: WarningAttachment[] };
type WarningsResponse = {
  data: Warning[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
    recentCount?: number;
    windowDays?: number;
    threshold?: number;
  };
};

type Compensation = {
  baseSalary: string | null;
  employmentType: string | null;
  legalEntityId: string | null;
  paymentScheme: string | null;
  baseAllowance?: string | null;
  bonuses: { id: string; name: string; amount: string; isActive: boolean; createdAt: string }[];
};

type HrSettings = { currencyCode: "GTQ" | "USD"; warningWindowDays?: number; warningThreshold?: number };

type DisciplinaryActionItem = {
  id: string;
  type: "AMONESTACION" | "SUSPENSION" | "TERMINACION_RECOMENDADA" | "TERMINACION";
  title: string;
  description?: string | null;
  comments?: string | null;
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  startDate?: string | null;
  endDate?: string | null;
  issuedAt?: string | null;
  createdAt?: string | null;
  approvedById?: string | null;
  attachments: WarningAttachment[];
};

type DisciplinaryResponse = {
  data: DisciplinaryActionItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number; hasMore: boolean };
};

type CompensationHistoryItem = {
  id: string;
  effectiveFrom: string;
  prevSalary: string | null;
  newSalary: string | null;
  prevAllowance: string | null;
  newAllowance: string | null;
  prevPayScheme: string | null;
  newPayScheme: string | null;
  comments: string | null;
};

const statusLabel: Record<HrEmployeeStatus, string> = {
  ACTIVE: "Activo",
  SUSPENDED: "Suspendido",
  TERMINATED: "Terminado"
};

const statusVariant: Record<HrEmployeeStatus, "info" | "warning" | "success"> = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  TERMINATED: "warning"
};

const disciplinaryStatusLabel: Record<DisciplinaryActionItem["status"], string> = {
  DRAFT: "Borrador",
  PENDING_APPROVAL: "En revisión",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada"
};

const disciplinaryStatusVariant: Record<DisciplinaryActionItem["status"], "info" | "warning" | "success"> = {
  DRAFT: "info",
  PENDING_APPROVAL: "warning",
  APPROVED: "success",
  REJECTED: "warning"
};

async function fetchBranches(): Promise<HrBranch[]> {
  const res = await fetch("/api/hr/branches", { cache: "no-store" });
  if (!res.ok) return [];
  const payload = await res.json();
  return payload.data || [];
}

async function fetchEmployees(filters: {
  search?: string;
  branchId?: string;
  type?: string;
  relationship?: string;
  status?: string;
  page: number;
}): Promise<EmployeesResponse> {
  const qs = new URLSearchParams();
  if (filters.search) qs.set("search", filters.search);
  if (filters.branchId) qs.set("branchId", filters.branchId);
  if (filters.type) qs.set("type", filters.type);
  if (filters.relationship) qs.set("relationship", filters.relationship);
  if (filters.status) qs.set("status", filters.status);
  qs.set("page", String(filters.page || 1));
  const res = await fetch(`/api/hr/employees?${qs.toString()}`, { cache: "no-store" });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.error || "No se pudo cargar empleados");
  }
  return (await res.json()) as EmployeesResponse;
}

async function fetchWarnings(employeeId?: string, page = 1): Promise<WarningsResponse> {
  if (!employeeId)
    return {
      data: [],
      meta: { page: 1, pageSize: 5, total: 0, totalPages: 1, hasMore: false, recentCount: 0, windowDays: 20, threshold: 3 }
    };
  const res = await fetch(`/api/hr/employees/${employeeId}/warnings?page=${page}`, { cache: "no-store" });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.error || "No se pudo cargar llamadas de atención");
  }
  const payload = await res.json();
  return {
    data: payload.data || [],
    meta: payload.meta || { page, pageSize: 5, total: payload.data?.length || 0, totalPages: 1, hasMore: false }
  };
}

async function fetchDisciplinaryActions(employeeId?: string, page = 1): Promise<DisciplinaryResponse> {
  if (!employeeId)
    return { data: [], meta: { page: 1, pageSize: 5, total: 0, totalPages: 1, hasMore: false } };
  const res = await fetch(`/api/hr/employees/${employeeId}/disciplinary-actions?page=${page}`, { cache: "no-store" });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.error || "No se pudo cargar sanciones");
  }
  return res.json();
}

async function fetchCompensation(employeeId?: string): Promise<Compensation | null> {
  if (!employeeId) return null;
  const res = await fetch(`/api/hr/employees/${employeeId}/compensation`, { cache: "no-store" });
  if (!res.ok) return null;
  const payload = await res.json();
  return payload.data || null;
}

async function fetchCompensationHistory(employeeId?: string): Promise<CompensationHistoryItem[]> {
  if (!employeeId) return [];
  const res = await fetch(`/api/hr/employees/${employeeId}/compensation/history?take=10`, { cache: "no-store" });
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

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(value?: string | null, currency: "GTQ" | "USD" = "GTQ") {
  if (!value) return "Q0.00";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return `${currency === "USD" ? "$" : "Q"}${value}`;
  return new Intl.NumberFormat("es-GT", { style: "currency", currency, minimumFractionDigits: 2 }).format(numeric);
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function initialsFromName(name?: string | null) {
  if (!name) return "??";
  const parts = name.split(" ").filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("") || "??";
}

type CreateForm = {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  branchId: string;
  workLocation: string;
  isProfessionalInternal: "INTERNAL" | "EXTERNAL";
  relationshipType: "DEPENDENCIA" | "SIN_DEPENDENCIA";
  baseSalary?: string;
  bonuses: { name: string; amount: string }[];
};

type EditForm = {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  workLocation: string;
  isProfessionalInternal: "INTERNAL" | "EXTERNAL";
  relationshipType: "DEPENDENCIA" | "SIN_DEPENDENCIA";
  baseSalary?: string;
};

type WarningFormAttachment = { id: string; fileUrl: string; fileName: string; mime?: string | null };
type WarningFormState = { title: string; issuedAt: string; notes: string; attachments: WarningFormAttachment[] };
type DisciplinaryFormState = {
  type: "AMONESTACION" | "SUSPENSION" | "TERMINACION_RECOMENDADA";
  reason: string;
  startDate: string;
  endDate: string;
  comments: string;
  attachments: WarningFormAttachment[];
};
type ActiveModal =
  | "DETAIL"
  | "EDIT"
  | "TRANSFER"
  | "WARNING"
   | "DISCIPLINARY"
  | "SUSPEND"
  | "TERMINATE"
  | "UPLOAD_DOC"
  | "COMPENSATION"
  | "POSTER"
  | null;

function emptyCreateForm(branchId?: string): CreateForm {
  return {
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    branchId: branchId || "",
    workLocation: "",
    isProfessionalInternal: "INTERNAL",
    relationshipType: "DEPENDENCIA",
    baseSalary: "",
    bonuses: []
  };
}

function emptyWarningForm(): WarningFormState {
  return {
    title: "",
    issuedAt: todayInputValue(),
    notes: "",
    attachments: []
  };
}

function emptyDisciplinaryForm(): DisciplinaryFormState {
  return {
    type: "AMONESTACION",
    reason: "",
    startDate: todayInputValue(),
    endDate: "",
    comments: "",
    attachments: []
  };
}

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const { toasts, showToast, dismiss } = useToast();
  const [filters, setFilters] = useState<{ search?: string; branchId?: string; type?: string; relationship?: string; status?: string; page: number }>({
    search: "",
    branchId: "",
    type: "",
    relationship: "",
    status: "",
    page: 1
  });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm());
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [warningForm, setWarningForm] = useState<WarningFormState>(emptyWarningForm());
  const [disciplinaryForm, setDisciplinaryForm] = useState<DisciplinaryFormState>(emptyDisciplinaryForm());
  const [transferForm, setTransferForm] = useState<{ branchId: string; workLocation: string; startDate: string; comments: string }>({
    branchId: "",
    workLocation: "",
    startDate: "",
    comments: ""
  });
  const [suspendForm, setSuspendForm] = useState<{ title: string; startDate: string; endDate: string; indefinite: boolean; notes: string }>({
    title: "",
    startDate: todayInputValue(),
    endDate: "",
    indefinite: false,
    notes: ""
  });
  const [terminateForm, setTerminateForm] = useState<{
    reason: "RENUNCIA" | "ABANDONO" | "DESPIDO";
    effectiveDate: string;
    notes: string;
    attachment: { fileUrl: string; fileName: string; mime?: string | null; size?: number | null };
  }>({
    reason: "RENUNCIA",
    effectiveDate: todayInputValue(),
    notes: "",
    attachment: { fileUrl: "", fileName: "", mime: null, size: null }
  });
  const [uploadDocForm, setUploadDocForm] = useState<{
    type: "DPI" | "RTU" | "RECIBO_SERVICIO" | "CONTRATO" | "SANCION" | "OTRO";
    visibility: "PERSONAL" | "EMPRESA" | "RESTRINGIDO";
    issuedAt: string;
    expiresAt: string;
    notes: string;
    file: { fileUrl: string; fileName: string; mime?: string | null };
  }>({
    type: "DPI",
    visibility: "PERSONAL",
    issuedAt: "",
    expiresAt: "",
    notes: "",
    file: { fileUrl: "", fileName: "", mime: null }
  });
  const [compensationForm, setCompensationForm] = useState<{
    baseSalary: string;
    baseAllowance: string;
    payScheme: string;
    comments: string;
  }>({
    baseSalary: "",
    baseAllowance: "",
    payScheme: "MONTHLY",
    comments: ""
  });
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const branchesQuery = useQuery({ queryKey: ["hr-branches"], queryFn: fetchBranches });
  const settingsQuery = useQuery({
    queryKey: ["hr-settings"],
    queryFn: fetchSettings,
    staleTime: 30_000,
    retry: 1
  });
  const employeesQuery = useQuery({
    queryKey: ["hr-employees-v1", filters],
    queryFn: () => fetchEmployees(filters),
    placeholderData: (prev) => prev
  });
  const selectedEmployee = useMemo(
    () => employeesQuery.data?.data.find((e) => e.id === selectedEmployeeId) || null,
    [employeesQuery.data, selectedEmployeeId]
  );
  const primaryBranchAssignment = useMemo(() => {
    if (!selectedEmployee) return null;
    return selectedEmployee.branchAssignments.find((b) => b.isPrimary) || selectedEmployee.branchAssignments[0] || null;
  }, [selectedEmployee]);
  const currencyCode = settingsQuery.data?.currencyCode || "GTQ";
  const createBranch = useMemo(() => {
    if (!createForm.branchId) return null;
    return (branchesQuery.data || []).find((branch) => branch.id === createForm.branchId) || null;
  }, [branchesQuery.data, createForm.branchId]);
  const transferBranch = useMemo(() => {
    if (!transferForm.branchId) return null;
    return (branchesQuery.data || []).find((branch) => branch.id === transferForm.branchId) || null;
  }, [branchesQuery.data, transferForm.branchId]);
  const createBranchAddress = createBranch?.address || "—";
  const transferBranchAddress = transferBranch?.address || "—";

  const warningsQuery = useInfiniteQuery({
    queryKey: ["hr-employee-warnings", selectedEmployeeId],
    queryFn: ({ pageParam = 1 }) => fetchWarnings(selectedEmployeeId || undefined, Number(pageParam)),
    enabled: Boolean(selectedEmployeeId),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.meta?.hasMore ? Number(lastPage.meta.page || 1) + 1 : undefined),
    retry: 1,
    staleTime: 30_000
  });
  const disciplinaryQuery = useInfiniteQuery({
    queryKey: ["hr-employee-disciplinary", selectedEmployeeId],
    queryFn: ({ pageParam = 1 }) => fetchDisciplinaryActions(selectedEmployeeId || undefined, Number(pageParam)),
    enabled: Boolean(selectedEmployeeId),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.meta?.hasMore ? Number(lastPage.meta.page || 1) + 1 : undefined),
    retry: 1,
    staleTime: 30_000
  });

  const compensationQuery = useQuery({
    queryKey: ["hr-employee-comp", selectedEmployeeId],
    queryFn: () => fetchCompensation(selectedEmployeeId || undefined),
    enabled: Boolean(selectedEmployeeId),
    retry: 1,
    staleTime: 30_000
  });
  const compensationHistoryQuery = useQuery({
    queryKey: ["hr-employee-comp-history", selectedEmployeeId],
    queryFn: () => fetchCompensationHistory(selectedEmployeeId || undefined),
    enabled: Boolean(selectedEmployeeId) && isDetailOpen,
    retry: 1,
    staleTime: 30_000
  });
  const warningPages = warningsQuery.data?.pages || [];
  const warningItems = warningPages.flatMap((page) => page.data || []);
  const warningsMeta = warningPages[0]?.meta;
  const warningThreshold = warningsMeta?.threshold ?? settingsQuery.data?.warningThreshold ?? 3;
  const warningWindowDays = warningsMeta?.windowDays ?? settingsQuery.data?.warningWindowDays ?? 20;
  const requiresDisciplinaryReview = (warningsMeta?.recentCount ?? 0) >= (warningThreshold ?? 3);
  const disciplinaryPages = disciplinaryQuery.data?.pages || [];
  const disciplinaryItems = disciplinaryPages.flatMap((page) => page.data || []);
  const disciplinaryMeta = disciplinaryPages[0]?.meta;
  const branchAddress = selectedEmployee ? primaryBranchAssignment?.branch?.address || selectedEmployee.primaryBranch?.address || "—" : "—";
  const workLocationLabel = selectedEmployee ? branchAddress || selectedEmployee.workLocation || "—" : "—";
  const documentLinks = useMemo(() => {
    if (!selectedEmployee) return [];
    const links: { label: string; url: string }[] = [];
    const dpiUrl =
      selectedEmployee.documents?.find((doc) => doc.type === "DPI" && doc.currentVersion?.fileUrl)?.currentVersion?.fileUrl ||
      selectedEmployee.dpiPhotoUrl;
    if (dpiUrl) links.push({ label: "DPI", url: dpiUrl });
    const rtuUrl =
      selectedEmployee.documents?.find((doc) => doc.type === "RTU" && doc.currentVersion?.fileUrl)?.currentVersion?.fileUrl ||
      selectedEmployee.rtuFileUrl;
    if (rtuUrl) links.push({ label: "RTU", url: rtuUrl });
    const receiptUrl =
      selectedEmployee.documents?.find((doc) => doc.type === "RECIBO_SERVICIO" && doc.currentVersion?.fileUrl)?.currentVersion?.fileUrl ||
      selectedEmployee.residenceProofUrl;
    if (receiptUrl) links.push({ label: "Comprobante", url: receiptUrl });
    return links;
  }, [selectedEmployee]);
  const relationLabel = useMemo(() => {
    const rel = selectedEmployee?.primaryEngagement?.employmentType;
    if (!rel) return "—";
    const map: Record<string, string> = {
      DEPENDENCIA: "Dependencia",
      HONORARIOS: "Honorarios",
      OUTSOURCING: "Outsourcing",
      TEMPORAL: "Temporal",
      PRACTICAS: "Prácticas"
    };
    return map[rel] || rel;
  }, [selectedEmployee]);
  const baseAllowanceValue = selectedEmployee?.primaryEngagement?.baseAllowance || compensationQuery.data?.baseAllowance || null;
  const selfieUrl = selectedEmployee?.photoUrl || selectedEmployee?.dpiPhotoUrl || null;

  useEffect(() => {
    if (activeModal === "WARNING") {
      setWarningForm(emptyWarningForm());
    }
    if (activeModal === "DISCIPLINARY") {
      setDisciplinaryForm(emptyDisciplinaryForm());
    }
  }, [activeModal, selectedEmployeeId]);

  const createMutation = useMutation({
    mutationFn: async (payload: CreateForm) => {
      const res = await fetch("/api/hr/employees/quick-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          baseSalary: payload.relationshipType === "DEPENDENCIA" ? Number(payload.baseSalary || 0) : undefined,
          bonuses: payload.bonuses
            .filter((b) => b.name && b.amount)
            .map((b) => ({ name: b.name, amount: Number(b.amount) }))
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "No se pudo crear el colaborador");
      }
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["hr-employees-v1"] });
      setShowCreate(false);
      setCreateForm(emptyCreateForm(branchesQuery.data?.[0]?.id));
    },
    onError: (err: any) => setErrorMsg(err?.message || "Error al crear")
  });

  const editMutation = useMutation({
    mutationFn: async (payload: EditForm) => {
      if (!selectedEmployeeId) throw new Error("Sin empleado");
      const res = await fetch(`/api/hr/employees/${selectedEmployeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: payload.firstName,
          lastName: payload.lastName,
          phoneMobile: payload.phone,
          addressHome: payload.address,
          isExternal: payload.isProfessionalInternal === "EXTERNAL"
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "No se pudo editar");
      }
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["hr-employees-v1"] });
      showToast("Colaborador actualizado", "success");
      setActiveModal(isDetailOpen ? "DETAIL" : null);
    },
    onError: (err: any) => setErrorMsg(err?.message || "Error al editar")
  });

  const transferMutation = useMutation({
    mutationFn: async (payload: { branchId: string; workLocation: string; startDate?: string; comments?: string }) => {
      if (!selectedEmployeeId) throw new Error("Sin empleado");
      const res = await fetch(`/api/hr/employees/${selectedEmployeeId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "No se pudo trasladar");
      }
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["hr-employees-v1"] });
      showToast("Traslado registrado", "success");
      setActiveModal(isDetailOpen ? "DETAIL" : null);
    },
    onError: (err: any) => setErrorMsg(err?.message || "Error al trasladar")
  });

  const warningMutation = useMutation({
    mutationFn: async (payload: WarningFormState) => {
      if (!selectedEmployeeId) throw new Error("Sin empleado");
      const res = await fetch(`/api/hr/employees/${selectedEmployeeId}/warnings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title.trim(),
          issuedAt: payload.issuedAt,
          description: payload.notes,
          attachments: payload.attachments
            .filter((a) => a.fileUrl)
            .map((a) => ({
              fileUrl: a.fileUrl,
              fileName: a.fileName?.trim() || a.fileUrl.split("/").pop() || "Adjunto",
              mime: a.mime
            }))
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "No se pudo registrar");
      }
      return res.json();
    },
    onSuccess: () => {
      showToast("Llamada de atención registrada", "success");
      void queryClient.invalidateQueries({ queryKey: ["hr-employee-warnings", selectedEmployeeId] });
      setWarningForm(emptyWarningForm());
      setActiveModal(isDetailOpen ? "DETAIL" : null);
    },
    onError: (err: any) => {
      const message = err?.message || "Error al registrar la llamada";
      setErrorMsg(message);
      showToast(message, "error");
    }
  });
  const disciplinaryMutation = useMutation({
    mutationFn: async (payload: DisciplinaryFormState) => {
      if (!selectedEmployeeId) throw new Error("Sin empleado");
      const res = await fetch(`/api/hr/employees/${selectedEmployeeId}/disciplinary-actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: payload.type,
          reason: payload.reason.trim(),
          startDate: payload.startDate,
          endDate: payload.endDate || undefined,
          comments: payload.comments,
          attachments: payload.attachments
            .filter((a) => a.fileUrl)
            .map((a) => ({
              fileUrl: a.fileUrl,
              fileName: a.fileName?.trim() || a.fileUrl.split("/").pop() || "Adjunto",
              mime: a.mime
            }))
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "No se pudo registrar la sanción");
      }
      return res.json();
    },
    onSuccess: () => {
      showToast("Sanción registrada", "success");
      void queryClient.invalidateQueries({ queryKey: ["hr-employee-disciplinary", selectedEmployeeId] });
      setDisciplinaryForm(emptyDisciplinaryForm());
      setActiveModal(isDetailOpen ? "DETAIL" : null);
    },
    onError: (err: any) => {
      const message = err?.message || "Error al registrar la sanción";
      setErrorMsg(message);
      showToast(message, "error");
    }
  });
  const submitDisciplinaryMutation = useMutation({
    mutationFn: async (actionId: string) => {
      const res = await fetch(`/api/hr/disciplinary-actions/${actionId}/submit`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "No se pudo enviar a aprobación");
      }
      return res.json();
    },
    onSuccess: (_data, actionId) => {
      showToast("Enviado a aprobación", "success");
      void queryClient.invalidateQueries({ queryKey: ["hr-employee-disciplinary", selectedEmployeeId] });
    },
    onError: (err: any) => showToast(err?.message || "Error al enviar a aprobación", "error")
  });
  const approveDisciplinaryMutation = useMutation({
    mutationFn: async (actionId: string) => {
      const res = await fetch(`/api/hr/disciplinary-actions/${actionId}/approve`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "No se pudo aprobar");
      }
      return res.json();
    },
    onSuccess: () => {
      showToast("Sanción aprobada", "success");
      void queryClient.invalidateQueries({ queryKey: ["hr-employee-disciplinary", selectedEmployeeId] });
    },
    onError: (err: any) => showToast(err?.message || "Error al aprobar", "error")
  });
  const rejectDisciplinaryMutation = useMutation({
    mutationFn: async (actionId: string) => {
      const res = await fetch(`/api/hr/disciplinary-actions/${actionId}/reject`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "No se pudo rechazar");
      }
      return res.json();
    },
    onSuccess: () => {
      showToast("Sanción rechazada", "success");
      void queryClient.invalidateQueries({ queryKey: ["hr-employee-disciplinary", selectedEmployeeId] });
    },
    onError: (err: any) => showToast(err?.message || "Error al rechazar", "error")
  });

  const activateMutation = useMutation({
    mutationFn: async (employeeId?: string) => {
      const id = employeeId || selectedEmployeeId;
      if (!id) throw new Error("Sin empleado");
      const res = await fetch(`/api/hr/employees/${id}/activate`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "No se pudo activar");
      }
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["hr-employees-v1"] });
      showToast("Colaborador activado", "success");
    },
    onError: (err: any) => {
      const message = err?.message || "Error al activar";
      setErrorMsg(message);
      showToast(message, "error");
    }
  });

  const suspendMutation = useMutation({
    mutationFn: async (payload: { title: string; startDate: string; endDate?: string | null; notes?: string | null }) => {
      if (!selectedEmployeeId) throw new Error("Sin empleado");
      const res = await fetch(`/api/hr/employees/${selectedEmployeeId}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "No se pudo suspender");
      }
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["hr-employees-v1"] });
      showToast("Suspensión registrada", "success");
      setActiveModal(isDetailOpen ? "DETAIL" : null);
    },
    onError: (err: any) => {
      const message = err?.message || "Error al suspender";
      setErrorMsg(message);
      showToast(message, "error");
    }
  });

  const terminateMutation = useMutation({
    mutationFn: async (payload: {
      reason: "RENUNCIA" | "ABANDONO" | "DESPIDO";
      effectiveDate: string;
      notes?: string | null;
      attachment: { fileUrl: string; fileName: string; mime?: string | null; size?: number | null };
    }) => {
      if (!selectedEmployeeId) throw new Error("Sin empleado");
      const res = await fetch(`/api/hr/employees/${selectedEmployeeId}/terminate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "No se pudo terminar");
      }
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["hr-employees-v1"] });
      showToast("Terminación registrada", "success");
      setActiveModal(isDetailOpen ? "DETAIL" : null);
    },
    onError: (err: any) => {
      const message = err?.message || "Error al terminar";
      setErrorMsg(message);
      showToast(message, "error");
    }
  });

  const uploadDocMutation = useMutation({
    mutationFn: async (payload: {
      type: string;
      title: string;
      visibility: string;
      notes?: string | null;
      issuedAt?: string | null;
      expiresAt?: string | null;
      fileUrl: string;
      fileName: string;
      mime?: string | null;
    }) => {
      if (!selectedEmployeeId) throw new Error("Sin empleado");
      const res = await fetch(`/api/hr/employees/${selectedEmployeeId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: payload.type,
          title: payload.title,
          visibility: payload.visibility,
          notes: payload.notes,
          version: {
            fileUrl: payload.fileUrl,
            issuedAt: payload.issuedAt,
            expiresAt: payload.expiresAt,
            notes: payload.notes
          }
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "No se pudo adjuntar el documento");
      }
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["hr-employees-v1"] });
      showToast("Documento cargado", "success");
      setActiveModal(isDetailOpen ? "DETAIL" : null);
    },
    onError: (err: any) => {
      const message = err?.message || "Error al subir documento";
      setErrorMsg(message);
      showToast(message, "error");
    }
  });

  const compensationUpdateMutation = useMutation({
    mutationFn: async (payload: { baseSalary?: number; baseAllowance?: number; payScheme?: string; comments?: string }) => {
      if (!selectedEmployeeId) throw new Error("Sin empleado");
      const res = await fetch(`/api/hr/employees/${selectedEmployeeId}/compensation/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "No se pudo actualizar la compensación");
      }
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["hr-employees-v1"] });
      void queryClient.invalidateQueries({ queryKey: ["hr-employee-comp", selectedEmployeeId] });
      void queryClient.invalidateQueries({ queryKey: ["hr-employee-comp-history", selectedEmployeeId] });
      showToast("Compensación actualizada", "success");
      setActiveModal(isDetailOpen ? "DETAIL" : null);
    },
    onError: (err: any) => {
      const message = err?.message || "Error al actualizar compensación";
      setErrorMsg(message);
      showToast(message, "error");
    }
  });

  const applyFilters = (partial: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...partial, page: 1 }));
  };

  const openDetail = (id: string, modal: ActiveModal = "DETAIL") => {
    setSelectedEmployeeId(id);
    setIsDetailOpen(true);
    setActiveModal(modal);
    setActionMenu(null);
  };

  const openSubModal = (modal: Exclude<ActiveModal, null>) => {
    if (!selectedEmployeeId) return;
    setIsDetailOpen(true);
    setActiveModal(modal);
    setActionMenu(null);
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setActiveModal(null);
    setSelectedEmployeeId(null);
    setActionMenu(null);
  };

  const closeSubModal = () => {
    if (isDetailOpen) {
      setActiveModal("DETAIL");
    } else {
      setActiveModal(null);
    }
  };

  return (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">RRHH</p>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Empleados</h1>
          </div>
          <button
            onClick={() => {
              setShowCreate(true);
              setCreateForm(emptyCreateForm(branchesQuery.data?.[0]?.id));
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft hover:-translate-y-px transition"
          >
            + Nuevo colaborador
          </button>
        </div>

        <Card className="border border-slate-200 w-full">
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 text-sm space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
              <div className="md:col-span-3 space-y-1">
                <label className="text-xs font-semibold text-slate-600">Búsqueda</label>
                <input
                  value={filters.search}
                  onChange={(e) => applyFilters({ search: e.target.value })}
                  placeholder="Nombre, código, DPI..."
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                />
              </div>
              <div className="md:col-span-1 space-y-1">
                <label className="text-xs font-semibold text-slate-600">Estado</label>
                <select
                  value={filters.status}
                  onChange={(e) => applyFilters({ status: e.target.value })}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                >
                  <option value="">Todos</option>
                  {HR_EMPLOYEE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {statusLabel[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-600">Sucursal</label>
                <select
                  value={filters.branchId}
                  onChange={(e) => applyFilters({ branchId: e.target.value })}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                >
                  <option value="">Todas</option>
                  {(branchesQuery.data || []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-6">
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-600">Tipo</label>
                <select
                  value={filters.type}
                  onChange={(e) => applyFilters({ type: e.target.value })}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                >
                  <option value="">Todos</option>
                  <option value="INTERNAL">Interno</option>
                  <option value="EXTERNAL">Externo</option>
                </select>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-600">Relación</label>
                <select
                  value={filters.relationship}
                  onChange={(e) => applyFilters({ relationship: e.target.value })}
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                >
                  <option value="">Todas</option>
                  <option value="DEPENDENCIA">Dependencia</option>
                  <option value="SIN_DEPENDENCIA">Sin dependencia</option>
                </select>
              </div>

              <div className="md:col-span-2 flex items-end justify-start md:justify-end">
                <button
                  onClick={() =>
                    setFilters({
                      search: "",
                      branchId: "",
                      type: "",
                      relationship: "",
                      status: "",
                      page: 1
                    })
                  }
                  className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  type="button"
                >
                  Limpiar
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 w-full">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Listado</CardTitle>
            <Badge variant="info">
              {employeesQuery.isFetching ? "Actualizando..." : `${employeesQuery.data?.data.length || 0} / ${employeesQuery.data?.meta.total ?? 0}`}
            </Badge>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-4 font-medium">Empleado</th>
                  <th className="py-2 pr-4 font-medium">Código</th>
                  <th className="py-2 pr-4 font-medium">Sucursal</th>
                  <th className="py-2 pr-4 font-medium">Tipo</th>
                  <th className="py-2 pr-4 font-medium">Estado</th>
                  <th className="py-2 pr-4 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(employeesQuery.data?.data || []).map((emp) => (
                <tr
                  key={emp.id}
                  className={`cursor-pointer hover:bg-slate-50 ${selectedEmployeeId === emp.id ? "bg-brand-primary/5" : ""}`}
                  onClick={() => openDetail(emp.id, "DETAIL")}
                >
                  <td className="py-3 pr-4">
                    <p className="font-semibold text-slate-900">{emp.fullName}</p>
                    <p className="text-xs text-slate-500">
                        {emp.primaryBranch?.address || (emp.workLocation as string | undefined) || emp.primaryBranch?.name || "Sin ubicación"}{" "}
                        · {emp.phoneMobile || emp.phoneHome || "Sin teléfono"}
                    </p>
                  </td>
                    <td className="py-3 pr-4 text-slate-700">{emp.employeeCode || "—"}</td>
                    <td className="py-3 pr-4 text-slate-700">{emp.primaryBranch?.name || "—"}</td>
                    <td className="py-3 pr-4 text-slate-700">{emp.isExternal ? "Externo" : "Interno"}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={statusVariant[emp.status]}>{statusLabel[emp.status]}</Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetail(emp.id, "DETAIL");
                          }}
                          className="text-brand-primary text-xs font-semibold hover:underline"
                        >
                          Ver
                        </button>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenu((prev) => (prev === emp.id ? null : emp.id));
                              setSelectedEmployeeId(emp.id);
                            }}
                            className="h-8 w-8 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50"
                          >
                            ⋯
                          </button>
                          {actionMenu === emp.id && (
                            <div className="absolute right-0 z-10 mt-1 w-44 rounded-xl border border-slate-200 bg-white shadow-lg text-sm">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditForm({
                                    firstName: emp.firstName || "",
                                    lastName: emp.lastName || "",
                                    phone: emp.phoneMobile || "",
                                    address: emp.addressHome || "",
                                    workLocation: emp.primaryBranch?.name || "",
                                    isProfessionalInternal: emp.isExternal ? "EXTERNAL" : "INTERNAL",
                                    relationshipType:
                                      emp.primaryEngagement?.employmentType === "DEPENDENCIA" ? "DEPENDENCIA" : "SIN_DEPENDENCIA",
                                    baseSalary: emp.primaryEngagement?.baseSalary || undefined
                                  });
                                  setActionMenu(null);
                                  openDetail(emp.id, "EDIT");
                                }}
                                className="block w-full px-3 py-2 text-left hover:bg-slate-50"
                              >
                                Editar
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTransferForm({
                                    branchId: emp.primaryBranch?.id || branchesQuery.data?.[0]?.id || "",
                                    workLocation: emp.primaryBranch?.code || emp.primaryBranch?.name || "",
                                    startDate: "",
                                    comments: ""
                                  });
                                  setActionMenu(null);
                                  openDetail(emp.id, "TRANSFER");
                                }}
                                className="block w-full px-3 py-2 text-left hover:bg-slate-50"
                              >
                                Trasladar
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionMenu(null);
                                  openDetail(emp.id, "WARNING");
                                }}
                                className="block w-full px-3 py-2 text-left hover:bg-slate-50"
                              >
                                Nueva llamada
                              </button>
                              {emp.status !== "SUSPENDED" && emp.status !== "TERMINATED" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionMenu(null);
                                    setSuspendForm({
                                      title: "",
                                      startDate: todayInputValue(),
                                      endDate: "",
                                      indefinite: false,
                                      notes: ""
                                    });
                                    openDetail(emp.id, "SUSPEND");
                                  }}
                                  className="block w-full px-3 py-2 text-left hover:bg-slate-50"
                                >
                                  Suspender
                                </button>
                              )}
                              {emp.status !== "ACTIVE" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionMenu(null);
                                    setSelectedEmployeeId(emp.id);
                                    activateMutation.mutate(emp.id);
                                  }}
                                  className="block w-full px-3 py-2 text-left hover:bg-slate-50"
                                >
                                  Activar
                                </button>
                              )}
                              {emp.status !== "TERMINATED" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionMenu(null);
                                    setTerminateForm({
                                      reason: "RENUNCIA",
                                      effectiveDate: todayInputValue(),
                                      notes: "",
                                      attachment: { fileUrl: "", fileName: "", mime: null, size: null }
                                    });
                                    openDetail(emp.id, "TERMINATE");
                                  }}
                                  className="block w-full px-3 py-2 text-left text-rose-700 hover:bg-rose-50"
                                >
                                  Terminar
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {employeesQuery.isLoading && <p className="text-sm text-slate-600 py-3">Cargando...</p>}
            {employeesQuery.data?.data.length === 0 && !employeesQuery.isLoading && (
              <div className="text-sm text-slate-600 py-6 text-center space-y-2">
                <p>Aún no hay colaboradores registrados.</p>
                <button
                  onClick={() => {
                    setShowCreate(true);
                    setCreateForm(emptyCreateForm(branchesQuery.data?.[0]?.id));
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition"
                >
                  Crear colaborador
                </button>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Modal crear */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nuevo colaborador"
        subtitle="Alta rápida"
        className="max-w-3xl"
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreate(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
              Cancelar
            </button>
            <button
              onClick={() => createMutation.mutate(createForm)}
              className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft hover:-translate-y-px transition disabled:opacity-60"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <span>¿Necesitas alta completa?</span>
            <Link href="/hr/employees/new" className="font-semibold text-brand-primary hover:underline">
              Ir a wizard
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs uppercase font-semibold text-slate-500">Nombres</p>
              <input
                value={createForm.firstName}
                onChange={(e) => setCreateForm((f) => ({ ...f, firstName: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>
            <div>
              <p className="text-xs uppercase font-semibold text-slate-500">Apellidos</p>
              <input
                value={createForm.lastName}
                onChange={(e) => setCreateForm((f) => ({ ...f, lastName: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>
            <div>
              <p className="text-xs uppercase font-semibold text-slate-500">Teléfono</p>
              <input
                value={createForm.phone}
                onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>
            <div>
              <p className="text-xs uppercase font-semibold text-slate-500">Dirección de vivienda</p>
              <input
                value={createForm.address}
                onChange={(e) => setCreateForm((f) => ({ ...f, address: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs uppercase font-semibold text-slate-500">Sucursal</p>
              <select
                value={createForm.branchId}
                onChange={(e) => {
                  const nextBranch = e.target.value;
                  const branch = (branchesQuery.data || []).find((b) => b.id === nextBranch);
                  const branchCode = branch?.code || branch?.name || "";
                  setCreateForm((f) => ({ ...f, branchId: nextBranch, workLocation: branchCode }));
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              >
                <option value="">Selecciona</option>
                {(branchesQuery.data || []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs uppercase font-semibold text-slate-500">Ubicación laboral (dirección sucursal)</p>
              <input
                value={createBranchAddress}
                readOnly
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600 shadow-inner focus:outline-none"
              />
            </div>
            <div>
              <p className="text-xs uppercase font-semibold text-slate-500">Tipo profesional</p>
              <select
                value={createForm.isProfessionalInternal}
                onChange={(e) => setCreateForm((f) => ({ ...f, isProfessionalInternal: e.target.value as any }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              >
                <option value="INTERNAL">Interno</option>
                <option value="EXTERNAL">Externo</option>
              </select>
            </div>
            <div>
              <p className="text-xs uppercase font-semibold text-slate-500">Relación laboral</p>
              <select
                value={createForm.relationshipType}
                onChange={(e) => setCreateForm((f) => ({ ...f, relationshipType: e.target.value as any }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              >
                <option value="DEPENDENCIA">Dependencia</option>
                <option value="SIN_DEPENDENCIA">Sin dependencia</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {createForm.relationshipType === "DEPENDENCIA" && (
              <div>
                <p className="text-xs uppercase font-semibold text-slate-500">Salario base</p>
                <input
                  type="number"
                  min="0"
                  value={createForm.baseSalary}
                  onChange={(e) => setCreateForm((f) => ({ ...f, baseSalary: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm font-semibold text-slate-800">Bonos (opcional)</p>
          {(createForm.bonuses || []).map((b, idx) => (
            <div key={idx} className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <input
                placeholder="Nombre"
                value={b.name}
                onChange={(e) =>
                  setCreateForm((f) => {
                    const next = [...f.bonuses];
                    next[idx] = { ...next[idx], name: e.target.value };
                    return { ...f, bonuses: next };
                  })
                }
                className="rounded-xl border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
              <input
                type="number"
                min="0"
                placeholder="Monto"
                value={b.amount}
                onChange={(e) =>
                  setCreateForm((f) => {
                    const next = [...f.bonuses];
                    next[idx] = { ...next[idx], amount: e.target.value };
                    return { ...f, bonuses: next };
                  })
                }
                className="rounded-xl border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>
          ))}
          <button
            onClick={() => setCreateForm((f) => ({ ...f, bonuses: [...f.bonuses, { name: "", amount: "" }] }))}
            className="mt-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            + Agregar bono
          </button>
        </div>
      </Modal>

      {/* Modal editar */}
      <Modal
        open={activeModal === "EDIT" && Boolean(editForm)}
        onClose={closeSubModal}
        title="Editar colaborador"
        className="max-w-2xl"
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={closeSubModal} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
              Cancelar
            </button>
            <button
              onClick={() => editForm && editMutation.mutate(editForm)}
              className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft hover:-translate-y-px transition disabled:opacity-60"
              disabled={editMutation.isPending}
            >
              {editMutation.isPending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        }
      >
        {editForm && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <label className="text-slate-600">Nombres</label>
              <input
                value={editForm.firstName}
                onChange={(e) => setEditForm((f) => f && { ...f, firstName: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>
            <div>
              <label className="text-slate-600">Apellidos</label>
              <input
                value={editForm.lastName}
                onChange={(e) => setEditForm((f) => f && { ...f, lastName: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>
            <div>
              <label className="text-slate-600">Teléfono</label>
              <input
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => f && { ...f, phone: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>
            <div>
              <label className="text-slate-600">Dirección de vivienda</label>
              <input
                value={editForm.address}
                onChange={(e) => setEditForm((f) => f && { ...f, address: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Modal traslado */}
      <Modal
        open={activeModal === "TRANSFER"}
        onClose={closeSubModal}
        title="Traslado de sucursal"
        className="max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={closeSubModal} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
              Cancelar
            </button>
            <button
              onClick={() =>
                transferMutation.mutate({
                  ...transferForm,
                  startDate: transferForm.startDate || undefined,
                  comments: transferForm.comments || undefined
                })
              }
              className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft hover:-translate-y-px transition disabled:opacity-60"
              disabled={transferMutation.isPending}
            >
              {transferMutation.isPending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 text-sm">
          <div>
            <label className="text-slate-600">Sucursal</label>
            <select
              value={transferForm.branchId}
              onChange={(e) => {
                const nextBranchId = e.target.value;
                const branch = (branchesQuery.data || []).find((b) => b.id === nextBranchId);
                const nextCode = branch?.code || branch?.name || "";
                setTransferForm((f) => ({ ...f, branchId: nextBranchId, workLocation: nextCode }));
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            >
              <option value="">Selecciona</option>
              {(branchesQuery.data || []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-slate-600">Ubicación laboral (dirección sucursal)</label>
            <input
              value={transferBranchAddress}
              readOnly
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600 shadow-inner focus:outline-none"
            />
          </div>
          <div>
            <label className="text-slate-600">Fecha inicio (opcional)</label>
            <input
              type="date"
              value={transferForm.startDate}
              onChange={(e) => setTransferForm((f) => ({ ...f, startDate: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
          </div>
          <div>
            <label className="text-slate-600">Comentarios</label>
            <textarea
              value={transferForm.comments}
              onChange={(e) => setTransferForm((f) => ({ ...f, comments: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
          </div>
        </div>
      </Modal>

      {/* Modal llamada de atención */}
      <Modal
        open={activeModal === "WARNING"}
        onClose={closeSubModal}
        title="Nueva llamada de atención"
        className="max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={closeSubModal} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
              Cancelar
            </button>
            <button
              onClick={() => {
                if (!warningForm.title.trim()) {
                  showToast("Agrega un título para la llamada", "error");
                  return;
                }
                warningMutation.mutate(warningForm);
              }}
              className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft hover:-translate-y-px transition disabled:opacity-60"
              disabled={warningMutation.isPending}
            >
              {warningMutation.isPending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[2fr,1fr]">
            <div className="space-y-1">
              <label className="text-slate-600">
                Título <span className="text-rose-500">*</span>
              </label>
              <input
                value={warningForm.title}
                onChange={(e) => setWarningForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ej. Incumplimiento de horario"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-600">Fecha</label>
              <input
                type="date"
                value={warningForm.issuedAt}
                onChange={(e) => setWarningForm((f) => ({ ...f, issuedAt: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-slate-600">Comentarios</label>
            <textarea
              value={warningForm.notes}
              onChange={(e) => setWarningForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Detalle la llamada de atención o acuerdos"
              className="mt-1 w-full min-h-[180px] rounded-xl border border-slate-200 px-3 py-3 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600">Adjuntos (PDF o imagen)</p>
                <p className="text-xs text-slate-500">Sube el acta firmada u otros respaldos.</p>
              </div>
              <button
                onClick={() =>
                  setWarningForm((f) => ({
                    ...f,
                    attachments: [
                      ...f.attachments,
                      { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, fileUrl: "", fileName: "" }
                    ]
                  }))
                }
                className="text-xs font-semibold text-brand-primary hover:underline"
              >
                + Agregar adjunto
              </button>
            </div>
            {warningForm.attachments.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Sin adjuntos. Agrega actas, fotos o PDF.
              </div>
            )}
            {warningForm.attachments.map((att, idx) => (
              <div key={att.id} className="rounded-xl border border-slate-200 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={att.fileName}
                    onChange={(e) =>
                      setWarningForm((f) => ({
                        ...f,
                        attachments: f.attachments.map((item) => (item.id === att.id ? { ...item, fileName: e.target.value } : item))
                      }))
                    }
                    placeholder={`Nombre del archivo ${idx + 1}`}
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  />
                  <button
                    onClick={() =>
                      setWarningForm((f) => ({
                        ...f,
                        attachments: f.attachments.filter((item) => item.id !== att.id)
                      }))
                    }
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                  >
                    Quitar
                  </button>
                </div>
                <UploadField
                  value={att.fileUrl}
                  onChange={(url, info) =>
                    setWarningForm((f) => ({
                      ...f,
                      attachments: f.attachments.map((item) =>
                        item.id === att.id
                          ? { ...item, fileUrl: url, fileName: item.fileName || info?.name || url.split("/").pop() || "", mime: info?.mime || item.mime }
                          : item
                      )
                    }))
                  }
                  accept="application/pdf,image/*"
                  helperText="Arrastra o haz clic para subir (PDF/imagen)"
                  onUploadSuccess={() => showToast("Archivo cargado", "success")}
                  onUploadError={(message) => showToast(message, "error")}
                />
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Modal sanción disciplinaria */}
      <Modal
        open={activeModal === "DISCIPLINARY"}
        onClose={closeSubModal}
        title="Nueva sanción disciplinaria"
        className="max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={closeSubModal} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
              Cancelar
            </button>
            <button
              onClick={() => {
                if (!disciplinaryForm.reason.trim()) {
                  showToast("Agrega el motivo de la sanción", "error");
                  return;
                }
                disciplinaryMutation.mutate(disciplinaryForm);
              }}
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:-translate-y-px transition disabled:opacity-60"
              disabled={disciplinaryMutation.isPending}
            >
              {disciplinaryMutation.isPending ? "Guardando..." : "Guardar sanción"}
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.2fr,1fr]">
            <div className="space-y-1">
              <label className="text-slate-600">Tipo</label>
              <select
                value={disciplinaryForm.type}
                onChange={(e) => setDisciplinaryForm((f) => ({ ...f, type: e.target.value as DisciplinaryFormState["type"] }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              >
                <option value="AMONESTACION">Amonestación</option>
                <option value="SUSPENSION">Suspensión</option>
                <option value="TERMINACION_RECOMENDADA">Terminación recomendada</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-slate-600">
                Motivo <span className="text-rose-500">*</span>
              </label>
              <input
                value={disciplinaryForm.reason}
                onChange={(e) => setDisciplinaryForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Ej. reincidencia"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-slate-600">Fecha inicio</label>
              <input
                type="date"
                value={disciplinaryForm.startDate}
                onChange={(e) => setDisciplinaryForm((f) => ({ ...f, startDate: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-600">Fecha fin (opcional)</label>
              <input
                type="date"
                value={disciplinaryForm.endDate}
                onChange={(e) => setDisciplinaryForm((f) => ({ ...f, endDate: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-slate-600">Comentarios</label>
            <textarea
              value={disciplinaryForm.comments}
              onChange={(e) => setDisciplinaryForm((f) => ({ ...f, comments: e.target.value }))}
              placeholder="Detalle la sanción, acuerdos o contexto"
              className="mt-1 w-full min-h-[160px] rounded-xl border border-slate-200 px-3 py-3 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600">Adjuntos (opcional)</p>
                <p className="text-xs text-slate-500">Actas, respaldos o evidencias.</p>
              </div>
              <button
                onClick={() =>
                  setDisciplinaryForm((f) => ({
                    ...f,
                    attachments: [
                      ...f.attachments,
                      { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, fileUrl: "", fileName: "" }
                    ]
                  }))
                }
                className="text-xs font-semibold text-brand-primary hover:underline"
              >
                + Agregar adjunto
              </button>
            </div>
            {disciplinaryForm.attachments.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Sin adjuntos cargados.
              </div>
            )}
            {disciplinaryForm.attachments.map((att, idx) => (
              <div key={att.id} className="rounded-xl border border-slate-200 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={att.fileName}
                    onChange={(e) =>
                      setDisciplinaryForm((f) => ({
                        ...f,
                        attachments: f.attachments.map((item) => (item.id === att.id ? { ...item, fileName: e.target.value } : item))
                      }))
                    }
                    placeholder={`Nombre del archivo ${idx + 1}`}
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  />
                  <button
                    onClick={() =>
                      setDisciplinaryForm((f) => ({
                        ...f,
                        attachments: f.attachments.filter((item) => item.id !== att.id)
                      }))
                    }
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                  >
                    Quitar
                  </button>
                </div>
                <UploadField
                  value={att.fileUrl}
                  onChange={(url, info) =>
                    setDisciplinaryForm((f) => ({
                      ...f,
                      attachments: f.attachments.map((item) =>
                        item.id === att.id
                          ? {
                              ...item,
                              fileUrl: url,
                              fileName: item.fileName || info?.name || url.split("/").pop() || "",
                              mime: info?.mime || item.mime
                            }
                          : item
                      )
                    }))
                  }
                  accept="application/pdf,image/*"
                  helperText="Arrastra o haz clic para subir (PDF/imagen)"
                  onUploadSuccess={() => showToast("Archivo cargado", "success")}
                  onUploadError={(message) => showToast(message, "error")}
                />
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Modal suspensión */}
      <Modal
        open={activeModal === "SUSPEND"}
        onClose={closeSubModal}
        title="Suspender colaborador"
        className="max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={closeSubModal} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
              Cancelar
            </button>
            <button
              onClick={() => {
                if (!suspendForm.title.trim()) {
                  showToast("Agrega un motivo para la suspensión", "error");
                  return;
                }
                if (!suspendForm.startDate) {
                  showToast("Selecciona la fecha de inicio", "error");
                  return;
                }
                suspendMutation.mutate({
                  title: suspendForm.title.trim(),
                  startDate: suspendForm.startDate,
                  endDate: suspendForm.indefinite ? null : suspendForm.endDate || null,
                  notes: suspendForm.notes?.trim() || null
                });
              }}
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:-translate-y-px transition disabled:opacity-60"
              disabled={suspendMutation.isPending}
            >
              {suspendMutation.isPending ? "Guardando..." : "Confirmar suspensión"}
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="space-y-1">
            <label className="text-slate-600">
              Motivo <span className="text-rose-500">*</span>
            </label>
            <input
              value={suspendForm.title}
              onChange={(e) => setSuspendForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ej. Incumplimiento reiterado"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-slate-600">
                Fecha inicio <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={suspendForm.startDate}
                onChange={(e) => setSuspendForm((f) => ({ ...f, startDate: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-600">Fecha fin</label>
              <input
                type="date"
                value={suspendForm.endDate}
                onChange={(e) => setSuspendForm((f) => ({ ...f, endDate: e.target.value }))}
                disabled={suspendForm.indefinite}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30 disabled:bg-slate-50"
              />
            </div>
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={suspendForm.indefinite}
              onChange={(e) =>
                setSuspendForm((f) => ({ ...f, indefinite: e.target.checked, endDate: e.target.checked ? "" : f.endDate }))
              }
              className="h-4 w-4 rounded border-slate-300"
            />
            Indefinido
          </label>
          <div className="space-y-1">
            <label className="text-slate-600">Comentarios</label>
            <textarea
              value={suspendForm.notes}
              onChange={(e) => setSuspendForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
          </div>
        </div>
      </Modal>

      {/* Modal terminación */}
      <Modal
        open={activeModal === "TERMINATE"}
        onClose={closeSubModal}
        title="Terminar relación laboral"
        className="max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={closeSubModal} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
              Cancelar
            </button>
            <button
              onClick={() => {
                if (!terminateForm.effectiveDate) {
                  showToast("Selecciona la fecha efectiva", "error");
                  return;
                }
                if (!terminateForm.attachment.fileUrl) {
                  showToast("Adjunta el documento PDF", "error");
                  return;
                }
                terminateMutation.mutate({
                  reason: terminateForm.reason,
                  effectiveDate: terminateForm.effectiveDate,
                  notes: terminateForm.notes?.trim() || null,
                  attachment: terminateForm.attachment
                });
              }}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:-translate-y-px transition disabled:opacity-60"
              disabled={terminateMutation.isPending}
            >
              {terminateMutation.isPending ? "Guardando..." : "Confirmar terminación"}
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="space-y-1">
            <label className="text-slate-600">
              Motivo <span className="text-rose-500">*</span>
            </label>
            <select
              value={terminateForm.reason}
              onChange={(e) => setTerminateForm((f) => ({ ...f, reason: e.target.value as any }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            >
              <option value="RENUNCIA">Renuncia</option>
              <option value="ABANDONO">Abandono</option>
              <option value="DESPIDO">Despido</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-slate-600">
              Fecha efectiva <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={terminateForm.effectiveDate}
              onChange={(e) => setTerminateForm((f) => ({ ...f, effectiveDate: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
          </div>
          <div className="space-y-1">
            <label className="text-slate-600">Comentarios</label>
            <textarea
              value={terminateForm.notes}
              onChange={(e) => setTerminateForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
          </div>
          <div className="space-y-2">
            <p className="text-slate-600">
              Adjuntar acta (PDF) <span className="text-rose-500">*</span>
            </p>
            <input
              value={terminateForm.attachment.fileName}
              onChange={(e) => setTerminateForm((f) => ({ ...f, attachment: { ...f.attachment, fileName: e.target.value } }))}
              placeholder="Nombre del archivo"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
            <UploadField
              value={terminateForm.attachment.fileUrl}
              onChange={(url, info) =>
                setTerminateForm((f) => ({
                  ...f,
                  attachment: {
                    fileUrl: url,
                    fileName: f.attachment.fileName || info?.name || url.split("/").pop() || "Adjunto",
                    mime: info?.mime || null,
                    size: null
                  }
                }))
              }
              accept="application/pdf"
              helperText="Sube el acta firmada (PDF)"
              onUploadSuccess={() => showToast("Archivo cargado", "success")}
              onUploadError={(message) => showToast(message, "error")}
            />
          </div>
        </div>
      </Modal>

      {/* Modal subir documento */}
      <Modal
        open={activeModal === "UPLOAD_DOC"}
        onClose={closeSubModal}
        title="Subir documento"
        className="max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={closeSubModal} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
              Cancelar
            </button>
            <button
              onClick={() => {
                if (!uploadDocForm.file.fileUrl) {
                  showToast("Adjunta el archivo", "error");
                  return;
                }
                const labelMap: Record<string, string> = {
                  DPI: "DPI",
                  RTU: "RTU",
                  RECIBO_SERVICIO: "Vivienda",
                  CONTRATO: "Contrato",
                  SANCION: "Acta",
                  OTRO: "Otro"
                };
                uploadDocMutation.mutate({
                  type: uploadDocForm.type,
                  title: labelMap[uploadDocForm.type] || uploadDocForm.type,
                  visibility: uploadDocForm.visibility,
                  notes: uploadDocForm.notes?.trim() || null,
                  issuedAt: uploadDocForm.issuedAt || null,
                  expiresAt: uploadDocForm.expiresAt || null,
                  fileUrl: uploadDocForm.file.fileUrl,
                  fileName: uploadDocForm.file.fileName || uploadDocForm.file.fileUrl.split("/").pop() || "Documento",
                  mime: uploadDocForm.file.mime || null
                });
              }}
              className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft hover:-translate-y-px transition disabled:opacity-60"
              disabled={uploadDocMutation.isPending}
            >
              {uploadDocMutation.isPending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-slate-600">Tipo</label>
              <select
                value={uploadDocForm.type}
                onChange={(e) => setUploadDocForm((f) => ({ ...f, type: e.target.value as any }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              >
                <option value="DPI">DPI</option>
                <option value="RTU">RTU</option>
                <option value="RECIBO_SERVICIO">Vivienda</option>
                <option value="CONTRATO">Contrato</option>
                <option value="SANCION">Acta</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-slate-600">Visibilidad</label>
              <select
                value={uploadDocForm.visibility}
                onChange={(e) => setUploadDocForm((f) => ({ ...f, visibility: e.target.value as any }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              >
                <option value="PERSONAL">Personal</option>
                <option value="EMPRESA">Empresa</option>
                <option value="RESTRINGIDO">Restringido</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-slate-600">Fecha emisión</label>
              <input
                type="date"
                value={uploadDocForm.issuedAt}
                onChange={(e) => setUploadDocForm((f) => ({ ...f, issuedAt: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-600">Fecha vencimiento</label>
              <input
                type="date"
                value={uploadDocForm.expiresAt}
                onChange={(e) => setUploadDocForm((f) => ({ ...f, expiresAt: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-slate-600">Notas</label>
            <textarea
              value={uploadDocForm.notes}
              onChange={(e) => setUploadDocForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
          </div>
          <div className="space-y-2">
            <p className="text-slate-600">Archivo</p>
            <UploadField
              value={uploadDocForm.file.fileUrl}
              onChange={(url, info) =>
                setUploadDocForm((f) => ({
                  ...f,
                  file: {
                    fileUrl: url,
                    fileName: f.file.fileName || info?.name || url.split("/").pop() || "Documento",
                    mime: info?.mime || null
                  }
                }))
              }
              accept="application/pdf,image/*"
              helperText="Sube el documento (PDF/imagen)"
              onUploadSuccess={() => showToast("Archivo cargado", "success")}
              onUploadError={(message) => showToast(message, "error")}
            />
          </div>
        </div>
      </Modal>

      {/* Modal actualizar compensación */}
      <Modal
        open={activeModal === "COMPENSATION"}
        onClose={closeSubModal}
        title="Actualizar compensación"
        className="max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={closeSubModal} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
              Cancelar
            </button>
            <button
              onClick={() => {
                const payload: { baseSalary?: number; baseAllowance?: number; payScheme?: string; comments?: string } = {};
                if (compensationForm.baseSalary !== "") payload.baseSalary = Number(compensationForm.baseSalary || 0);
                if (compensationForm.baseAllowance !== "") payload.baseAllowance = Number(compensationForm.baseAllowance || 0);
                if (compensationForm.payScheme) payload.payScheme = compensationForm.payScheme;
                if (compensationForm.comments.trim()) payload.comments = compensationForm.comments.trim();
                compensationUpdateMutation.mutate(payload);
              }}
              className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft hover:-translate-y-px transition disabled:opacity-60"
              disabled={compensationUpdateMutation.isPending}
            >
              {compensationUpdateMutation.isPending ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-slate-600">Salario base ({currencyCode})</label>
              <input
                value={compensationForm.baseSalary}
                onChange={(e) => setCompensationForm((f) => ({ ...f, baseSalary: e.target.value }))}
                type="number"
                min="0"
                step="0.01"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-600">Bono base fijo ({currencyCode})</label>
              <input
                value={compensationForm.baseAllowance}
                onChange={(e) => setCompensationForm((f) => ({ ...f, baseAllowance: e.target.value }))}
                type="number"
                min="0"
                step="0.01"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-slate-600">Esquema de pago</label>
            <select
              value={compensationForm.payScheme}
              onChange={(e) => setCompensationForm((f) => ({ ...f, payScheme: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            >
              <option value="MONTHLY">Mensual</option>
              <option value="DAILY">Diario</option>
              <option value="PER_SERVICE">Por servicio</option>
              <option value="HOURLY">Por hora</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-slate-600">Comentarios</label>
            <textarea
              value={compensationForm.comments}
              onChange={(e) => setCompensationForm((f) => ({ ...f, comments: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
          </div>
        </div>
      </Modal>

      {/* Modal detalle */}
      <Modal
        open={isDetailOpen && activeModal === "DETAIL" && Boolean(selectedEmployee)}
        onClose={closeDetail}
        title="Detalle del colaborador"
        className="max-w-3xl"
      >
        {selectedEmployee ? (
          <div className="space-y-4 text-sm max-h-[70vh] overflow-y-auto pr-1">
            <div className="flex items-start gap-3">
              {selfieUrl ? (
                <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selfieUrl} alt={selectedEmployee.fullName} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-brand-primary/10 text-base font-bold text-brand-primary">
                  {initialsFromName(selectedEmployee.fullName)}
                </div>
              )}
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-semibold text-slate-900">{selectedEmployee.fullName}</p>
                  <Badge variant={statusVariant[selectedEmployee.status]}>{statusLabel[selectedEmployee.status]}</Badge>
                  <span className="text-xs text-slate-500">Código: {selectedEmployee.employeeCode || "—"}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <p className="text-slate-700">
                <span className="text-slate-500">Sucursal: </span>
                {selectedEmployee.primaryBranch?.name || "—"}
              </p>
              <p className="text-slate-700">
                <span className="text-slate-500">Ubicación laboral: </span>
                {workLocationLabel}
              </p>
              <p className="text-slate-700">
                <span className="text-slate-500">Dirección: </span>
                {selectedEmployee.addressHome || "—"}
              </p>
              <p className="text-slate-700">
                <span className="text-slate-500">Teléfono: </span>
                {selectedEmployee.phoneMobile || selectedEmployee.phoneHome || "—"}
              </p>
              <p className="text-slate-700">
                <span className="text-slate-500">Tipo profesional: </span>
                {selectedEmployee.isExternal ? "Externo" : "Interno"}
              </p>
              <p className="text-slate-700">
                <span className="text-slate-500">Relación: </span>
                {relationLabel}
              </p>
              <p className="text-slate-700">
                <span className="text-slate-500">Onboarding: </span>
                {selectedEmployee.onboardingStatus || "—"} · Paso {selectedEmployee.onboardingStep || 1}
              </p>
            </div>

            {requiresDisciplinaryReview && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 shadow-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="warning">Requiere revisión disciplinaria</Badge>
                  <span>
                    {warningsMeta?.recentCount ?? warningsMeta?.total ?? 0} llamadas en los últimos {warningWindowDays} días.
                  </span>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 p-3 space-y-2">
              <p className="text-sm font-semibold text-slate-800">Acciones rápidas</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    openSubModal("POSTER");
                  }}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Ver afiche
                </button>
                <button
                  onClick={() => {
                    setEditForm({
                      firstName: selectedEmployee.firstName || "",
                      lastName: selectedEmployee.lastName || "",
                      phone: selectedEmployee.phoneMobile || "",
                      address: selectedEmployee.addressHome || "",
                      workLocation: selectedEmployee.primaryBranch?.name || "",
                      isProfessionalInternal: selectedEmployee.isExternal ? "EXTERNAL" : "INTERNAL",
                      relationshipType:
                        selectedEmployee.primaryEngagement?.employmentType === "DEPENDENCIA" ? "DEPENDENCIA" : "SIN_DEPENDENCIA",
                      baseSalary: selectedEmployee.primaryEngagement?.baseSalary || undefined
                    });
                    openSubModal("EDIT");
                  }}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Editar
                </button>
                <button
                  onClick={() => {
                    setTransferForm({
                      branchId: selectedEmployee.primaryBranch?.id || branchesQuery.data?.[0]?.id || "",
                      workLocation: selectedEmployee.primaryBranch?.code || selectedEmployee.primaryBranch?.name || "",
                      startDate: "",
                      comments: ""
                    });
                    openSubModal("TRANSFER");
                  }}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Trasladar
                </button>
                <button
                  onClick={() => {
                    openSubModal("WARNING");
                  }}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                >
                  + Nueva llamada
                </button>
                <button
                  onClick={() => {
                    openSubModal("DISCIPLINARY");
                  }}
                  className="rounded-xl border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50"
                >
                  Sanciones disciplinarias
                </button>
                {selectedEmployee.status !== "SUSPENDED" && (
                  <button
                    onClick={() => {
                      setSuspendForm({
                        title: "",
                        startDate: todayInputValue(),
                        endDate: "",
                        indefinite: false,
                        notes: ""
                      });
                      openSubModal("SUSPEND");
                    }}
                    className="rounded-xl border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50"
                  >
                    Suspender
                  </button>
                )}
                {selectedEmployee.status !== "ACTIVE" && (
                  <button
                    onClick={() => {
                      setSelectedEmployeeId(selectedEmployee.id);
                      activateMutation.mutate(selectedEmployee.id);
                    }}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
                  >
                    Activar
                  </button>
                )}
                {selectedEmployee.status !== "TERMINATED" && (
                  <button
                    onClick={() => {
                      setTerminateForm({
                        reason: "RENUNCIA",
                        effectiveDate: todayInputValue(),
                        notes: "",
                        attachment: { fileUrl: "", fileName: "", mime: null, size: null }
                      });
                      openSubModal("TERMINATE");
                    }}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100"
                  >
                    Terminar
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-800">Compensación</p>
                <button
                  onClick={() => {
                    setCompensationForm({
                      baseSalary: compensationQuery.data?.baseSalary || selectedEmployee.primaryEngagement?.baseSalary || "",
                      baseAllowance: baseAllowanceValue || "",
                      payScheme: compensationQuery.data?.paymentScheme || selectedEmployee.primaryEngagement?.paymentScheme || "MONTHLY",
                      comments: ""
                    });
                    openSubModal("COMPENSATION");
                  }}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Actualizar compensación
                </button>
              </div>
              {compensationQuery.isLoading && <p className="text-sm text-slate-500">Cargando...</p>}
              {compensationQuery.isError && (
                <div className="flex items-center gap-2 text-sm text-rose-600">
                  <span>No se pudo cargar la compensación.</span>
                  <button
                    onClick={() => compensationQuery.refetch()}
                    className="text-xs font-semibold text-brand-primary hover:underline"
                  >
                    Reintentar
                  </button>
                </div>
              )}
              {compensationQuery.data && (
                <div className="space-y-2 text-sm">
                  <p>Salario base: {formatCurrency(compensationQuery.data.baseSalary || "0", currencyCode)}</p>
                  <p>Bono base fijo: {formatCurrency(baseAllowanceValue || "0", currencyCode)}</p>
                  <p>Relación: {compensationQuery.data.employmentType || relationLabel}</p>
                  <p>Esquema pago: {compensationQuery.data.paymentScheme || "—"}</p>
                  <p className="font-semibold">Bonos</p>
                  {compensationQuery.data.bonuses.length === 0 ? (
                    <p className="text-slate-500">Sin bonos activos.</p>
                  ) : (
                    <ul className="list-disc list-inside">
                      {compensationQuery.data.bonuses.map((b) => (
                        <li key={b.id}>
                          {b.name} · {formatCurrency(b.amount, currencyCode)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-600 mb-2">Historial</p>
                {compensationHistoryQuery.isLoading && <p className="text-xs text-slate-500">Cargando historial...</p>}
                {compensationHistoryQuery.isError && (
                  <div className="flex items-center gap-2 text-xs text-rose-600">
                    <span>No se pudo cargar historial.</span>
                    <button
                      onClick={() => compensationHistoryQuery.refetch()}
                      className="text-xs font-semibold text-brand-primary hover:underline"
                    >
                      Reintentar
                    </button>
                  </div>
                )}
                {!compensationHistoryQuery.isLoading && compensationHistoryQuery.data?.length === 0 && (
                  <p className="text-xs text-slate-500">Sin cambios registrados.</p>
                )}
                {compensationHistoryQuery.data && compensationHistoryQuery.data.length > 0 && (
                  <ul className="space-y-2 text-xs">
                    {compensationHistoryQuery.data.map((item) => (
                      <li key={item.id} className="rounded-lg border border-slate-100 px-2 py-2">
                        <p className="font-semibold text-slate-800">{formatDate(item.effectiveFrom)}</p>
                        <p className="text-slate-600">
                          Salario: {formatCurrency(item.prevSalary || "0", currencyCode)} → {formatCurrency(item.newSalary || "0", currencyCode)}
                        </p>
                        <p className="text-slate-600">
                          Bono base: {formatCurrency(item.prevAllowance || "0", currencyCode)} → {formatCurrency(item.newAllowance || "0", currencyCode)}
                        </p>
                        {item.comments && <p className="text-slate-500 mt-1">{item.comments}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Documentos</p>
                  <p className="text-xs text-slate-500">Visibilidad según permisos.</p>
                </div>
                <button
                  onClick={() => {
                    setUploadDocForm({
                      type: "DPI",
                      visibility: "PERSONAL",
                      issuedAt: "",
                      expiresAt: "",
                      notes: "",
                      file: { fileUrl: "", fileName: "", mime: null }
                    });
                    openSubModal("UPLOAD_DOC");
                  }}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  + Subir documento
                </button>
              </div>
              {selectedEmployee.documents && selectedEmployee.documents.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {selectedEmployee.documents.map((doc) => (
                    <li key={doc.id} className="rounded-lg border border-slate-100 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">{doc.title || doc.type}</p>
                          <p className="text-xs text-slate-500">
                            Visibilidad: {doc.visibility}{" "}
                            {doc.currentVersion?.issuedAt ? `• ${formatDate(doc.currentVersion.issuedAt as string)}` : ""}
                          </p>
                        </div>
                        {doc.currentVersion?.fileUrl && (
                          <a
                            href={doc.currentVersion.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-brand-primary hover:underline"
                          >
                            Ver
                          </a>
                        )}
                      </div>
                      {doc.notes && <p className="text-xs text-slate-600 mt-1">{doc.notes}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Sin documentos registrados.</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Sanciones disciplinarias</p>
                  <p className="text-xs text-slate-500">{disciplinaryMeta?.total ?? disciplinaryItems.length} registros</p>
                </div>
                <div className="flex items-center gap-2">
                  {requiresDisciplinaryReview && <Badge variant="warning">Revisión necesaria</Badge>}
                  <button
                    onClick={() => openSubModal("DISCIPLINARY")}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Crear sanción
                  </button>
                </div>
              </div>
              {disciplinaryQuery.isLoading && <p className="text-sm text-slate-500">Cargando...</p>}
              {disciplinaryQuery.isError && (
                <div className="flex items-center gap-2 text-sm text-rose-600">
                  <span>No se pudo cargar las sanciones.</span>
                  <button
                    onClick={() => disciplinaryQuery.refetch()}
                    className="text-xs font-semibold text-brand-primary hover:underline"
                  >
                    Reintentar
                  </button>
                </div>
              )}
              {!disciplinaryQuery.isLoading && disciplinaryItems.length === 0 && <p className="text-sm text-slate-500">Sin sanciones registradas.</p>}
              <ul className="space-y-2 text-sm">
                {disciplinaryItems.map((action) => (
                  <li key={action.id} className="rounded-lg border border-slate-100 px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">
                          {action.title} · <span className="text-slate-500">{action.type}</span>
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(action.startDate || action.issuedAt || action.createdAt || undefined)}
                          {action.endDate ? ` · Fin ${formatDate(action.endDate)}` : ""}
                        </p>
                        {action.comments && <p className="text-slate-700 line-clamp-2">{action.comments}</p>}
                      </div>
                      <Badge variant={disciplinaryStatusVariant[action.status]}>{disciplinaryStatusLabel[action.status]}</Badge>
                    </div>
                    {action.attachments && action.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {action.attachments.map((att) => (
                          <a
                            key={att.id}
                            href={att.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            📎 {att.fileName}
                          </a>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {action.status === "DRAFT" && (
                        <button
                          onClick={() => submitDisciplinaryMutation.mutate(action.id)}
                          className="rounded-lg border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-50"
                          disabled={submitDisciplinaryMutation.isPending}
                        >
                          Enviar a aprobación
                        </button>
                      )}
                      {action.status === "PENDING_APPROVAL" && (
                        <>
                          <button
                            onClick={() => approveDisciplinaryMutation.mutate(action.id)}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                            disabled={approveDisciplinaryMutation.isPending}
                          >
                            Aprobar
                          </button>
                          <button
                            onClick={() => rejectDisciplinaryMutation.mutate(action.id)}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                            disabled={rejectDisciplinaryMutation.isPending}
                          >
                            Rechazar
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between gap-2">
                {disciplinaryQuery.hasNextPage && (
                  <button
                    onClick={() => disciplinaryQuery.fetchNextPage()}
                    disabled={disciplinaryQuery.isFetchingNextPage}
                    className="text-sm font-semibold text-brand-primary hover:underline disabled:opacity-60"
                  >
                    {disciplinaryQuery.isFetchingNextPage ? "Cargando..." : "Ver más"}
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Llamadas de atención</p>
                  <p className="text-xs text-slate-500">
                    {warningsMeta?.total ?? warningItems.length} llamadas · {warningsMeta?.recentCount ?? 0} en últimos{" "}
                    {warningWindowDays} días
                  </p>
                </div>
                {requiresDisciplinaryReview && <Badge variant="warning">Requiere revisión</Badge>}
              </div>
              {warningsQuery.isLoading && <p className="text-sm text-slate-500">Cargando...</p>}
              {warningsQuery.isError && (
                <div className="flex items-center gap-2 text-sm text-rose-600">
                  <span>No se pudo cargar las llamadas.</span>
                  <button
                    onClick={() => warningsQuery.refetch()}
                    className="text-xs font-semibold text-brand-primary hover:underline"
                  >
                    Reintentar
                  </button>
                </div>
              )}
              {!warningsQuery.isLoading && warningItems.length === 0 && <p className="text-sm text-slate-500">Sin registros.</p>}
              <ul className="space-y-2 text-sm">
                {warningItems.map((w) => (
                  <li key={w.id} className="rounded-lg border border-slate-100 px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{w.title}</p>
                        <p className="text-xs text-slate-500">{formatDate(w.issuedAt)}</p>
                      </div>
                    </div>
                    {w.description ? (
                      <p className="mt-1 text-slate-700 line-clamp-2">{w.description}</p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500">Sin comentarios.</p>
                    )}
                    {w.attachments && w.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {w.attachments.map((att) => (
                          <a
                            key={att.id}
                            href={att.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            📎 {att.fileName}
                          </a>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between gap-2">
                {warningsQuery.hasNextPage && (
                  <button
                    onClick={() => warningsQuery.fetchNextPage()}
                    disabled={warningsQuery.isFetchingNextPage}
                    className="text-sm font-semibold text-brand-primary hover:underline disabled:opacity-60"
                  >
                    {warningsQuery.isFetchingNextPage ? "Cargando..." : "Ver más"}
                  </button>
                )}
                <button
                  onClick={() => openSubModal("WARNING")}
                  className="ml-auto rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                >
                  + Nueva llamada
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600">Selecciona un colaborador de la tabla para ver detalles.</p>
        )}
      </Modal>

      {/* Modal afiche */}
      <Modal
        open={activeModal === "POSTER" && Boolean(selectedEmployee)}
        onClose={closeSubModal}
        title="Afiche del colaborador"
        className="max-w-5xl"
        footer={
          selectedEmployee && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between no-print">
              <p className="text-xs text-slate-500">Formato Carta. Se imprimirá solo el afiche del colaborador.</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={closeSubModal}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => window.print()}
                  className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft hover:-translate-y-px transition"
                >
                  Imprimir
                </button>
              </div>
            </div>
          )
        }
      >
        {selectedEmployee ? (
          <div className="employee-poster-print space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-gradient-to-r from-sky-50 to-white px-4 py-3 print-card">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary text-white text-sm font-bold">
                  LOGO
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900 leading-tight">StarMedical ERP</p>
                  <p className="text-xs text-slate-500">Ficha del colaborador</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Código: {selectedEmployee.employeeCode || "—"}</span>
                <Badge variant={statusVariant[selectedEmployee.status]}>{statusLabel[selectedEmployee.status]}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 poster-grid">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print-card">
                <div className="flex items-center gap-4 pb-2">
                  {selfieUrl ? (
                    <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selfieUrl} alt={selectedEmployee.fullName} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-brand-primary/10 text-xl font-bold text-brand-primary">
                      {initialsFromName(selectedEmployee.fullName)}
                    </div>
                  )}
                  <div>
                    <p className="text-2xl font-bold text-slate-900 leading-tight">{selectedEmployee.fullName}</p>
                    <p className="text-sm text-slate-500">{selectedEmployee.isExternal ? "Externo" : "Interno"}</p>
                    <p className="text-xs text-slate-500">
                      Onboarding {selectedEmployee.onboardingStatus || "—"} · Paso {selectedEmployee.onboardingStep || 1}
                    </p>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 text-sm">
                  <div>
                    <p className="text-slate-500">Sucursal</p>
                    <p className="font-semibold text-slate-900">{selectedEmployee.primaryBranch?.name || "—"}</p>
                    <p className="text-xs text-slate-500">{branchAddress}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Ubicación laboral</p>
                    <p className="font-semibold text-slate-900">{workLocationLabel || "—"}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Contacto</p>
                    <p className="font-semibold text-slate-900">{selectedEmployee.phoneMobile || selectedEmployee.phoneHome || "—"}</p>
                    <p className="text-xs text-slate-500">{selectedEmployee.addressHome || "Dirección no registrada"}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print-card">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <p className="text-sm font-semibold text-slate-800">Clasificación</p>
                  <Badge variant="info">{selectedEmployee.isExternal ? "Externo" : "Interno"}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500">Relación laboral</p>
                    <p className="font-semibold text-slate-900">{relationLabel}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Entidad</p>
                    <p className="font-semibold text-slate-900">
                      {selectedEmployee.primaryLegalEntity?.name || selectedEmployee.primaryLegalEntity?.comercialName || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Código de sucursal</p>
                    <p className="font-semibold text-slate-900">{selectedEmployee.primaryBranch?.code || "—"}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print-card">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <p className="text-sm font-semibold text-slate-800">Compensación</p>
                  <p className="text-xs text-slate-500">
                    {compensationQuery.isLoading ? "Cargando..." : selectedEmployee.primaryEngagement?.paymentScheme || "—"}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500">Salario base</p>
                    <p className="font-semibold text-slate-900">
                      {formatCurrency(
                        compensationQuery.data?.baseSalary ||
                          selectedEmployee.primaryEngagement?.baseSalary ||
                          selectedEmployee.primaryEngagement?.compensationAmount ||
                          "0",
                        currencyCode
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Bono base fijo</p>
                    <p className="font-semibold text-slate-900">{formatCurrency(baseAllowanceValue || "0", currencyCode)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Esquema de pago</p>
                    <p className="font-semibold text-slate-900">{compensationQuery.data?.paymentScheme || "—"}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-slate-500">Bonos</p>
                  {compensationQuery.isLoading ? (
                    <p className="text-sm text-slate-500">Cargando bonos...</p>
                  ) : compensationQuery.data && compensationQuery.data.bonuses.length > 0 ? (
                    <ul
                      className={`mt-1 space-y-1 text-sm ${
                        compensationQuery.data.bonuses.length > 3 ? "print-limit-3 print-limit-info" : "print-limit-3"
                      }`}
                    >
                      {compensationQuery.data.bonuses.map((b) => (
                        <li key={b.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-2 py-1">
                          <span className="font-semibold text-slate-900">{b.name}</span>
                          <span className="text-slate-700">{formatCurrency(b.amount, currencyCode)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">Sin bonos registrados.</p>
                  )}
                </div>
              </div>

              {documentLinks.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print-card">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <p className="text-sm font-semibold text-slate-800">Documentos</p>
                    <p className="text-xs text-slate-500">Solo lectura</p>
                  </div>
                  <div
                    className={`mt-3 grid grid-cols-1 gap-2 ${
                      documentLinks.length > 3 ? "print-limit-3 print-limit-info" : "print-limit-3"
                    }`}
                  >
                    {documentLinks.map((doc) => (
                      <a
                        key={`${doc.label}-${doc.url}`}
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-brand-primary hover:bg-slate-50"
                      >
                        {doc.label}
                        <span className="text-xs text-slate-500">Ver</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600">Selecciona un colaborador para ver el afiche.</p>
        )}
      </Modal>


      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {errorMsg && (
        <div className="fixed bottom-4 right-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow">
          {errorMsg}
          <button className="ml-3 text-xs underline" onClick={() => setErrorMsg(null)}>
            Cerrar
          </button>
        </div>
      )}

      <style jsx global>{`
        @page {
          size: letter;
          margin: 12.7mm;
        }
        @media print {
          body {
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body * {
            visibility: hidden;
          }
          .employee-poster-print,
          .employee-poster-print * {
            visibility: visible;
          }
          .employee-poster-print {
            position: absolute;
            inset: 0;
            margin: 0;
            padding: 12px;
            width: 100%;
            min-height: auto;
            background: white;
            box-shadow: none;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .employee-poster-print .poster-grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 10px !important;
          }
          .employee-poster-print .print-card {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 10px;
            padding: 10px !important;
            box-shadow: none !important;
            border: 1px solid #e5e7eb;
          }
          .employee-poster-print .print-card:last-child {
            margin-bottom: 0;
          }
          .employee-poster-print * {
            font-size: 12px;
            line-height: 1.3;
          }
          .employee-poster-print h2 {
            font-size: 18px;
          }
          .employee-poster-print h3,
          .employee-poster-print .section-title {
            font-size: 14px;
          }
          .employee-poster-print .print-gap-tight {
            gap: 8px !important;
          }
          .print-hidden {
            display: none !important;
          }
          .print-limit-3 > li:nth-child(n + 4),
          .print-limit-3 > a:nth-child(n + 4) {
            display: none !important;
          }
          .print-limit-3.print-limit-info::after {
            content: "Ver detalle completo en el sistema";
            display: block;
            color: #475569;
            font-size: 11px;
            margin-top: 4px;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
