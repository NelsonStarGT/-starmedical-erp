import fs from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";

type CountrySeed = {
  iso2: string;
  iso3?: string | null;
  name: string;
};

type GuatemalaDepartmentSeed = {
  code: string;
  name: string;
  municipalities: Array<{ code: string; name: string }>;
};

type GuatemalaSeed = {
  countryIso2: string;
  countryIso3?: string;
  countryName: string;
  departments: GuatemalaDepartmentSeed[];
};

type SeedAdmin3 = {
  code: string;
  name: string;
};

type SeedAdmin2 = {
  code: string;
  name: string;
  districts?: SeedAdmin3[];
};

type SeedAdmin1 = {
  code: string;
  name: string;
  municipalities: SeedAdmin2[];
};

type GeoCountrySubdivisionSeed = {
  countryIso2: string;
  countryIso3?: string;
  countryName?: string;
  admin1Label?: string;
  admin2Label?: string;
  admin3Label?: string;
  maxLevel?: number;
  departments: SeedAdmin1[];
};

type GeoCountrySubdivisionSeedFile = {
  countries: GeoCountrySubdivisionSeed[];
};

type GeoPostalCodeSeed = {
  countryIso2: string;
  postalCode: string;
  admin1Code?: string | null;
  admin2Code?: string | null;
  admin3Code?: string | null;
  label?: string | null;
  dataSource?: "official" | "operational";
  isOperational?: boolean;
};

type GeoPostalCodeSeedFile = {
  postalCodes: GeoPostalCodeSeed[];
};

type SeedCountrySubdivisionStats = {
  countryIso2: string;
  departments: number;
  municipalities: number;
  districts: number;
};

type SeedCountrySubdivisionResult = SeedCountrySubdivisionStats & {
  countryId: string;
  levelLabels: {
    level1Label: string;
    level2Label: string;
    level3Label: string | null;
    maxLevel: number;
  };
  admin1ByCode: Map<string, string>;
  admin2ByCountryCode: Map<string, string[]>;
  admin2ByAdmin1AndCode: Map<string, string>;
  admin2ByAdmin1AndName: Map<string, string>;
  admin3ByCountryCode: Map<string, string[]>;
  admin3ByAdmin2AndCode: Map<string, string[]>;
  admin3ByAdmin1Admin2AndCode: Map<string, string>;
  division1ByCode: Map<string, string>;
  division2ByCountryCode: Map<string, string[]>;
  division2ByAdmin1AndCode: Map<string, string>;
  division2ByAdmin1AndName: Map<string, string>;
  division3ByCountryCode: Map<string, string[]>;
  division3ByAdmin2AndCode: Map<string, string[]>;
  division3ByAdmin1Admin2AndCode: Map<string, string>;
};

function loadJson<T>(relativeFile: string): T {
  const absolutePath = path.join(process.cwd(), relativeFile);
  const raw = fs.readFileSync(absolutePath, "utf8");
  return JSON.parse(raw) as T;
}

function toKey(parts: Array<string | null | undefined>): string {
  return parts.map((part) => (part ?? "").trim()).join("|");
}

function normalizeCode(value: string | null | undefined): string | null {
  const normalized = (value ?? "").trim();
  return normalized.length ? normalized : null;
}

function normalizePostalCode(value: string | null | undefined): string | null {
  const normalized = (value ?? "").replace(/\s+/g, "").trim().toUpperCase();
  return normalized.length ? normalized : null;
}

function normalizePostalDataSource(
  value: string | null | undefined,
  isOperationalFallback: boolean | null | undefined
): "official" | "operational" {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "official" || normalized === "operational") {
    return normalized;
  }
  return isOperationalFallback ? "operational" : "official";
}

function addToMultiMap(map: Map<string, string[]>, key: string, value: string) {
  const list = map.get(key) ?? [];
  if (!list.includes(value)) {
    list.push(value);
    map.set(key, list);
  }
}

