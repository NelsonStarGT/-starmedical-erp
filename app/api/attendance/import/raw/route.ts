import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { AttendanceRawEventSource, AttendanceRawEventStatus, AttendanceRawEventType } from "@prisma/client";
import { importExcelViaProcessingService } from "@/lib/processing-service/excel";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "No autorizado" } }, { status: 403 });
}

export async function GET(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) return NextResponse.json({ ok: false, error: { code: "UNAUTHENTICATED", message: "No autenticado" } }, { status: 401 });
  if (!hasPermission(user, "USERS:ADMIN") && !hasPermission(user, "HR:ATTENDANCE:WRITE")) return unauthorized();
  return NextResponse.json({ ok: true, message: "Attendance import listo" });
}

function extractCell(row: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const match = Object.keys(row).find((k) => k.toLowerCase() === key.toLowerCase());
    if (match) return row[match];
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) return NextResponse.json({ ok: false, error: { code: "UNAUTHENTICATED", message: "No autenticado" } }, { status: 401 });
  if (!hasPermission(user, "USERS:ADMIN") && !hasPermission(user, "HR:ATTENDANCE:WRITE")) return unauthorized();

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ ok: false, error: { code: "FILE_REQUIRED", message: "Archivo requerido" } }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parsed = await importExcelViaProcessingService({
      context: {
        tenantId: user.tenantId,
        actorId: user.id
      },
      fileBuffer: buffer,
      template: "generic",
      limits: {
        maxFileMb: 8,
        maxRows: 20_000,
        maxCols: 120,
        timeoutMs: 20_000
      }
    });
    const parsedPayload = ((parsed.artifactJson || {}) as { rows?: Record<string, unknown>[]; columns?: unknown[] }) || {};
    const rowsSource = Array.isArray(parsedPayload.rows) ? parsedPayload.rows : [];
    if (!rowsSource.length) {
      return NextResponse.json({ ok: false, error: { code: "EMPTY_FILE", message: "Archivo sin datos" } }, { status: 400 });
    }

    const headers = Array.isArray(parsedPayload.columns)
      ? parsedPayload.columns.map((value) => String(value || "").trim()).filter(Boolean)
      : Object.keys(rowsSource[0] || {});
    const records: any[] = [];
    const seenKeys = new Set<string>();

    rowsSource.forEach((row) => {
      const values: Record<string, any> = {};
      headers.forEach((header) => {
        values[header] = row[header];
      });
      const biometricId = String(extractCell(values, ["Ac-No", "AC-No.", "biometricId", "acno"]) || "").trim();
      const rawTime = extractCell(values, ["Time", "sTime", "DateTime", "datetime"]) || "";
      if (!biometricId || !rawTime) return;
      const occurredAt = new Date(rawTime);
      if (Number.isNaN(occurredAt.getTime())) return;
      const key = `${biometricId}-${occurredAt.toISOString()}`;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);

      records.push({
        biometricId,
        occurredAt,
        source: AttendanceRawEventSource.MANUAL_IMPORT,
        type: AttendanceRawEventType.CHECK_IN,
        status: AttendanceRawEventStatus.NEW,
        payloadJson: values
      });
    });

    if (!records.length) {
      return NextResponse.json({ ok: false, error: { code: "NO_ROWS", message: "No se encontraron filas válidas" } }, { status: 400 });
    }

    const batchId = randomUUID();
    const stats = await prisma.$transaction(async (tx) => {
      let imported = 0;
      let skipped = 0;
      let errors = 0;
      for (const rec of records) {
        const duplicate = await tx.attendanceRawEvent.findFirst({
          where: { biometricId: rec.biometricId, occurredAt: rec.occurredAt }
        });
        if (duplicate) {
          skipped += 1;
          continue;
        }
        try {
          await tx.attendanceRawEvent.create({ data: { ...rec, importBatchId: batchId } as any });
          imported += 1;
        } catch {
          errors += 1;
        }
      }
      return { imported, skipped, errors, total: records.length, batchId };
    });

    return NextResponse.json({ ok: true, data: stats }, { status: 201 });
  } catch (err: any) {
    console.error("import raw error", err);
    return NextResponse.json({ ok: false, error: { code: "IMPORT_FAILED", message: err?.message || "No se pudo importar" } }, { status: 500 });
  }
}
