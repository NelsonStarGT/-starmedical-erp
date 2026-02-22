import type { SessionUser } from "@/lib/auth";
import { hasPermission, normalizeRoleName } from "@/lib/rbac";
import type { Cita } from "@/lib/types/agenda";

type AgendaWriteMethod = "POST" | "PUT" | "PATCH" | "DELETE";

export type AgendaMutationSnapshot = {
  fecha: string;
  horaInicio: string;
  horaFin: string;
  pacienteId: string;
  medicoId: string;
  sucursalId: string;
  salaId?: string | null;
  tipoCitaId: string;
  estado?: Cita["estado"];
  estadoPago?: Cita["estadoPago"];
  empresaId?: string | null;
  notas?: string | null;
};

export type AgendaWriteDecision = {
  allowed: boolean;
  reason: string | null;
};

export type AgendaBranchDecision = {
  allowed: boolean;
  reason: string | null;
  effectiveBranchId: string | null;
};

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "RECEPTION_ADMIN"]);
const COORDINATION_ROLES = new Set(["SUPERVISOR", "COORDINATION", "COORDINATOR", "RECEPTION_SUPERVISOR"]);
const RECEPTION_ROLES = new Set(["RECEPTION", "RECEPTION_OPERATOR", "RECEPTIONIST", "SECRETARY"]);
const NURSE_ROLES = new Set(["NURSE", "NURSING", "ENFERMERIA"]);
const DOCTOR_ROLES = new Set(["DOCTOR", "MEDICO", "PHYSICIAN", "SPECIALIST"]);

const STATUS_RECEPTION = new Set<Cita["estado"]>(["Programada", "Confirmada", "Cancelada", "No se presentó"]);

const STATUS_DEFAULT: Cita["estado"] = "Programada";
const PAYMENT_DEFAULT: Cita["estadoPago"] = "Pendiente";

