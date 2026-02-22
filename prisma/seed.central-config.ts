import { BranchFelDocumentType, Prisma, PrismaClient } from "@prisma/client";
import {
  findOverlappingScheduleRanges,
  normalizeScheduleForStorage,
  scheduleHasAnyRange
} from "@/lib/config-central/hours";
import type { BranchSchedule } from "@/lib/config-central/schemas";

const prisma = new PrismaClient();

const PALIN_BRANCH = {
  name: "Palín",
  code: "PALIN",
  address: "Palín, Escuintla",
  phone: "7729-3636",
  timezone: "America/Guatemala"
} as const;

const PALIN_SAT = {
  satEstablishmentCode: "PALIN-001",
  legalName: "StarMedical Palín",
  tradeName: "StarMedical",
  address: "Palín, Escuintla"
} as const;

const STAR_THEME = {
  primary: "#2e75ba",
  secondary: "#4aadf5",
  accent: "#4aa59c",
  bg: "#f8fafc",
  surface: "#ffffff",
  text: "#0f172a"
} as const;

const BASE_SCHEDULE: BranchSchedule = {
  mon: ["07:00-17:00"],
  tue: ["07:00-17:00"],
  wed: ["07:00-17:00"],
  thu: ["07:00-17:00"],
  fri: ["07:00-17:00"],
  sat: ["08:00-12:00"],
  sun: []
};

const TRADE_UNITS_DEMO = [
  {
    name: "ATENUN",
    registrationNumber: "PAT-ATENUN-001",
    address: "Palín, Escuintla"
  },
  {
    name: "Farmacia",
    registrationNumber: "PAT-FAR-001",
    address: "Palín, Escuintla"
  },
  {
    name: "Diagnóstico por Imágenes",
    registrationNumber: "PAT-IMG-001",
    address: "Palín, Escuintla"
  }
] as const;

type Mode = "created" | "updated" | "existing";

type SeedSummary = {
  branch: { id: string; mode: Mode };
  hours: { id: string; mode: Mode };
  theme: { id: string; mode: Mode };
  legalEntity: { id: string; mode: Mode };
  sat: { id: string; mode: Mode };
  billingProfile: { id: string; mode: Mode } | null;
  tradeUnits: Array<{ id: string; mode: Mode; name: string }>;
  felSeries?: { id: string; mode: Mode } | null;
};

function startOfToday() {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value;
}

function normalizeSchedule(schedule: BranchSchedule): BranchSchedule {
  return normalizeScheduleForStorage(schedule);
}

function toBranchSchedule(value: unknown): BranchSchedule | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Partial<Record<keyof BranchSchedule, unknown>>;
  const schedule: BranchSchedule = {
    mon: Array.isArray(source.mon) ? source.mon.filter((entry): entry is string => typeof entry === "string") : [],
    tue: Array.isArray(source.tue) ? source.tue.filter((entry): entry is string => typeof entry === "string") : [],
    wed: Array.isArray(source.wed) ? source.wed.filter((entry): entry is string => typeof entry === "string") : [],
    thu: Array.isArray(source.thu) ? source.thu.filter((entry): entry is string => typeof entry === "string") : [],
    fri: Array.isArray(source.fri) ? source.fri.filter((entry): entry is string => typeof entry === "string") : [],
    sat: Array.isArray(source.sat) ? source.sat.filter((entry): entry is string => typeof entry === "string") : [],
    sun: Array.isArray(source.sun) ? source.sun.filter((entry): entry is string => typeof entry === "string") : []
  };
  return normalizeSchedule(schedule);
}

function assertScheduleIsValid(schedule: BranchSchedule) {
  if (!scheduleHasAnyRange(schedule)) {
    throw new Error("[seed:central-config] Horario inválido: no puede estar vacío.");
  }

  const overlapIssues = findOverlappingScheduleRanges(schedule);
  if (overlapIssues.length > 0) {
    const sample = overlapIssues[0]!;
    throw new Error(
      `[seed:central-config] Horario inválido: solape en ${sample.day} (${sample.left} vs ${sample.right}).`
    );
  }
}

