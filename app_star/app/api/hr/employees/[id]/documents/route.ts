import { NextRequest, NextResponse } from "next/server";
import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";
import { createEmployeeDocumentSchema } from "@/lib/hr/schemas";
import { hasPermission, normalizeRoleName } from "@/lib/rbac";
import { allowedDocumentVisibilities, documentOwnershipStatus, filterDocumentsForActor, getHrAccessLevel } from "@/lib/hr/access";
import { addDocumentVersion, createDocumentWithVersion } from "@/lib/hr/documents";
import { rateLimit, getClientIp } from "@/lib/api/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const resolvedParams = "then" in params ? await params : params;
  const auth = requireRole(req, [], "HR:DOCS:READ");
  if (auth.errorResponse) return auth.errorResponse;

  const roleNames = (auth.user?.roles || []).map(normalizeRoleName).filter(Boolean) as string[];
  const canSeeAll = roleNames.includes("ADMIN") || roleNames.includes("HR_ADMIN");
  const level = getHrAccessLevel(auth.user);
  const employee = await prisma.hrEmployee.findUnique({ where: { id: resolvedParams.id }, select: { userId: true } });
  if (!employee) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });

  const isSelf = Boolean(employee.userId && auth.user?.id === employee.userId);
  if ((level === "STAFF" || level === "VIEWER") && !isSelf) {
    return NextResponse.json({ error: "No autorizado", code: "FORBIDDEN" }, { status: 403 });
  }

  const docs = await prisma.employeeDocument.findMany({
    where: {
      employeeId: resolvedParams.id,
      isArchived: false,
      ...(canSeeAll
        ? {}
        : {
            visibility: { in: allowedDocumentVisibilities(level, auth.user) || ["PERSONAL"] }
          })
    },
    include: { versions: { orderBy: { versionNumber: "desc" } }, currentVersion: true },
    orderBy: { createdAt: "desc" }
  });

  const filtered = filterDocumentsForActor({ documents: docs, level, isSelf, user: auth.user });

  return NextResponse.json({
    data: filtered.map((doc) => ({
      id: doc.id,
      type: doc.type,
      visibility: doc.visibility,
      title: doc.title,
      notes: doc.notes,
      retentionUntil: doc.retentionUntil,
      isArchived: doc.isArchived,
      currentVersion: doc.currentVersion
        ? {
            id: doc.currentVersion.id,
            versionNumber: doc.currentVersion.versionNumber,
            fileUrl: doc.currentVersion.fileUrl,
            issuedAt: doc.currentVersion.issuedAt,
            deliveredAt: doc.currentVersion.deliveredAt,
            expiresAt: doc.currentVersion.expiresAt,
            canEmployeeView: doc.currentVersion.canEmployeeView,
            viewGrantedUntil: doc.currentVersion.viewGrantedUntil,
            notes: doc.currentVersion.notes,
            createdAt: doc.currentVersion.createdAt
          }
        : null,
      versions: doc.versions.map((ver) => ({
        id: ver.id,
        versionNumber: ver.versionNumber,
        fileUrl: ver.fileUrl,
        issuedAt: ver.issuedAt,
        deliveredAt: ver.deliveredAt,
        expiresAt: ver.expiresAt,
        canEmployeeView: ver.canEmployeeView,
        viewGrantedUntil: ver.viewGrantedUntil,
        notes: ver.notes,
        createdAt: ver.createdAt
      }))
    }))
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const resolvedParams = "then" in params ? await params : params;
  const auth = requireRole(req, [], "HR:DOCS:UPLOAD");
  if (auth.errorResponse) return auth.errorResponse;
  const rl = rateLimit(`${getClientIp(req)}:${req.nextUrl.pathname}`, 20, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit", retryAt: rl.retryAt }, { status: 429 });

  try {
    const body = await req.json();
    const parsed = createEmployeeDocumentSchema.parse(body);
    const employee = await prisma.hrEmployee.findUnique({ where: { id: resolvedParams.id } });
    if (!employee) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });

    const elevated = hasPermission(auth.user, "HR:DOCS:RESTRICTED");
    if (!elevated && parsed.visibility === "RESTRINGIDO") {
      return NextResponse.json({ error: "Visibilidad no permitida" }, { status: 403 });
    }

    const payload = {
      employeeId: resolvedParams.id,
      type: parsed.type,
      title: parsed.title,
      visibility: parsed.visibility || "PERSONAL",
      notes: parsed.notes,
      retentionUntil: parsed.retentionUntil,
      version: parsed.version,
      uploadedById: auth.user?.id || null
    };

    let doc = null;
    if (parsed.id) {
      const candidate = await prisma.employeeDocument.findUnique({
        where: { id: parsed.id }
      });
      const ownership = documentOwnershipStatus(candidate, resolvedParams.id);
      if (!ownership.ok) {
        return NextResponse.json({ error: ownership.error }, { status: ownership.status });
      }
      doc = await prisma.$transaction(async (tx) => {
        await addDocumentVersion({ documentId: parsed.id!, employeeId: resolvedParams.id, payload, tx });
        return tx.employeeDocument.findUnique({
          where: { id: parsed.id! },
          include: { versions: { orderBy: { versionNumber: "desc" } }, currentVersion: true }
        });
      });
    } else {
      doc = await prisma.$transaction(async (tx) => {
        const created = await createDocumentWithVersion({ payload, tx });
        return tx.employeeDocument.findUnique({
          where: { id: created.id },
          include: { versions: { orderBy: { versionNumber: "desc" } }, currentVersion: true }
        });
      });
    }

    return NextResponse.json({ data: doc }, { status: 201 });
  } catch (err: any) {
    console.error("create employee document", err);
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "Datos inválidos", details: err.flatten().fieldErrors }, { status: 400 });
    }
    if (err.code === "P2025") return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    return NextResponse.json({ error: err?.message || "No se pudo adjuntar el documento" }, { status: 400 });
  }
}