function normalizeNameKey(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeCountrySubdivisionSeed(seed: GuatemalaSeed): GeoCountrySubdivisionSeed {
  return {
    countryIso2: seed.countryIso2,
    countryIso3: seed.countryIso3,
    countryName: seed.countryName,
    admin1Label: "Departamento",
    admin2Label: "Municipio",
    maxLevel: 2,
    departments: seed.departments.map((department) => ({
      code: department.code,
      name: department.name,
      municipalities: department.municipalities.map((municipality) => ({
        code: municipality.code,
        name: municipality.name,
        districts: []
      }))
    }))
  };
}

function normalizeCountryLabels(seed: GeoCountrySubdivisionSeed) {
  const level1Label = seed.admin1Label?.trim() || "Nivel 1";
  const level2Label = seed.admin2Label?.trim() || "Nivel 2";
  const hasLevel3Data = seed.departments.some((department) =>
    department.municipalities.some((municipality) => Array.isArray(municipality.districts) && municipality.districts.length > 0)
  );
  const level3Label = seed.admin3Label?.trim() || (hasLevel3Data ? "Nivel 3" : null);
  const maxLevel = Number.isFinite(seed.maxLevel)
    ? Math.max(2, Math.min(4, Math.floor(seed.maxLevel!)))
    : level3Label
      ? 3
      : 2;

  return {
    level1Label,
    level2Label,
    level3Label,
    maxLevel
  };
}

async function upsertGeoAdmin1(
  prisma: PrismaClient,
  input: { countryId: string; code: string; name: string }
) {
  const byCode = await prisma.geoAdmin1.findUnique({
    where: {
      countryId_code: {
        countryId: input.countryId,
        code: input.code
      }
    },
    select: { id: true }
  });
  if (byCode) {
    return prisma.geoAdmin1.update({
      where: { id: byCode.id },
      data: {
        name: input.name,
        isActive: true
      }
    });
  }

  const byName = await prisma.geoAdmin1.findUnique({
    where: {
      countryId_name: {
        countryId: input.countryId,
        name: input.name
      }
    },
    select: { id: true }
  });
  if (byName) {
    return prisma.geoAdmin1.update({
      where: { id: byName.id },
      data: {
        code: input.code,
        name: input.name,
        isActive: true
      }
    });
  }

  return prisma.geoAdmin1.create({
    data: {
      countryId: input.countryId,
      code: input.code,
      name: input.name,
      isActive: true
    }
  });
}

async function upsertGeoAdmin2(
  prisma: PrismaClient,
  input: { admin1Id: string; code: string; name: string }
) {
  const byCode = await prisma.geoAdmin2.findUnique({
    where: {
      admin1Id_code: {
        admin1Id: input.admin1Id,
        code: input.code
      }
    },
    select: { id: true }
  });
  if (byCode) {
    return prisma.geoAdmin2.update({
      where: { id: byCode.id },
      data: {
        name: input.name,
        isActive: true
      }
    });
  }

  const byName = await prisma.geoAdmin2.findUnique({
    where: {
      admin1Id_name: {
        admin1Id: input.admin1Id,
        name: input.name
      }
    },
    select: { id: true }
  });
  if (byName) {
    return prisma.geoAdmin2.update({
      where: { id: byName.id },
      data: {
        code: input.code,
        name: input.name,
        isActive: true
      }
    });
  }

  return prisma.geoAdmin2.create({
    data: {
      admin1Id: input.admin1Id,
      code: input.code,
      name: input.name,
      isActive: true
    }
  });
}

async function upsertGeoAdmin3(
  prisma: PrismaClient,
  input: { admin2Id: string; code: string; name: string }
) {
  const byCode = await prisma.geoAdmin3.findUnique({
    where: {
      admin2Id_code: {
        admin2Id: input.admin2Id,
        code: input.code
      }
    },
    select: { id: true }
  });
  if (byCode) {
    return prisma.geoAdmin3.update({
      where: { id: byCode.id },
      data: {
        name: input.name,
        isActive: true
      }
    });
  }

  const byName = await prisma.geoAdmin3.findUnique({
    where: {
      admin2Id_name: {
        admin2Id: input.admin2Id,
        name: input.name
      }
    },
    select: { id: true }
  });
  if (byName) {
    return prisma.geoAdmin3.update({
      where: { id: byName.id },
      data: {
        code: input.code,
        name: input.name,
        isActive: true
      }
    });
  }

  return prisma.geoAdmin3.create({
    data: {
      admin2Id: input.admin2Id,
      code: input.code,
      name: input.name,
      isActive: true
    }
  });
}

async function upsertGeoDivision(
  prisma: PrismaClient,
  input: {
    countryId: string;
    level: number;
    code: string;
    name: string;
    parentId: string | null;
    legacyGeoAdmin1Id?: string | null;
    legacyGeoAdmin2Id?: string | null;
    legacyGeoAdmin3Id?: string | null;
  }
) {
  const existing = await prisma.geoDivision.findFirst({
    where: {
      countryId: input.countryId,
      level: input.level,
      code: input.code,
      parentId: input.parentId
    },
    select: { id: true }
  });

  if (existing) {
    return prisma.geoDivision.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        legacyGeoAdmin1Id: input.legacyGeoAdmin1Id ?? null,
        legacyGeoAdmin2Id: input.legacyGeoAdmin2Id ?? null,
        legacyGeoAdmin3Id: input.legacyGeoAdmin3Id ?? null,
        isActive: true
      }
    });
  }

  return prisma.geoDivision.create({
    data: {
      countryId: input.countryId,
      level: input.level,
      code: input.code,
      name: input.name,
      parentId: input.parentId,
      legacyGeoAdmin1Id: input.legacyGeoAdmin1Id ?? null,
      legacyGeoAdmin2Id: input.legacyGeoAdmin2Id ?? null,
      legacyGeoAdmin3Id: input.legacyGeoAdmin3Id ?? null,
      isActive: true
    }
  });
}

