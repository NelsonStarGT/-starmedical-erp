import { HrEmployeeStatus } from "@prisma/client";
import { SessionUser } from "@/lib/auth";
import { isStaffUser } from "@/lib/hr/filters";

export type TransitionAction = "suspend" | "activate" | "terminate" | "archive";

export type TransitionResult =
  | { ok: true }
  | { ok: false; status: number; error: string; code?: string };

export function validateStatusTransition(params: {
  action: TransitionAction;
  employee: { status: HrEmployeeStatus; onboardingStatus?: string | null };
  actor?: SessionUser | null;
}): TransitionResult {
  if (isStaffUser(params.actor)) {
    return { ok: false, status: 403, error: "No autorizado", code: "FORBIDDEN" };
  }
  if (params.action === "suspend") {
    if (params.employee.status === "TERMINATED" || params.employee.status === "ARCHIVED") {
      return { ok: false, status: 409, error: "Transición inválida: empleado terminado" };
    }
    if (params.employee.status === "SUSPENDED") {
      return { ok: false, status: 409, error: "Transición inválida: ya está suspendido" };
    }
    return { ok: true };
  }
  if (params.action === "activate") {
    if (params.employee.status === "TERMINATED") {
      return { ok: false, status: 409, error: "Transición inválida: empleado terminado" };
    }
    if (params.employee.status === "ACTIVE") {
      return { ok: false, status: 409, error: "Transición inválida: ya activo" };
    }
    if (params.employee.onboardingStatus !== "ACTIVE") {
      return { ok: false, status: 409, error: "Empleado no elegible (onboarding incompleto)" };
    }
    return { ok: true };
  }
  if (params.action === "terminate") {
    if (params.employee.status === "TERMINATED" || params.employee.status === "ARCHIVED") {
      return { ok: false, status: 409, error: "Transición inválida: ya terminado" };
    }
    return { ok: true };
  }
  if (params.action === "archive") {
    if (params.employee.status === "ARCHIVED") {
      return { ok: false, status: 409, error: "Transición inválida: ya archivado", code: "ALREADY_ARCHIVED" };
    }
    if (params.employee.status === "TERMINATED") {
      return { ok: false, status: 409, error: "Transición inválida: terminado", code: "TERMINATED" };
    }
    return { ok: true };
  }
  return { ok: false, status: 400, error: "Acción inválida" };
}

export function normalizeCompletionStep(step?: number | null) {
  return Math.max(step ?? 3, 3);
}