function mergeTheme(theme: unknown) {
  if (!theme || typeof theme !== "object") {
    return { ...STAR_THEME };
  }

  const raw = theme as Partial<Record<keyof typeof STAR_THEME, unknown>>;
  return {
    primary: typeof raw.primary === "string" ? raw.primary : STAR_THEME.primary,
    secondary: typeof raw.secondary === "string" ? raw.secondary : STAR_THEME.secondary,
    accent: typeof raw.accent === "string" ? raw.accent : STAR_THEME.accent,
    bg: typeof raw.bg === "string" ? raw.bg : STAR_THEME.bg,
    surface: typeof raw.surface === "string" ? raw.surface : STAR_THEME.surface,
    text: typeof raw.text === "string" ? raw.text : STAR_THEME.text
  };
}

async function ensurePalinBranch() {
  const [byCode, byName] = await Promise.all([
    prisma.branch.findFirst({
      where: { code: PALIN_BRANCH.code },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        phone: true,
        timezone: true,
        isActive: true
      }
    }),
    prisma.branch.findFirst({
      where: { name: PALIN_BRANCH.name },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        phone: true,
        timezone: true,
        isActive: true
      }
    })
  ]);

  const existing = byCode ?? byName;
  if (!existing) {
    const created = await prisma.branch.create({
      data: {
        name: PALIN_BRANCH.name,
        code: PALIN_BRANCH.code,
        address: PALIN_BRANCH.address,
        phone: PALIN_BRANCH.phone,
        timezone: PALIN_BRANCH.timezone,
        isActive: true
      },
      select: { id: true }
    });
    return { id: created.id, mode: "created" as const };
  }

  const updated = await prisma.branch.update({
    where: { id: existing.id },
    data: {
      name: PALIN_BRANCH.name,
      code: PALIN_BRANCH.code,
      address: existing.address || PALIN_BRANCH.address,
      phone: existing.phone || PALIN_BRANCH.phone,
      timezone: existing.timezone || PALIN_BRANCH.timezone,
      isActive: true
    },
    select: { id: true }
  });

  const mode: Mode =
    byCode &&
    byCode.name === PALIN_BRANCH.name &&
    byCode.code === PALIN_BRANCH.code &&
    (byCode.address || PALIN_BRANCH.address) === byCode.address &&
    (byCode.phone || PALIN_BRANCH.phone) === byCode.phone &&
    (byCode.timezone || PALIN_BRANCH.timezone) === byCode.timezone &&
    byCode.isActive
      ? "existing"
      : "updated";

  return { id: updated.id, mode };
}

async function ensurePalinHours(branchId: string) {
  const rows = await prisma.branchBusinessHours.findMany({
    where: { branchId },
    orderBy: [{ validFrom: "desc" }],
    select: {
      id: true,
      validFrom: true,
      validTo: true,
      isActive: true,
      slotMinutesDefault: true,
      scheduleJson: true
    }
  });

  const activeRows = rows.filter((row) => row.isActive);
  const activeWithOpenEnded = activeRows.filter((row) => row.validTo === null);
  const keeper =
    activeWithOpenEnded.sort((left, right) => right.validFrom.getTime() - left.validFrom.getTime())[0] ??
    activeRows.sort((left, right) => right.validFrom.getTime() - left.validFrom.getTime())[0] ??
    null;

  const now = new Date();
  const deactivateIds = activeRows.filter((row) => row.id !== keeper?.id).map((row) => row.id);
  if (deactivateIds.length > 0) {
    await prisma.branchBusinessHours.updateMany({
      where: { id: { in: deactivateIds } },
      data: { isActive: false, validTo: now }
    });
  }

  const defaultSchedule = normalizeSchedule(BASE_SCHEDULE);
  assertScheduleIsValid(defaultSchedule);

  if (!keeper) {
    const created = await prisma.branchBusinessHours.create({
      data: {
        branchId,
        validFrom: startOfToday(),
        validTo: null,
        scheduleJson: defaultSchedule as unknown as Prisma.InputJsonValue,
        slotMinutesDefault: 30,
        isActive: true
      },
      select: { id: true }
    });
    return { id: created.id, mode: "created" as const };
  }

  const existingSchedule = toBranchSchedule(keeper.scheduleJson);
  const hasValidSchedule =
    Boolean(existingSchedule) &&
    scheduleHasAnyRange(existingSchedule as BranchSchedule) &&
    findOverlappingScheduleRanges(existingSchedule as BranchSchedule).length === 0;
  const hasValidSlotMinutes =
    typeof keeper.slotMinutesDefault === "number" ? keeper.slotMinutesDefault >= 5 : false;
  const needsUpdate = !hasValidSchedule || !hasValidSlotMinutes || keeper.validTo !== null || !keeper.isActive;

  if (!needsUpdate) {
    return { id: keeper.id, mode: "existing" as const };
  }

  const updated = await prisma.branchBusinessHours.update({
    where: { id: keeper.id },
    data: {
      validTo: null,
      isActive: true,
      slotMinutesDefault: hasValidSlotMinutes ? keeper.slotMinutesDefault : 30,
      scheduleJson: hasValidSchedule
        ? (existingSchedule as unknown as Prisma.InputJsonValue)
        : (defaultSchedule as unknown as Prisma.InputJsonValue)
    },
    select: { id: true }
  });

  return { id: updated.id, mode: "updated" as const };
}