async function seedCountrySubdivisions(
  prisma: PrismaClient,
  seed: GeoCountrySubdivisionSeed
): Promise<SeedCountrySubdivisionResult | null> {
  const countryIso2 = seed.countryIso2.trim().toUpperCase();
  if (!countryIso2) return null;

  const countryIso3 = seed.countryIso3?.trim().toUpperCase() || null;
  const countryName = seed.countryName?.trim() || null;

  const country = await prisma.geoCountry.upsert({
    where: { iso2: countryIso2 },
    update: {
      ...(countryIso3 ? { iso3: countryIso3 } : {}),
      ...(countryName ? { name: countryName } : {}),
      isActive: true
    },
    create: {
      iso2: countryIso2,
      iso3: countryIso3,
      name: countryName ?? countryIso2,
      isActive: true
    }
  });

  const labels = normalizeCountryLabels(seed);
  await prisma.geoCountryMeta.upsert({
    where: { countryId: country.id },
    update: {
      level1Label: labels.level1Label,
      level2Label: labels.level2Label,
      level3Label: labels.level3Label,
      maxLevel: labels.maxLevel
    },
    create: {
      countryId: country.id,
      level1Label: labels.level1Label,
      level2Label: labels.level2Label,
      level3Label: labels.level3Label,
      maxLevel: labels.maxLevel
    }
  });

  const activeAdmin1Codes = new Set<string>();
  const activeDivisionIds = new Set<string>();

  const admin1ByCode = new Map<string, string>();
  const admin2ByCountryCode = new Map<string, string[]>();
  const admin2ByAdmin1AndCode = new Map<string, string>();
  const admin2ByAdmin1AndName = new Map<string, string>();
  const admin3ByCountryCode = new Map<string, string[]>();
  const admin3ByAdmin2AndCode = new Map<string, string[]>();
  const admin3ByAdmin1Admin2AndCode = new Map<string, string>();

  const division1ByCode = new Map<string, string>();
  const division2ByCountryCode = new Map<string, string[]>();
  const division2ByAdmin1AndCode = new Map<string, string>();
  const division2ByAdmin1AndName = new Map<string, string>();
  const division3ByCountryCode = new Map<string, string[]>();
  const division3ByAdmin2AndCode = new Map<string, string[]>();
  const division3ByAdmin1Admin2AndCode = new Map<string, string>();

  let municipalityCount = 0;
  let districtCount = 0;

  for (const department of seed.departments) {
    const depCode = normalizeCode(department.code);
    if (!depCode) continue;

    activeAdmin1Codes.add(depCode);

    const admin1 = await upsertGeoAdmin1(prisma, {
      countryId: country.id,
      code: depCode,
      name: department.name.trim()
    });

    admin1ByCode.set(depCode, admin1.id);

    const division1 = await upsertGeoDivision(prisma, {
      countryId: country.id,
      level: 1,
      code: depCode,
      name: department.name.trim(),
      parentId: null,
      legacyGeoAdmin1Id: admin1.id
    });
    activeDivisionIds.add(division1.id);
    division1ByCode.set(depCode, division1.id);

    const activeAdmin2Codes = new Set<string>();

    for (const municipality of department.municipalities) {
      const muniCode = normalizeCode(municipality.code);
      if (!muniCode) continue;

      activeAdmin2Codes.add(muniCode);
      municipalityCount += 1;

      const admin2 = await upsertGeoAdmin2(prisma, {
        admin1Id: admin1.id,
        code: muniCode,
        name: municipality.name.trim()
      });

      addToMultiMap(admin2ByCountryCode, muniCode, admin2.id);
      admin2ByAdmin1AndCode.set(toKey([depCode, muniCode]), admin2.id);
      admin2ByAdmin1AndName.set(toKey([depCode, normalizeNameKey(municipality.name)]), admin2.id);

      const division2 = await upsertGeoDivision(prisma, {
        countryId: country.id,
        level: 2,
        code: muniCode,
        name: municipality.name.trim(),
        parentId: division1.id,
        legacyGeoAdmin1Id: admin1.id,
        legacyGeoAdmin2Id: admin2.id
      });
      activeDivisionIds.add(division2.id);
      addToMultiMap(division2ByCountryCode, muniCode, division2.id);
      division2ByAdmin1AndCode.set(toKey([depCode, muniCode]), division2.id);
      division2ByAdmin1AndName.set(toKey([depCode, normalizeNameKey(municipality.name)]), division2.id);

      const activeAdmin3Codes = new Set<string>();
      const districts = municipality.districts ?? [];

      for (const district of districts) {
        const districtCode = normalizeCode(district.code);
        if (!districtCode) continue;

        activeAdmin3Codes.add(districtCode);
        districtCount += 1;

        const admin3 = await upsertGeoAdmin3(prisma, {
          admin2Id: admin2.id,
          code: districtCode,
          name: district.name.trim()
        });

        addToMultiMap(admin3ByCountryCode, districtCode, admin3.id);
        addToMultiMap(admin3ByAdmin2AndCode, toKey([muniCode, districtCode]), admin3.id);
        admin3ByAdmin1Admin2AndCode.set(toKey([depCode, muniCode, districtCode]), admin3.id);

        const division3 = await upsertGeoDivision(prisma, {
          countryId: country.id,
          level: 3,
          code: districtCode,
          name: district.name.trim(),
          parentId: division2.id,
          legacyGeoAdmin1Id: admin1.id,
          legacyGeoAdmin2Id: admin2.id,
          legacyGeoAdmin3Id: admin3.id
        });
        activeDivisionIds.add(division3.id);
        addToMultiMap(division3ByCountryCode, districtCode, division3.id);
        addToMultiMap(division3ByAdmin2AndCode, toKey([muniCode, districtCode]), division3.id);
        division3ByAdmin1Admin2AndCode.set(toKey([depCode, muniCode, districtCode]), division3.id);
      }

      await prisma.geoAdmin3.updateMany({
        where: activeAdmin3Codes.size
          ? {
              admin2Id: admin2.id,
              code: { notIn: Array.from(activeAdmin3Codes) }
            }
          : {
              admin2Id: admin2.id
            },
        data: { isActive: false }
      });
    }

    await prisma.geoAdmin2.updateMany({
      where: activeAdmin2Codes.size
        ? {
            admin1Id: admin1.id,
            code: { notIn: Array.from(activeAdmin2Codes) }
          }
        : {
            admin1Id: admin1.id
          },
      data: { isActive: false }
    });
  }

  await prisma.geoAdmin1.updateMany({
    where: activeAdmin1Codes.size
      ? {
          countryId: country.id,
          code: { notIn: Array.from(activeAdmin1Codes) }
        }
      : {
          countryId: country.id
        },
    data: { isActive: false }
  });

  await prisma.geoAdmin2.updateMany({
    where: {
      admin1: {
        countryId: country.id,
        isActive: false
      }
    },
    data: { isActive: false }
  });

  await prisma.geoAdmin3.updateMany({
    where: {
      admin2: {
        admin1: {
          countryId: country.id,
          isActive: false
        }
      }
    },
    data: { isActive: false }
  });

  await prisma.geoDivision.updateMany({
    where: activeDivisionIds.size
      ? {
          countryId: country.id,
          id: { notIn: Array.from(activeDivisionIds) }
        }
      : {
          countryId: country.id
        },
    data: { isActive: false }
  });

  return {
    countryIso2,
    countryId: country.id,
    departments: activeAdmin1Codes.size,
    municipalities: municipalityCount,
    districts: districtCount,
    levelLabels: labels,
    admin1ByCode,
    admin2ByCountryCode,
    admin2ByAdmin1AndCode,
    admin2ByAdmin1AndName,
    admin3ByCountryCode,
    admin3ByAdmin2AndCode,
    admin3ByAdmin1Admin2AndCode,
    division1ByCode,
    division2ByCountryCode,
    division2ByAdmin1AndCode,
    division2ByAdmin1AndName,
    division3ByCountryCode,
    division3ByAdmin2AndCode,
    division3ByAdmin1Admin2AndCode
  };
}

