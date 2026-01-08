import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";
import { createEmployeeDocumentSchema } from "@/lib/hr/schemas";
import { cleanNullableString, computeRetentionUntil, parseDateInput } from "@/lib/hr/utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireRole(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const parsed = createEmployeeDocumentSchema.parse(body);
    const employee = await prisma.hrEmployee.findUnique({ where: { id: params.id } });
    if (!employee) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });

    const existing = parsed.id ? await prisma.employeeDocument.findUnique({ where: { id: parsed.id }, include: { versions: true } }) : null;
    const versionNumber =
      parsed.version.versionNumber ||
      (existing?.versions.length ? Math.max(...existing.versions.map((v) => v.versionNumber)) + 1 : 1);
    const issuedAt = parseDateInput(parsed.version.issuedAt, "Fecha de emisión");
    const deliveredAt = parseDateInput(parsed.version.deliveredAt, "Fecha de entrega");
    const expiresAt = parseDateInput(parsed.version.expiresAt, "Fecha de vencimiento");
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
                notes: cleanNullableString(parsed.version.notes),
                uploadedById: auth.user?.id || null
              }
            }
          }
        });
        await tx.notification.deleteMany({ where: { employeeId: params.id, type: NotificationType.DOCUMENT_EXPIRY, entityId: documentId } });
      } else {
        await tx.employeeDocument.create({
          data: {
            id: documentId,
            employeeId: params.id,
            type: parsed.type,
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
            employeeId: params.id,
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