async function ensureBaseTheme() {
  const existing = await prisma.tenantThemeConfig.findUnique({
    where: { id: "global" },
    select: {
      id: true,
      theme: true,
      fontKey: true,
      logoUrl: true,
      logoAssetId: true
    }
  });

  if (!existing) {
    const created = await prisma.tenantThemeConfig.create({
      data: {
        id: "global",
        version: 1,
        theme: STAR_THEME as unknown as Prisma.InputJsonValue,
        fontKey: "inter",
        logoUrl: null,
        logoAssetId: null,
        updatedByUserId: null
      },
      select: { id: true }
    });
    return { id: created.id, mode: "created" as const };
  }

  const mergedTheme = mergeTheme(existing.theme);
  const nextFont = existing.fontKey || "inter";
  const rawTheme =
    existing.theme && typeof existing.theme === "object"
      ? (existing.theme as Partial<Record<keyof typeof STAR_THEME, unknown>>)
      : null;
  const themeChanged =
    !rawTheme ||
    (Object.keys(STAR_THEME) as Array<keyof typeof STAR_THEME>).some((key) => {
      const current = rawTheme[key];
      return typeof current !== "string" || current !== mergedTheme[key];
    }) ||
    !["inter", "poppins", "montserrat", "nunito", "roboto"].includes(nextFont);

  if (!themeChanged) {
    return { id: existing.id, mode: "existing" as const };
  }

  const updated = await prisma.tenantThemeConfig.update({
    where: { id: existing.id },
    data: {
      theme: mergedTheme as unknown as Prisma.InputJsonValue,
      fontKey: ["inter", "poppins", "montserrat", "nunito", "roboto"].includes(nextFont) ? nextFont : "inter"
    },
    select: { id: true }
  });
  return { id: updated.id, mode: "updated" as const };
}

async function ensureLegalEntity() {
  const existing = await prisma.legalEntity.findFirst({
    where: {
      OR: [{ nit: "CF-PALIN" }, { name: "StarMedical Operación" }]
    },
    select: {
      id: true,
      name: true,
      comercialName: true,
      nit: true,
      fiscalAddress: true,
      isActive: true,
      tenantId: true
    }
  });

  if (!existing) {
    const created = await prisma.legalEntity.create({
      data: {
        tenantId: "global",
        name: "StarMedical Operación",
        comercialName: "StarMedical",
        nit: "CF-PALIN",
        fiscalAddress: "Palín, Escuintla",
        isActive: true
      },
      select: { id: true }
    });
    return { id: created.id, mode: "created" as const };
  }

  const needsUpdate =
    !existing.isActive ||
    (existing.tenantId ?? "global") !== "global" ||
    !existing.nit ||
    !existing.fiscalAddress;

  if (!needsUpdate) {
    return { id: existing.id, mode: "existing" as const };
  }

  const updated = await prisma.legalEntity.update({
    where: { id: existing.id },
    data: {
      tenantId: "global",
      name: existing.name || "StarMedical Operación",
      comercialName: existing.comercialName || "StarMedical",
      nit: existing.nit || "CF-PALIN",
      fiscalAddress: existing.fiscalAddress || "Palín, Escuintla",
      isActive: true
    },
    select: { id: true }
  });

  return { id: updated.id, mode: "updated" as const };
}

