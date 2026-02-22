import { NextRequest, NextResponse } from "next/server";
import { withApiErrorHandling, safeJson } from "@/lib/api/http";
import { attendanceRawIngestSchema } from "@/lib/hr/attendance/schemas";
import { ingestRawAttendanceEvent } from "@/lib/hr/attendance/rawProcessing";
import { requireHrPermission } from "@/lib/api/rbac";

export const dynamic = "force-dynamic";

const INGEST_HEADER = "x-ingest-key";

function parseKeyMap() {
  const map = new Map<string, string>();
  const defaultKey = process.env.ATTENDANCE_INGEST_KEY?.trim();
  if (defaultKey) map.set("*", defaultKey);
  const rawMap = process.env.ATTENDANCE_INGEST_KEYS || "";
  rawMap
    .split(/[,;\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const [site, key] = entry.split(":").map((v) => v?.trim());
      if (site && key) map.set(site, key);
    });
  return map;
}

function validateKeyAccess(provided: string | null, siteId?: string | null) {
  if (!provided) return false;
  const keys = parseKeyMap();
  if (keys.get("*") && keys.get("*") === provided) return true;
  if (siteId && keys.get(siteId) === provided) return true;
  return false;
}

async function handler(req: NextRequest) {
  const body = await safeJson(req);
  const parsed = attendanceRawIngestSchema.safeParse(body);
  if (!parsed.success) throw { status: 400, body: { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors } };

  const ingestKey = req.headers.get(INGEST_HEADER);
  const siteId = parsed.data.siteId || null;
  let createdByUserId: string | null = null;
  if (ingestKey) {
    if (!validateKeyAccess(ingestKey, siteId)) {
      throw { status: 401, body: { error: "API key inválida" } };
    }
  } else {
    const auth = requireHrPermission(req, "HR:ATTENDANCE:WRITE");
    if (auth.errorResponse) return auth.errorResponse;
    createdByUserId = auth.user?.id || null;
  }

  const occurredAt = parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date();
  const deviceTime = parsed.data.deviceTime ? new Date(parsed.data.deviceTime) : null;

  const rawPayload = { ...(parsed.data.rawPayload || {}) };
  if (parsed.data.photoBase64) rawPayload.photoBase64 = parsed.data.photoBase64;

  const { created, incidents } = await ingestRawAttendanceEvent({
    data: {
      ...parsed.data,
      occurredAt,
      deviceTime,
      rawPayload
    },
    createdByUserId
  });

  return NextResponse.json({
    ok: true,
    rawEventId: created.id,
    incidents: incidents.map((inc) => ({ id: inc.id, type: inc.type, severity: inc.severity }))
  });
}

export const POST = withApiErrorHandling(handler);