function resolveAdmin2Id(
  countryResult: SeedCountrySubdivisionResult,
  admin1Code: string | null,
  admin2Code: string | null,
  label: string | null
): string | null {
  if (!admin2Code && !(admin1Code && label)) return null;

  if (admin1Code && admin2Code) {
    const byComposite = countryResult.admin2ByAdmin1AndCode.get(toKey([admin1Code, admin2Code]));
    if (byComposite) return byComposite;
  }

  if (admin2Code) {
    const byCode = countryResult.admin2ByCountryCode.get(admin2Code) ?? [];
    if (byCode.length === 1) return byCode[0];
  }

  if (admin1Code && label) {
    return countryResult.admin2ByAdmin1AndName.get(toKey([admin1Code, normalizeNameKey(label)])) ?? null;
  }

  return null;
}

function resolveAdmin3Id(
  countryResult: SeedCountrySubdivisionResult,
  admin1Code: string | null,
  admin2Code: string | null,
  admin3Code: string | null
): string | null {
  if (!admin3Code) return null;

  if (admin1Code && admin2Code) {
    const byComposite = countryResult.admin3ByAdmin1Admin2AndCode.get(toKey([admin1Code, admin2Code, admin3Code]));
    if (byComposite) return byComposite;
  }

  if (admin2Code) {
    const byAdmin2AndCode = countryResult.admin3ByAdmin2AndCode.get(toKey([admin2Code, admin3Code])) ?? [];
    if (byAdmin2AndCode.length === 1) return byAdmin2AndCode[0];
  }

  const byCode = countryResult.admin3ByCountryCode.get(admin3Code) ?? [];
  return byCode.length === 1 ? byCode[0] : null;
}

