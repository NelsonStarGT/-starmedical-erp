import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { requireRole } from "@/lib/api/hr";
import { readAppIdentityMeta } from "@/lib/home-dashboard/storage";
import { normalizeTenantId } from "@/lib/tenant";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_NAME = "StarMedical ERP";
const selectIdentity = { logoUrl: true, logoFileKey: true } satisfies Prisma.HrSettingsSelect;
const selectThemeIdentity = { logoUrl: true, logoAssetId: true } as const;

async function ensureHrSettingsIdentity() {
  const existing = await prisma.hrSettings.findUnique({ where: { id: 1 }, select: selectIdentity });
  if (existing) return existing;
  return prisma.hrSettings.create({ data: { id: 1 }, select: selectIdentity });
}

async function resolveLogoUrl(logoUrl?: string | null, logoFileKey?: string | null) {
  const trimmed = logoUrl?.trim();
  if (trimmed) {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
      return trimmed;
    }
  }

  const fileKey = logoFileKey || (!trimmed || trimmed.includes(" ") ? null : trimmed);
  if (!fileKey) return null;

  const asset = await prisma.fileAsset.findFirst({ where: { storageKey: fileKey }, select: { id: true } });
  if (asset?.id) return `/api/files/${asset.id}`;
  return null;
}

async function resolveThemeLogoUrl(logoUrl?: string | null, logoAssetId?: string | null) {
  const trimmed = logoUrl?.trim();
  if (trimmed) {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
      return trimmed;
    }
  }
  if (logoAssetId) {
    return `/api/files/${logoAssetId}`;
  }
  return null;
}

async function fetchIdentityPayload(tenantIdInput: unknown = "global") {
  const tenantId = normalizeTenantId(tenantIdInput);
  const [settings, appConfig, themeConfig] = await Promise.all([
    ensureHrSettingsIdentity(),
    prisma.appConfig.findFirst({ orderBy: { createdAt: "desc" }, select: { companyName: true, openingHours: true } }),
    (async () => {
      const delegate = (prisma as unknown as {
        tenantThemePreference?: {
          findUnique?: (args: {
            where: { tenantId: string };
            select: typeof selectThemeIdentity;
          }) => Promise<{ logoUrl: string | null; logoAssetId: string | null } | null>;
        };
        tenantThemeConfig?: {
          findUnique?: (args: {
            where: { id: string };
            select: typeof selectThemeIdentity;
          }) => Promise<{ logoUrl: string | null; logoAssetId: string | null } | null>;
        };
      });

      try {
        if (delegate.tenantThemePreference?.findUnique) {
          const byTenant = await delegate.tenantThemePreference.findUnique({
            where: { tenantId },
            select: selectThemeIdentity
          });
          if (byTenant) return byTenant;
        }

        if (delegate.tenantThemeConfig?.findUnique) {
          return await delegate.tenantThemeConfig.findUnique({
            where: { id: "global" },
            select: selectThemeIdentity
          });
        }

        return null;
      } catch {
        return null;
      }
    })()
  ]);
  const resolvedThemeLogoUrl = await resolveThemeLogoUrl(themeConfig?.logoUrl, themeConfig?.logoAssetId);
  const resolvedLogoUrl = resolvedThemeLogoUrl || (await resolveLogoUrl(settings.logoUrl, settings.logoFileKey));
  const appIdentity = readAppIdentityMeta(appConfig?.openingHours);
  const name = appIdentity.brandName || appConfig?.companyName?.trim() || DEFAULT_NAME;
  return {
    name,
    logoUrl: resolvedLogoUrl,
    logoFileKey: settings.logoFileKey || null
  };
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const data = await fetchIdentityPayload(auth.user?.tenantId);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error("identity config get error", err);
    return NextResponse.json({ ok: false, error: "No se pudo obtener la identidad" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = requireRole(req, [], "HR:SETTINGS:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json().catch(() => ({}));
    const hasLogoUrl = Object.prototype.hasOwnProperty.call(body, "logoUrl");
    const hasLogoFileKey = Object.prototype.hasOwnProperty.call(body, "logoFileKey");

    const data: Prisma.HrSettingsUncheckedUpdateInput = {};
    if (hasLogoUrl) {
      const cleaned = typeof body.logoUrl === "string" && body.logoUrl.trim().length ? body.logoUrl.trim() : null;
      data.logoUrl = cleaned;
    }
    if (hasLogoFileKey) {
      const cleanedKey = typeof body.logoFileKey === "string" && body.logoFileKey.trim().length ? body.logoFileKey.trim() : null;
      data.logoFileKey = cleanedKey;
    }

    if (!hasLogoUrl && !hasLogoFileKey) {
      return NextResponse.json({ ok: false, error: "Sin cambios" }, { status: 400 });
    }

    await prisma.hrSettings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...(data as any) }
    });

    const payload = await fetchIdentityPayload(auth.user?.tenantId);
    return NextResponse.json({ ok: true, data: payload });
  } catch (err) {
    console.error("identity config patch error", err);
    return NextResponse.json({ ok: false, error: "No se pudo actualizar la identidad" }, { status: 500 });
  }
}