async function ensureSatDraft(branchId: string, legalEntityId: string) {
  const existing = await prisma.branchSatEstablishment.findUnique({
    where: { satEstablishmentCode: PALIN_SAT.satEstablishmentCode },
    select: {
      id: true,
      branchId: true,
      legalEntityId: true,
      legalName: true,
      tradeName: true,
      address: true,
      isActive: true
    }
  });

  if (!existing) {
    const created = await prisma.branchSatEstablishment.create({
      data: {
        branchId,
        legalEntityId,
        satEstablishmentCode: PALIN_SAT.satEstablishmentCode,
        legalName: PALIN_SAT.legalName,
        tradeName: PALIN_SAT.tradeName,
        address: PALIN_SAT.address,
        isActive: false
      },
      select: { id: true }
    });
    return { id: created.id, mode: "created" as const };
  }

  const needsUpdate =
    existing.branchId !== branchId ||
    (existing.legalEntityId || null) !== legalEntityId ||
    existing.legalName !== PALIN_SAT.legalName ||
    (existing.tradeName || null) !== PALIN_SAT.tradeName ||
    existing.address !== PALIN_SAT.address ||
    existing.isActive;

  if (!needsUpdate) {
    return { id: existing.id, mode: "existing" as const };
  }

  const updated = await prisma.branchSatEstablishment.update({
    where: { id: existing.id },
    data: {
      branchId,
      legalEntityId,
      legalName: PALIN_SAT.legalName,
      tradeName: PALIN_SAT.tradeName,
      address: PALIN_SAT.address,
      isActive: false
    },
    select: { id: true }
  });
  return { id: updated.id, mode: "updated" as const };
}

async function ensureBranchBillingProfile(input: {
  branchId: string;
  legalEntityId: string;
  establishmentId: string;
}) {
  const prismaClient = prisma as unknown as {
    branchBillingProfile?: {
      findFirst: (args: unknown) => Promise<{ id: string; priority: number; isActive: boolean } | null>;
      create: (args: unknown) => Promise<{ id: string }>;
      update: (args: unknown) => Promise<{ id: string }>;
    };
  };

  if (!prismaClient.branchBillingProfile?.findFirst) {
    return null;
  }

  const existing = await prismaClient.branchBillingProfile.findFirst({
    where: {
      branchId: input.branchId,
      legalEntityId: input.legalEntityId,
      establishmentId: input.establishmentId
    },
    select: {
      id: true,
      priority: true,
      isActive: true
    }
  });

  if (!existing) {
    const created = await prismaClient.branchBillingProfile.create({
      data: {
        branchId: input.branchId,
        legalEntityId: input.legalEntityId,
        establishmentId: input.establishmentId,
        priority: 1,
        isActive: true
      },
      select: { id: true }
    });
    return { id: created.id, mode: "created" as const };
  }

  if (existing.priority === 1 && existing.isActive) {
    return { id: existing.id, mode: "existing" as const };
  }

  const updated = await prismaClient.branchBillingProfile.update({
    where: { id: existing.id },
    data: {
      priority: 1,
      isActive: true
    },
    select: { id: true }
  });
  return { id: updated.id, mode: "updated" as const };
}

async function ensureTradeUnits(input: { branchId: string; legalEntityId: string }) {
  const prismaClient = prisma as unknown as {
    tradeUnit?: {
      findFirst: (args: unknown) => Promise<{
        id: string;
        name: string;
        registrationNumber: string | null;
        address: string | null;
        isActive: boolean;
      } | null>;
      create: (args: unknown) => Promise<{ id: string; name: string }>;
      update: (args: unknown) => Promise<{ id: string; name: string }>;
    };
  };

  if (!prismaClient.tradeUnit?.findFirst || !prismaClient.tradeUnit?.create || !prismaClient.tradeUnit?.update) {
    return [] as Array<{ id: string; mode: Mode; name: string }>;
  }

  const results: Array<{ id: string; mode: Mode; name: string }> = [];
  for (const tradeUnit of TRADE_UNITS_DEMO) {
    const existing = await prismaClient.tradeUnit.findFirst({
      where: {
        branchId: input.branchId,
        name: tradeUnit.name
      },
      select: {
        id: true,
        name: true,
        registrationNumber: true,
        address: true,
        isActive: true
      }
    });

    if (!existing) {
      const created = await prismaClient.tradeUnit.create({
        data: {
          tenantId: "global",
          name: tradeUnit.name,
          registrationNumber: tradeUnit.registrationNumber,
          address: tradeUnit.address,
          branchId: input.branchId,
          legalEntityId: input.legalEntityId,
          isActive: true
        },
        select: { id: true, name: true }
      });
      results.push({ id: created.id, mode: "created", name: created.name });
      continue;
    }

    const needsUpdate =
      (existing.registrationNumber || null) !== tradeUnit.registrationNumber ||
      (existing.address || null) !== tradeUnit.address ||
      !existing.isActive;

    if (!needsUpdate) {
      results.push({ id: existing.id, mode: "existing", name: existing.name });
      continue;
    }

    const updated = await prismaClient.tradeUnit.update({
      where: { id: existing.id },
      data: {
        registrationNumber: tradeUnit.registrationNumber,
        address: tradeUnit.address,
        isActive: true
      },
      select: { id: true, name: true }
    });
    results.push({ id: updated.id, mode: "updated", name: updated.name });
  }

  return results;
}

