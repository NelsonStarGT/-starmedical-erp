import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listWorklistOrders } from "@/lib/medical/encounterRealStore";
import { canAccessWorklistByModality, type WorklistModality } from "@/lib/medical/worklistAccess";

type WorklistStatus = "ordered" | "in_progress" | "completed" | "cancelled";

function parseModality(value: string | null): WorklistModality | null {
  if (value === "LAB" || value === "RX" || value === "USG") return value;
  return null;
}

function parsePriority(value: string | null): "routine" | "urgent" | null {
  if (value === "routine" || value === "urgent") return value;
  return null;
}

function parseStatus(value: string): WorklistStatus | null {
  if (value === "ordered" || value === "in_progress" || value === "completed" || value === "cancelled") return value;
  return null;
}

function parseStatusFilter(url: URL): WorklistStatus[] {
  const multi = url.searchParams.getAll("status");
  const csv = (url.searchParams.get("statuses") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const unique = new Set<WorklistStatus>();
  for (const raw of [...multi, ...csv]) {
    const status = parseStatus(raw);
    if (status) unique.add(status);
  }

  if (unique.size === 0) {
    return ["ordered", "in_progress"];
  }
  return Array.from(unique);
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const url = new URL(req.url);
  const modality = parseModality((url.searchParams.get("modality") || "").toUpperCase());
  if (!modality) {
    return NextResponse.json({ ok: false, error: "modality requerido (LAB|RX|USG)" }, { status: 400 });
  }

  if (!canAccessWorklistByModality(auth.user, modality, "read")) {
    return NextResponse.json({ ok: false, error: "No autorizado para esta worklist." }, { status: 403 });
  }

  const priority = parsePriority((url.searchParams.get("priority") || "").toLowerCase());
  const patientQuery = (url.searchParams.get("patient") || url.searchParams.get("query") || "").trim();
  const dateFrom = (url.searchParams.get("dateFrom") || "").trim() || null;
  const dateTo = (url.searchParams.get("dateTo") || "").trim() || null;
  const statusFilter = parseStatusFilter(url);

  try {
    const items = await listWorklistOrders({
      modality,
      priority,
      patientQuery: patientQuery || null,
      statusFilter,
      dateFrom,
      dateTo
    });

    return NextResponse.json({
      ok: true,
      data: {
        modality,
        items,
        total: items.length
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo obtener la worklist.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
