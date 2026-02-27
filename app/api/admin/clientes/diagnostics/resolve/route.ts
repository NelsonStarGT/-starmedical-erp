import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  canViewClientsConfigDiagnostics,
  canViewGlobalClientsConfigDiagnostics,
  normalizeDiagnosticsDomain
} from "@/lib/clients/configDiagnostics";
import { resolveSystemEventDigest } from "@/lib/ops/eventLog.server";
import { tenantIdFromUser } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizeDigest(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function sanitizeResolutionNote(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return null;
  return normalized.slice(0, 500);
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  if (!canViewClientsConfigDiagnostics(auth.user)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    digest?: unknown;
    resolved?: unknown;
    resolutionNote?: unknown;
    domain?: unknown;
    tenantId?: unknown;
  } | null;
  const digest = sanitizeDigest(body?.digest);
  if (!digest) {
    return NextResponse.json({ ok: false, error: "Digest requerido." }, { status: 400 });
  }

  const resolved = Boolean(body?.resolved);
  const note = sanitizeResolutionNote(body?.resolutionNote);
  const normalizedDomain =
    typeof body?.domain === "string" && body.domain.trim()
      ? normalizeDiagnosticsDomain(body.domain)
      : null;
  if (typeof body?.domain === "string" && body.domain.trim() && !normalizedDomain) {
    return NextResponse.json({ ok: false, error: "Dominio inválido." }, { status: 400 });
  }

  const canViewGlobal = canViewGlobalClientsConfigDiagnostics(auth.user);
  const tenantId = canViewGlobal
    ? typeof body?.tenantId === "string" && body.tenantId.trim()
      ? body.tenantId.trim()
      : undefined
    : tenantIdFromUser(auth.user);

  const result = await resolveSystemEventDigest({
    digest,
    resolved,
    resolutionNote: note,
    resolvedByUserId: resolved ? auth.user?.id ?? null : null,
    tenantId,
    domain: normalizedDomain
  });

  return NextResponse.json({
    ok: true,
    data: {
      resolved,
      updatedCount: result.updatedCount,
      resolvedAt: resolved ? new Date().toISOString() : null,
      resolvedByUserId: resolved ? auth.user?.id ?? null : null,
      resolutionNote: resolved ? note : null
    }
  });
}