async function ensureOptionalFelSeries(establishmentId: string) {
  const enabled = process.env.SEED_CENTRAL_CONFIG_INCLUDE_FEL === "1";
  if (!enabled) return null;

  const existing = await prisma.branchFelSeries.findFirst({
    where: {
      establishmentId,
      serie: "A",
      documentType: BranchFelDocumentType.FACTURA
    },
    select: { id: true, isActive: true }
  });

  if (!existing) {
    const created = await prisma.branchFelSeries.create({
      data: {
        establishmentId,
        serie: "A",
        documentType: BranchFelDocumentType.FACTURA,
        isActive: true
      },
      select: { id: true }
    });
    return { id: created.id, mode: "created" as const };
  }

  if (existing.isActive) {
    return { id: existing.id, mode: "existing" as const };
  }

  const updated = await prisma.branchFelSeries.update({
    where: { id: existing.id },
    data: { isActive: true },
    select: { id: true }
  });
  return { id: updated.id, mode: "updated" as const };
}

async function main() {
  const summary = {} as SeedSummary;

  const branch = await ensurePalinBranch();
  summary.branch = branch;

  const hours = await ensurePalinHours(branch.id);
  summary.hours = hours;

  const theme = await ensureBaseTheme();
  summary.theme = theme;

  const legalEntity = await ensureLegalEntity();
  summary.legalEntity = legalEntity;

  const sat = await ensureSatDraft(branch.id, legalEntity.id);
  summary.sat = sat;

  const billingProfile = await ensureBranchBillingProfile({
    branchId: branch.id,
    legalEntityId: legalEntity.id,
    establishmentId: sat.id
  });
  summary.billingProfile = billingProfile;

  const tradeUnits = await ensureTradeUnits({
    branchId: branch.id,
    legalEntityId: legalEntity.id
  });
  summary.tradeUnits = tradeUnits;

  const felSeries = await ensureOptionalFelSeries(sat.id);
  if (felSeries) summary.felSeries = felSeries;

  console.info("[seed:central-config] branchId=%s mode=%s", summary.branch.id, summary.branch.mode);
  console.info("[seed:central-config] hoursId=%s mode=%s", summary.hours.id, summary.hours.mode);
  console.info("[seed:central-config] themeId=%s mode=%s", summary.theme.id, summary.theme.mode);
  console.info("[seed:central-config] legalEntityId=%s mode=%s", summary.legalEntity.id, summary.legalEntity.mode);
  console.info("[seed:central-config] satId=%s mode=%s", summary.sat.id, summary.sat.mode);
  if (summary.billingProfile) {
    console.info(
      "[seed:central-config] billingProfileId=%s mode=%s",
      summary.billingProfile.id,
      summary.billingProfile.mode
    );
  } else {
    console.info("[seed:central-config] billingProfile=skipped (delegate unavailable)");
  }
  if (summary.tradeUnits.length > 0) {
    for (const unit of summary.tradeUnits) {
      console.info(
        "[seed:central-config] tradeUnit=%s id=%s mode=%s",
        unit.name,
        unit.id,
        unit.mode
      );
    }
  } else {
    console.info("[seed:central-config] tradeUnits=skipped (delegate unavailable)");
  }
  if (summary.felSeries) {
    console.info(
      "[seed:central-config] felSeriesId=%s mode=%s",
      summary.felSeries.id,
      summary.felSeries.mode
    );
  } else {
    console.info(
      "[seed:central-config] felSeries=skipped (set SEED_CENTRAL_CONFIG_INCLUDE_FEL=1 to enable)"
    );
  }
}

main()
  .catch((error) => {
    console.error("[seed:central-config] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
