import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_HOME_DASHBOARD_SETTINGS,
  HOME_KPI_CATALOG,
  HOME_QUICK_ACTION_CATALOG,
  normalizeHomeDashboardSettings
} from "@/lib/home-dashboard/config";
import {
  getHomeDashboardSettingsSnapshot,
  saveHomeDashboardSettings
} from "@/lib/home-dashboard/service";
import { ensureAdmin } from "@/lib/api/admin";

export const dynamic = "force-dynamic";

function normalizeRoleName(value: unknown): string {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

export async function GET(req: NextRequest) {
  const auth = ensureAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const snapshot = await getHomeDashboardSettingsSnapshot();
    const scope = req.nextUrl.searchParams.get("scope")?.toUpperCase() === "ROLE" ? "ROLE" : "GLOBAL";
    const roleName = normalizeRoleName(req.nextUrl.searchParams.get("role"));
    const selectedData =
      scope === "ROLE" && roleName ? snapshot.byRole[roleName] || snapshot.global : snapshot.global;

    return NextResponse.json({
      data: selectedData,
      scope,
      roleName: scope === "ROLE" ? roleName || null : null,
      global: snapshot.global,
      byRole: snapshot.byRole,
      catalog: {
        quickActions: HOME_QUICK_ACTION_CATALOG,
        kpis: HOME_KPI_CATALOG
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "No se pudo obtener configuración de inicio",
        data: DEFAULT_HOME_DASHBOARD_SETTINGS
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json().catch(() => ({}));
    const scope = String(body?.scope || "GLOBAL").toUpperCase() === "ROLE" ? "ROLE" : "GLOBAL";
    const roleName = scope === "ROLE" ? normalizeRoleName(body?.roleName) : "";
    if (scope === "ROLE" && !roleName) {
      return NextResponse.json(
        { error: "roleName es requerido cuando scope=ROLE" },
        { status: 422 }
      );
    }

    const rawSettings =
      body && typeof body === "object" && ("quickActionKeys" in body || "kpiKeys" in body)
        ? body
        : body?.settings;

    const normalized = normalizeHomeDashboardSettings(rawSettings);
    const data = await saveHomeDashboardSettings(normalized, {
      roleName: scope === "ROLE" ? roleName : null
    });
    const snapshot = await getHomeDashboardSettingsSnapshot();

    return NextResponse.json({
      data,
      scope,
      roleName: scope === "ROLE" ? roleName : null,
      global: snapshot.global,
      byRole: snapshot.byRole
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error?.message || "No se pudo guardar configuración de inicio" }, { status: 500 });
  }
}