function normalizeAgendaRole(role: string) {
  return normalizeRoleName(role)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/-/g, "_");
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeOptionalId(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeStatus(value: unknown): Cita["estado"] {
  switch (value) {
    case "Confirmada":
    case "En sala":
    case "Atendida":
    case "No se presentó":
    case "Cancelada":
      return value;
    default:
      return STATUS_DEFAULT;
  }
}

function normalizePayment(value: unknown): Cita["estadoPago"] {
  switch (value) {
    case "Pagado":
    case "Facturado":
      return value;
    default:
      return PAYMENT_DEFAULT;
  }
}

function stringEq(left: unknown, right: unknown) {
  return String(left ?? "") === String(right ?? "");
}

function optionalEq(left: unknown, right: unknown) {
  return normalizeOptionalId(left) === normalizeOptionalId(right);
}

function resolveRoleContext(user: SessionUser | null) {
  const roles = new Set((user?.roles || []).map(normalizeAgendaRole));
  const canAdminByPermission = hasPermission(user, "USERS:ADMIN") || hasPermission(user, "SYSTEM:ADMIN");
  const isAdmin = canAdminByPermission || [...ADMIN_ROLES].some((role) => roles.has(role));
  const isCoordination = [...COORDINATION_ROLES].some((role) => roles.has(role));
  const isReception = [...RECEPTION_ROLES].some((role) => roles.has(role));
  const isNurse = [...NURSE_ROLES].some((role) => roles.has(role));
  const isDoctor = [...DOCTOR_ROLES].some((role) => roles.has(role));

  return {
    isAdmin,
    isCoordination,
    isReception,
    isNurse,
    isDoctor,
    canWriteAny: isAdmin || isCoordination || isReception || isNurse || isDoctor,
    canManageSchedule: isAdmin || isCoordination || isReception,
    canDelete: isAdmin || isCoordination
  };
}

function hasStructuralChanges(before: AgendaMutationSnapshot, after: AgendaMutationSnapshot) {
  if (!stringEq(before.fecha, after.fecha)) return true;
  if (!stringEq(before.horaInicio, after.horaInicio)) return true;
  if (!stringEq(before.horaFin, after.horaFin)) return true;
  if (!stringEq(before.pacienteId, after.pacienteId)) return true;
  if (!stringEq(before.medicoId, after.medicoId)) return true;
  if (!stringEq(before.sucursalId, after.sucursalId)) return true;
  if (!optionalEq(before.salaId, after.salaId)) return true;
  if (!stringEq(before.tipoCitaId, after.tipoCitaId)) return true;
  if (!optionalEq(before.empresaId, after.empresaId)) return true;
  return false;
}

export function canWriteAgenda(
  user: SessionUser | null,
  method: AgendaWriteMethod,
  payload?: { before?: AgendaMutationSnapshot | null; after?: AgendaMutationSnapshot | null }
): AgendaWriteDecision {
  const ctx = resolveRoleContext(user);
  if (!ctx.canWriteAny) {
    return { allowed: false, reason: "Rol sin permisos de escritura en agenda." };
  }

  if (method === "DELETE") {
    if (!ctx.canDelete) {
      return { allowed: false, reason: "Solo coordinación/admin puede eliminar citas." };
    }
    return { allowed: true, reason: null };
  }

  if (method === "POST") {
    return { allowed: true, reason: null };
  }

  const before = payload?.before;
  const after = payload?.after;
  if (!before || !after) {
    if (!ctx.canManageSchedule && !ctx.isDoctor && !ctx.isNurse) {
      return { allowed: false, reason: "Actualización no autorizada para el rol." };
    }
    return { allowed: true, reason: null };
  }

  const structuralChanged = hasStructuralChanges(before, after);
  const statusBefore = normalizeStatus(before.estado);
  const statusAfter = normalizeStatus(after.estado);
  const statusChanged = statusBefore !== statusAfter;
  const paymentChanged = normalizePayment(before.estadoPago) !== normalizePayment(after.estadoPago);
  const notesChanged = normalizeText(before.notas) !== normalizeText(after.notas);

  if (!structuralChanged && !statusChanged && !paymentChanged && !notesChanged) {
    return { allowed: true, reason: null };
  }

  if (structuralChanged && !ctx.canManageSchedule) {
    return { allowed: false, reason: "Solo recepción/coordinación/admin puede reprogramar o reasignar citas." };
  }

  if (paymentChanged && !ctx.canManageSchedule) {
    return { allowed: false, reason: "Solo recepción/coordinación/admin puede modificar estado de pago." };
  }

  if (statusChanged) {
    if (statusAfter === "En sala") {
      if (!ctx.canManageSchedule && !ctx.isNurse) {
        return { allowed: false, reason: "Solo enfermería/recepción/coordinación/admin puede marcar 'En sala'." };
      }
    } else if (statusAfter === "Atendida") {
      if (!ctx.isDoctor && !ctx.isAdmin && !ctx.isCoordination) {
        return { allowed: false, reason: "Solo médico/coordinación/admin puede marcar 'Atendida'." };
      }
    } else if (STATUS_RECEPTION.has(statusAfter)) {
      if (!ctx.canManageSchedule) {
        return { allowed: false, reason: "Solo recepción/coordinación/admin puede cambiar ese estado." };
      }
    } else {
      return { allowed: false, reason: "Estado de cita inválido." };
    }
  }

  if (notesChanged && !ctx.canManageSchedule && !ctx.isDoctor && !ctx.isNurse) {
    return { allowed: false, reason: "Solo médico/enfermería/recepción/coordinación/admin puede actualizar notas." };
  }

  return { allowed: true, reason: null };
}

export function enforceAgendaBranchScope(user: SessionUser | null, targetBranchId?: string | null): AgendaBranchDecision {
  const userBranchId = normalizeOptionalId(user?.branchId ?? null);
  const requestedBranchId = normalizeOptionalId(targetBranchId ?? null);
  const allowedBranchIds = Array.from(
    new Set(
      (user?.allowedBranchIds || [])
        .map((branchId) => normalizeOptionalId(branchId))
        .filter((branchId): branchId is string => Boolean(branchId))
    )
  );

  if (allowedBranchIds.length > 0) {
    const allowedSet = new Set(allowedBranchIds);
    const effectiveBranchId = requestedBranchId
      ? requestedBranchId
      : userBranchId && allowedSet.has(userBranchId)
        ? userBranchId
        : allowedBranchIds[0] ?? null;

    if (requestedBranchId && !allowedSet.has(requestedBranchId)) {
      return {
        allowed: false,
        reason: "No autorizado para operar sobre otra sede.",
        effectiveBranchId
      };
    }

    return {
      allowed: true,
      reason: null,
      effectiveBranchId
    };
  }

  if (!userBranchId) {
    return {
      allowed: true,
      reason: null,
      effectiveBranchId: requestedBranchId
    };
  }

  if (requestedBranchId && requestedBranchId !== userBranchId) {
    return {
      allowed: false,
      reason: "No autorizado para operar sobre otra sede.",
      effectiveBranchId: userBranchId
    };
  }

  return {
    allowed: true,
    reason: null,
    effectiveBranchId: userBranchId
  };
}

export function extractAgendaEventBranchId(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  return normalizeOptionalId(record.sucursalId) || normalizeOptionalId(record.branchId) || null;
}

export function canReadAgendaEvent(branchId: string | null, data: unknown) {
  if (!branchId) return true;
  return extractAgendaEventBranchId(data) === branchId;
}
