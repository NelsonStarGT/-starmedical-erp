import "server-only";

import { VisitStatus } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { normalizeRoleName } from "@/lib/rbac";
import {
  CAPABILITIES_BY_ROLE,
  CAPABILITY_LABELS,
  RECEPTION_ROLE_LABELS,
  type ReceptionCapability,
  type ReceptionRole,
  hasCapability
} from "@/lib/reception/permissions";

const OPERATOR_ROLES = new Set(["RECEPTION", "RECEPTION_OPERATOR", "SECRETARY", "NURSE"]);

const ROLE_RANK: Record<ReceptionRole, number> = {
  RECEPTION_OPERATOR: 1,
  RECEPTION_SUPERVISOR: 2,
  RECEPTION_ADMIN: 3
};

export function resolveReceptionRole(roles: string[] = []): ReceptionRole | null {
  const normalized = roles.map(normalizeRoleName);
  if (normalized.includes("SUPER_ADMIN") || normalized.includes("ADMIN") || normalized.includes("RECEPTION_ADMIN")) {
    return "RECEPTION_ADMIN";
  }
  if (normalized.includes("SUPERVISOR") || normalized.includes("RECEPTION_SUPERVISOR")) {
    return "RECEPTION_SUPERVISOR";
  }
  if (normalized.some((role) => OPERATOR_ROLES.has(role))) return "RECEPTION_OPERATOR";
  return null;
}

export function getReceptionCapabilities(role: ReceptionRole): ReceptionCapability[] {
  return CAPABILITIES_BY_ROLE[role] ?? [];
}

export function assertReceptionAccess(user: SessionUser | null): ReceptionRole {
  const role = resolveReceptionRole(user?.roles ?? []);
  if (!role) {
    throw new Error("No autorizado para operar en Recepción.");
  }
  return role;
}

export function assertCapability(user: SessionUser | null, capability: ReceptionCapability): ReceptionRole {
  const role = assertReceptionAccess(user);
  if (!hasCapability(role, capability)) {
    throw new Error(`No autorizado para ${CAPABILITY_LABELS[capability]}.`);
  }
  return role;
}

export function assertCapabilities(user: SessionUser | null, capabilities: ReceptionCapability[]): ReceptionRole {
  const role = assertReceptionAccess(user);
  for (const capability of capabilities) {
    if (!hasCapability(role, capability)) {
      throw new Error(`No autorizado para ${CAPABILITY_LABELS[capability]}.`);
    }
  }
  return role;
}

export function assertRoleAtLeast(user: SessionUser | null, minimum: ReceptionRole, actionLabel?: string) {
  const role = assertReceptionAccess(user);
  if (ROLE_RANK[role] < ROLE_RANK[minimum]) {
    const label = actionLabel ?? `acciones de ${RECEPTION_ROLE_LABELS[minimum]}`;
    throw new Error(`No autorizado para ${label}.`);
  }
}

export function buildReceptionContext(user: SessionUser | null) {
  const role = assertReceptionAccess(user);
  return {
    receptionRole: role,
    capabilities: getReceptionCapabilities(role),
    branchId: user?.branchId ?? null
  };
}

export type VisitTransitionContext = {
  toStatus: VisitStatus;
  currentStatus: VisitStatus;
  hasOpenServiceRequests?: boolean;
  hasActiveQueueItems?: boolean;
};

export function assertVisitTransitionPermission(user: SessionUser | null, ctx: VisitTransitionContext) {
  if (ctx.toStatus === VisitStatus.CANCELLED) {
    assertCapability(user, "VISIT_CANCEL");
    return;
  }

  if (ctx.toStatus === VisitStatus.NO_SHOW) {
    assertCapability(user, "VISIT_NO_SHOW");
    return;
  }

  if (ctx.toStatus === VisitStatus.ON_HOLD || ctx.currentStatus === VisitStatus.ON_HOLD) {
    assertRoleAtLeast(user, "RECEPTION_SUPERVISOR", "poner en espera o reanudar visitas");
    return;
  }

  if (ctx.toStatus === VisitStatus.CHECKED_OUT) {
    if (ctx.hasOpenServiceRequests || ctx.hasActiveQueueItems || ctx.currentStatus !== VisitStatus.READY_FOR_DISCHARGE) {
      assertCapability(user, "VISIT_CHECKOUT_OVERRIDE");
    } else {
      assertCapability(user, "VISIT_TRANSITION_BASIC");
    }
    return;
  }

  assertCapability(user, "VISIT_TRANSITION_BASIC");
}