function resolveDivisionId(
  countryResult: SeedCountrySubdivisionResult,
  admin1Code: string | null,
  admin2Code: string | null,
  admin3Code: string | null,
  label: string | null
): string | null {
  if (admin3Code) {
    if (admin1Code && admin2Code) {
      const byComposite = countryResult.division3ByAdmin1Admin2AndCode.get(toKey([admin1Code, admin2Code, admin3Code]));
      if (byComposite) return byComposite;
    }

    if (admin2Code) {
      const byAdmin2AndCode = countryResult.division3ByAdmin2AndCode.get(toKey([admin2Code, admin3Code])) ?? [];
      if (byAdmin2AndCode.length === 1) return byAdmin2AndCode[0];
    }

    const byCode = countryResult.division3ByCountryCode.get(admin3Code) ?? [];
    if (byCode.length === 1) return byCode[0];
  }

  if (admin2Code) {
    if (admin1Code) {
      const byComposite = countryResult.division2ByAdmin1AndCode.get(toKey([admin1Code, admin2Code]));
      if (byComposite) return byComposite;
    }

    const byCode = countryResult.division2ByCountryCode.get(admin2Code) ?? [];
    if (byCode.length === 1) return byCode[0];
  }

  if (admin1Code && label) {
    const byName = countryResult.division2ByAdmin1AndName.get(toKey([admin1Code, normalizeNameKey(label)]));
    if (byName) return byName;
  }

  if (admin1Code) {
    return countryResult.division1ByCode.get(admin1Code) ?? null;
  }

  return null;
}

