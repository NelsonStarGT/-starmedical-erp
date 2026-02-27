import "server-only";

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_HOME_DASHBOARD_SETTINGS,
  normalizeHomeDashboardSettings,
  type HomeDashboardSettings
} from "@/lib/home-dashboard/config";
import {
  mergeOpeningHoursWithHomeDashboard,
  readHomeDashboardSettings,
  readHomeDashboardSnapshot
} from "@/lib/home-dashboard/storage";
import { isPrismaMissingTableError, logPrismaSchemaIssue } from "@/lib/prisma/errors.server";

const DEFAULT_COMPANY_NAME = "StarMedical ERP";

function isPrismaUnknownArgumentError(error: unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes("unknown argument");
}

export async function getHomeDashboardSettings(roleNames?: string[]): Promise<HomeDashboardSettings> {
  try {
    const config = await prisma.appConfig.findFirst({ orderBy: { createdAt: "desc" }, select: { openingHours: true } });
    return readHomeDashboardSettings(config?.openingHours, roleNames);
  } catch (error) {
    logPrismaSchemaIssue("home-dashboard.get.appConfig", error);
    if (isPrismaMissingTableError(error) || isPrismaUnknownArgumentError(error)) {
      return { ...DEFAULT_HOME_DASHBOARD_SETTINGS };
    }
    throw error;
  }
}

export async function getHomeDashboardSettingsSnapshot(): Promise<{
  global: HomeDashboardSettings;
  byRole: Record<string, HomeDashboardSettings>;
}> {
  try {
    const config = await prisma.appConfig.findFirst({ orderBy: { createdAt: "desc" }, select: { openingHours: true } });
    return readHomeDashboardSnapshot(config?.openingHours);
  } catch (error) {
    logPrismaSchemaIssue("home-dashboard.snapshot.appConfig", error);
    if (isPrismaMissingTableError(error) || isPrismaUnknownArgumentError(error)) {
      return {
        global: { ...DEFAULT_HOME_DASHBOARD_SETTINGS },
        byRole: {}
      };
    }
    throw error;
  }
}

export async function saveHomeDashboardSettings(
  input: unknown,
  options?: {
    roleName?: string | null;
  }
): Promise<HomeDashboardSettings> {
  const normalized = normalizeHomeDashboardSettings(input);
  const roleName = options?.roleName ? options.roleName.trim() : "";

  try {
    const existing = await prisma.appConfig.findFirst({ orderBy: { createdAt: "desc" } });
    if (existing) {
      const openingHours = mergeOpeningHoursWithHomeDashboard(existing.openingHours, normalized, {
        roleName: roleName || null
      });
      await prisma.appConfig.update({
        where: { id: existing.id },
        data: { openingHours }
      });
      return normalized;
    }

    await prisma.appConfig.create({
      data: {
        companyName: DEFAULT_COMPANY_NAME,
        timezone: "America/Guatemala",
        openingHours: mergeOpeningHoursWithHomeDashboard(null, normalized, {
          roleName: roleName || null
        })
      }
    });
    return normalized;
  } catch (error) {
    logPrismaSchemaIssue("home-dashboard.save.appConfig", error);
    if (isPrismaMissingTableError(error) || isPrismaUnknownArgumentError(error)) {
      return normalized;
    }
    throw error;
  }
}
