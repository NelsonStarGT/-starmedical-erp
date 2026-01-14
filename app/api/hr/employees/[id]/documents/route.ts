import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";
import { createEmployeeDocumentSchema } from "@/lib/hr/schemas";
import { cleanNullableString, computeRetentionUntil, parseDateInput } from "@/lib/hr/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const resolvedParams = "then" in params ? await params : params;
  const auth = requireRole(req, ["ADMIN", "HR_ADMIN", "HR_USER", "STAFF", "VIEWER"], "HR:DOCS:READ");
  if (auth.errorResponse) return auth.errorResponse;

  const roleNames = (auth.user?.roles || []).map((r) => r.role?.name).filter(Boolean) as string[];
  const canSeeAll = roleNames.includes("ADMIN") || roleNames.includes("HR_ADMIN") || roleNames.includes("HR_USER");

  const docs = await prisma.employeeDocument.findMany({
    where: {
      employeeId: resolvedParams.id,
      isArchived: false,
      ...(canSeeAll ? {} : { visibility: "PERSONAL" })
    },
    include: { versions: { orderBy: { versionNumber: "desc" } }, currentVersion: true },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({
    data: docs.map((doc) => ({
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
  const auth = requireRole(req, ["ADMIN", "HR_ADMIN", "HR_USER"], "HR:DOCS:EDIT");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const parsed = createEmployeeDocumentSchema.parse(body);
    const employee = await prisma.hrEmployee.findUnique({ where: { id: resolvedParams.id } });
    if (!employee) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });

    const roleNames = (auth.user?.roles || []).map((r) => r.role?.name).filter(Boolean) as string[];
    const elevated = roleNames.includes("ADMIN") || roleNames.includes("HR_ADMIN");
    if (!elevated && parsed.visibility !== "PERSONAL") {
      return NextResponse.json({ error: "Visibilidad no permitida" }, { status: 403 });
    }

    const existing = parsed.id ? await prisma.employeeDocument.findUnique({ where: { id: parsed.id }, include: { versions: true } }) : null;
    const versionNumber =
      parsed.version.versionNumber ||
      (existing?.versions.length ? Math.max(...existing.versions.map((v) => v.versionNumber)) + 1 : 1);
    const issuedAt = parseDateInput(parsed.version.issuedAt, "Fecha de emisión");
    const deliveredAt = parseDateInput(parsed.version.deliveredAt, "Fecha de entrega");
    const expiresAt = parseDateInput(parsed.version.expiresAt, "Fecha de vencimiento");
    const viewGrantedUntil = parseDateInput(parsed.version.viewGrantedUntil, "Vigencia visibilidad");
    const retentionUntil = computeRetentionUntil(issuedAt, parseDateInput(parsed.retentionUntil, "Retención"));

    const documentId = parsed.id || existing?.id || randomUUID();
    const versionId = randomUUID();

    const doc = await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.employeeDocument.update({
          where: { id: existing.id },
          data: {
            title: parsed.title.trim(),
            notes: cleanNullableString(parsed.notes),
            visibility: parsed.visibility || existing.visibility,
            retentionUntil,
            currentVersionId: versionId,
            versions: {
              create: {
                id: versionId,
                versionNumber,
                fileUrl: parsed.version.fileUrl.trim(),
                issuedAt,
                deliveredAt,
                expiresAt,
                canEmployeeView: parsed.version.canEmployeeView ?? false,
                viewGrantedUntil,
                notes: cleanNullableString(parsed.version.notes),
                uploadedById: auth.user?.id || null
              }
            }
          }
        });
        await tx.notification.deleteMany({
          where: { employeeId: resolvedParams.id, type: NotificationType.DOCUMENT_EXPIRY, entityId: documentId }
        });
      } else {
        await tx.employeeDocument.create({
          data: {
            id: documentId,
            employeeId: resolvedParams.id,
            type: parsed.type,
            visibility: parsed.visibility || "PERSONAL",
            title: parsed.title.trim(),
            notes: cleanNullableString(parsed.notes),
            retentionUntil,
            isArchived: false,
            currentVersionId: versionId,
            createdById: auth.user?.id || null,
            versions: {
              create: {
                id: versionId,
                versionNumber,
                fileUrl: parsed.version.fileUrl.trim(),
                issuedAt,
                deliveredAt,
                expiresAt,
                canEmployeeView: parsed.version.canEmployeeView ?? false,
                viewGrantedUntil,
                notes: cleanNullableString(parsed.version.notes),
                uploadedById: auth.user?.id || null
              }
            }
          }
        });
      }

      if (expiresAt) {
        await tx.notification.create({
          data: {
            employeeId: resolvedParams.id,
            type: NotificationType.DOCUMENT_EXPIRY,
            title: `Documento ${parsed.title} por vencer`,
            entityId: documentId,
            dueAt: expiresAt
          }
        });
      }

      return tx.employeeDocument.findUnique({
        where: { id: documentId },
        include: { versions: { orderBy: { versionNumber: "desc" } }, currentVersion: true }
      });
    });

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