async function seedGeoPostalCodes(
  prisma: PrismaClient,
  postalSeed: GeoPostalCodeSeedFile,
  countryResults: SeedCountrySubdivisionResult[]
): Promise<{ rows: number; byCountry: Record<string, number> }> {
  const rowsByCountry = new Map<string, GeoPostalCodeSeed[]>();
  for (const row of postalSeed.postalCodes) {
    const iso2 = row.countryIso2.trim().toUpperCase();
    if (!iso2) continue;
    const rows = rowsByCountry.get(iso2) ?? [];
    rows.push(row);
    rowsByCountry.set(iso2, rows);
  }

  const countryByIso2 = new Map(countryResults.map((entry) => [entry.countryIso2, entry]));

  let totalRows = 0;
  const byCountry: Record<string, number> = {};

  for (const [iso2, countryResult] of countryByIso2) {
    await prisma.geoPostalCode.deleteMany({ where: { countryId: countryResult.countryId } });

    const countryRows = rowsByCountry.get(iso2) ?? [];
    if (!countryRows.length) {
      byCountry[iso2] = 0;
      continue;
    }

    const payload: Array<{
      countryId: string;
      postalCode: string;
      divisionId: string | null;
      admin1Id: string | null;
      admin2Id: string | null;
      admin3Id: string | null;
      label: string | null;
      dataSource: "official" | "operational";
      isActive: boolean;
    }> = [];

    const dedupe = new Set<string>();

    for (const row of countryRows) {
      const postalCode = normalizePostalCode(row.postalCode);
      if (!postalCode) continue;

      const admin1Code = normalizeCode(row.admin1Code);
      const admin2Code = normalizeCode(row.admin2Code);
      const admin3Code = normalizeCode(row.admin3Code);

      const admin1Id = admin1Code ? (countryResult.admin1ByCode.get(admin1Code) ?? null) : null;
      const admin2Id = resolveAdmin2Id(countryResult, admin1Code, admin2Code, row.label ?? null);
      const admin3Id = resolveAdmin3Id(countryResult, admin1Code, admin2Code, admin3Code);
      const divisionId = resolveDivisionId(countryResult, admin1Code, admin2Code, admin3Code, row.label ?? null);
      const dataSource = normalizePostalDataSource(row.dataSource, row.isOperational);

      const dedupeKey = toKey([
        postalCode,
        divisionId,
        admin1Id,
        admin2Id,
        admin3Id,
        row.label?.trim() ?? null,
        dataSource
      ]);
      if (dedupe.has(dedupeKey)) continue;
      dedupe.add(dedupeKey);

      payload.push({
        countryId: countryResult.countryId,
        postalCode,
        divisionId,
        admin1Id,
        admin2Id,
        admin3Id,
        label: row.label?.trim() || null,
        dataSource,
        isActive: true
      });
    }

    const chunkSize = 1000;
    for (let index = 0; index < payload.length; index += chunkSize) {
      await prisma.geoPostalCode.createMany({ data: payload.slice(index, index + chunkSize) });
    }

    totalRows += payload.length;
    byCountry[iso2] = payload.length;
  }

  return {
    rows: totalRows,
    byCountry
  };
}

export async function seedGeoCatalogs(prisma: PrismaClient) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Geo reseed blocked in production.");
  }

  const countries = loadJson<CountrySeed[]>("prisma/seeds/geo-countries.json");
  const guatemala = loadJson<GuatemalaSeed>("prisma/seeds/geo-guatemala.json");
  const centralAmerica = loadJson<GeoCountrySubdivisionSeedFile>("prisma/seeds/geo-central-america-admin.json");
  const globalExtra = loadJson<GeoCountrySubdivisionSeedFile>("prisma/seeds/geo-global-admin-extra.json");
  const postalCodes = loadJson<GeoPostalCodeSeedFile>("prisma/seeds/geo-postal-codes.json");

  if (!countries.length) {
    console.warn("[seed:geo] countries seed is empty. Skipping.");
    return;
  }

  const activeCountryIso2 = new Set<string>();

  for (const country of countries) {
    const iso2 = country.iso2.trim().toUpperCase();
    if (!iso2) continue;

    activeCountryIso2.add(iso2);

    await prisma.geoCountry.upsert({
      where: { iso2 },
      update: {
        iso3: country.iso3?.trim().toUpperCase() || null,
        name: country.name.trim(),
        isActive: true
      },
      create: {
        iso2,
        iso3: country.iso3?.trim().toUpperCase() || null,
        name: country.name.trim(),
        isActive: true
      }
    });
  }

  await prisma.geoCountry.updateMany({
    where: { iso2: { notIn: Array.from(activeCountryIso2) } },
    data: { isActive: false }
  });

  const seedsToApply: GeoCountrySubdivisionSeed[] = [
    normalizeCountrySubdivisionSeed(guatemala),
    ...centralAmerica.countries,
    ...globalExtra.countries
  ];

  const seededStats: SeedCountrySubdivisionResult[] = [];
  for (const countrySeed of seedsToApply) {
    const stats = await seedCountrySubdivisions(prisma, countrySeed);
    if (stats) seededStats.push(stats);
  }

  const postalStats = await seedGeoPostalCodes(prisma, postalCodes, seededStats);

  const countriesSummary = seededStats
    .map((entry) => `${entry.countryIso2}:${entry.departments}/${entry.municipalities}/${entry.districts}`)
    .join(", ");

  const postalSummary = Object.entries(postalStats.byCountry)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([iso2, count]) => `${iso2}:${count}`)
    .join(", ");

  console.info(
    `[seed:geo] countries=${activeCountryIso2.size} admin=${countriesSummary} postal_rows=${postalStats.rows} postal=${postalSummary}`
  );
}
