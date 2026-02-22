import type { OperationalArea, ServiceRequestStatus, VisitStatus, ServiceRequest } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { hasPermission, isAdmin, isSupervisor, normalizeRoleName } from "@/lib/rbac";

const LAB_ROLES = new Set(["LAB_TECH", "LAB_SUPERVISOR", "LAB_ADMIN"]);
const DIAGNOSTIC_AREAS = ["LAB", "XRAY", "ULTRASOUND", "URGENT_CARE"] as const satisfies readonly OperationalArea[];
const TERMINAL_VISIT_STATUSES = ["CANCELLED", "CHECKED_OUT", "NO_SHOW"] as const satisfies readonly VisitStatus[];
const TERMINAL_REQUEST_STATUSES = ["CANCELLED", "DONE"] as const satisfies readonly ServiceRequestStatus[];
const DIAGNOSTIC_AREA_SET = new Set<OperationalArea>(DIAGNOSTIC_AREAS);
const TERMINAL_VISIT_STATUS_SET = new Set<VisitStatus>(TERMINAL_VISIT_STATUSES);
const TERMINAL_REQUEST_STATUS_SET = new Set<ServiceRequestStatus>(TERMINAL_REQUEST_STATUSES);

function hasPermissionPrefix(user: SessionUser | null | undefined, prefix: string): boolean {
  if (!user) return false;
  return (user.permissions || []).some((perm) => perm.toUpperCase().startsWith(prefix));
}

function hasLabAccess(user: SessionUser | null | undefined): boolean {
  if (!user) return false;
  const roles = (user.roles || []).map(normalizeRoleName);
  if (roles.some((role) => LAB_ROLES.has(role))) return true;
  return hasPermissionPrefix(user, "LABTEST:");
}

function hasDiagnosticAccess(user: SessionUser | null | undefined): boolean {
  if (!user) return false;
  if (hasPermission(user, "DIAG:WRITE")) return true;
  if (hasPermission(user, "DIAG:RADIOLOGY")) return true;
  return hasPermissionPrefix(user, "DIAG:");
}

export function isDiagnosticArea(area: OperationalArea): boolean {
  return DIAGNOSTIC_AREA_SET.has(area);
}

export function canCreateRequest(visitStatus: VisitStatus, user?: SessionUser | null): void {
  if (TERMINAL_VISIT_STATUS_SET.has(visitStatus)) {
    throw new Error("La visita no está activa para crear ServiceRequest.");
  }

  if (!user) return;

  if (isAdmin(user) || isSupervisor(user)) return;

  const roles = (user.roles || []).map(normalizeRoleName);
  if (roles.includes("RECEPTION")) return;

  if (hasDiagnosticAccess(user) || hasLabAccess(user)) return;

  throw new Error("Usuario sin permisos para crear ServiceRequest.");
}

export function canAssignRequest(user?: SessionUser | null): void {
  if (!user) throw new Error("Usuario requerido para asignar ServiceRequest.");
  if (isAdmin(user) || isSupervisor(user)) return;
  if (hasLabAccess(user) || hasDiagnosticAccess(user)) return;
  throw new Error("Solo Supervisor/Admin o roles de área pueden asignar ServiceRequest.");
}

export function canStartRequest(user: SessionUser | null | undefined, request: Pick<ServiceRequest, "status" | "area">): void {
  if (!user) throw new Error("Usuario requerido para iniciar ServiceRequest.");
  if (TERMINAL_REQUEST_STATUS_SET.has(request.status)) {
    throw new Error("No se puede iniciar una solicitud cancelada o completada.");
  }

  if (isAdmin(user) || isSupervisor(user)) return;

  if (request.area === "LAB") {
    if (!hasLabAccess(user)) throw new Error("Usuario sin permisos para iniciar solicitud de LAB.");
    return;
  }

  if (!hasDiagnosticAccess(user)) {
    throw new Error("Usuario sin permisos para iniciar solicitudes diagnósticas.");
  }
}

export function canCompleteRequest(
  user: SessionUser | null | undefined,
  request: Pick<ServiceRequest, "status" | "area">
): void {
  if (!user) throw new Error("Usuario requerido para completar ServiceRequest.");

  if (TERMINAL_REQUEST_STATUS_SET.has(request.status)) {
    throw new Error("La solicitud ya está finalizada.");
  }

  if (request.status !== "IN_PROGRESS") {
    if (isAdmin(user) || isSupervisor(user)) return;
    throw new Error("No se puede completar una solicitud que no está IN_PROGRESS.");
  }

  if (isAdmin(user) || isSupervisor(user)) return;

  const roles = (user.roles || []).map(normalizeRoleName);
  if (roles.includes("RECEPTION") && isDiagnosticArea(request.area)) {
    throw new Error("Recepción no puede completar solicitudes diagnósticas.");
  }

  if (request.area === "LAB") {
    if (!hasLabAccess(user)) throw new Error("Usuario sin permisos para completar solicitud de LAB.");
    return;
  }

  if (!hasDiagnosticAccess(user)) {
    throw new Error("Usuario sin permisos para completar solicitudes diagnósticas.");
  }
}

export function canCancelRequest(
  user: SessionUser | null | undefined,
  _request?: Pick<ServiceRequest, "status" | "area">
): void {
  if (!user) throw new Error("Usuario requerido para cancelar ServiceRequest.");
  if (isAdmin(user) || isSupervisor(user)) return;
  throw new Error("Solo Supervisor/Admin puede cancelar ServiceRequest.");
}
