import { PrismaClient, GeoDivisionDataSource } from "@prisma/client";

type CountryLabels = {
  admin1Label: string;
  admin2Label: string;
  admin3Label: string | null;
  maxLevel: number;
};

type CountryInfoRow = {
  iso2: string;
  iso3: string | null;
  name: string;
  callingCode: string | null;
};

type Admin1Row = {
  iso2: string;
  admin1Code: string;
  name: string;
};

type Admin2Row = {
  iso2: string;
  admin1Code: string;
  admin2Code: string;
  name: string;
};

type MutableCountryStats = {
  admin1Created: number;
  admin1Updated: number;
  admin1Skipped: number;
  admin2Created: number;
  admin2Updated: number;
  admin2Skipped: number;
  admin2SkippedMissingParent: number;
};

type CountryResult = {
  iso2: string;
  countryCreated: boolean;
  countryUpdated: boolean;
  callingCode: string | null;
  admin1: {
    created: number;
    updated: number;
    skipped: number;
  };
  admin2: {
    created: number;
    updated: number;
    skipped: number;
    skippedMissingParent: number;
  };
};

export type RunImportGeoNamesConfig = {
  targetIso2?: readonly string[];
  requiredCallingCodes?: Record<string, string>;
  countryNames?: Record<string, string>;
  countryLabels?: Record<string, CountryLabels>;
};

const GEO_URLS = {
  countryInfo: "https://download.geonames.org/export/dump/countryInfo.txt",
  admin1: "https://download.geonames.org/export/dump/admin1CodesASCII.txt",
  admin2: "https://download.geonames.org/export/dump/admin2Codes.txt"
} as const;

export const TARGET_ISO2 = [
  "US",
  "CA",
  "MX",
  "BZ",
  "GT",
  "SV",
  "HN",
  "NI",
  "CR",
  "PA",
  "CU",
  "DO",
  "HT",
  "JM",
  "PR",
  "TT",
  "CO",
  "EC",
  "PE",
  "BR",
  "AR",
  "PY",
  "UY",
  "BO",
  "CL",
  "VE",
  "GY",
  "SR",
  "GF"
] as const;

const TARGET_SET = new Set<string>(TARGET_ISO2);

const REQUIRED_CALLING_CODES: Record<string, string> = {
  US: "+1",
  CA: "+1",
  MX: "+52",
  BZ: "+501",
  GT: "+502",
  SV: "+503",
  HN: "+504",
  NI: "+505",
  CR: "+506",
  PA: "+507",
  CU: "+53",
  DO: "+1",
  HT: "+509",
  JM: "+1",
  PR: "+1",
  TT: "+1",
  CO: "+57",
  EC: "+593",
  PE: "+51",
  BR: "+55",
  AR: "+54",
  PY: "+595",
  UY: "+598",
  BO: "+591",
  CL: "+56",
  VE: "+58",
  GY: "+592",
  SR: "+597",
  GF: "+594"
};

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  CA: "Canada",
  MX: "Mexico",
  BZ: "Belize",
  GT: "Guatemala",
  SV: "El Salvador",
  HN: "Honduras",
  NI: "Nicaragua",
  CR: "Costa Rica",
  PA: "Panama",
  CU: "Cuba",
  DO: "Dominican Republic",
  HT: "Haiti",
  JM: "Jamaica",
  PR: "Puerto Rico",
  TT: "Trinidad and Tobago",
  CO: "Colombia",
  EC: "Ecuador",
  PE: "Peru",
  BR: "Brazil",
  AR: "Argentina",
  PY: "Paraguay",
  UY: "Uruguay",
  BO: "Bolivia",
  CL: "Chile",
  VE: "Venezuela",
  GY: "Guyana",
  SR: "Suriname",
  GF: "French Guiana"
};

const COUNTRY_LABELS: Record<string, CountryLabels> = {
  US: { admin1Label: "State", admin2Label: "County", admin3Label: "City", maxLevel: 3 },
  CA: { admin1Label: "Provincia/Territorio", admin2Label: "Municipio/Condado", admin3Label: null, maxLevel: 2 },
  MX: { admin1Label: "Estado", admin2Label: "Municipio", admin3Label: "Localidad", maxLevel: 3 },
  BZ: { admin1Label: "Distrito", admin2Label: "Ciudad/Pueblo", admin3Label: null, maxLevel: 2 },
  GT: { admin1Label: "Departamento", admin2Label: "Municipio", admin3Label: null, maxLevel: 2 },
  SV: { admin1Label: "Departamento", admin2Label: "Municipio", admin3Label: null, maxLevel: 2 },
  HN: { admin1Label: "Departamento", admin2Label: "Municipio", admin3Label: null, maxLevel: 2 },
  NI: { admin1Label: "Departamento / Región", admin2Label: "Municipio", admin3Label: null, maxLevel: 2 },
  CR: { admin1Label: "Provincia", admin2Label: "Cantón", admin3Label: "Distrito", maxLevel: 3 },
  PA: { admin1Label: "Provincia / Comarca", admin2Label: "Distrito", admin3Label: "Corregimiento", maxLevel: 3 },
  CU: { admin1Label: "Provincia", admin2Label: "Municipio", admin3Label: null, maxLevel: 2 },
  DO: { admin1Label: "Provincia", admin2Label: "Municipio", admin3Label: "Distrito municipal", maxLevel: 3 },
  HT: { admin1Label: "Departamento", admin2Label: "Arrondissement", admin3Label: "Comuna", maxLevel: 3 },
  JM: { admin1Label: "Parish", admin2Label: "Municipio", admin3Label: null, maxLevel: 2 },
  PR: { admin1Label: "Municipio", admin2Label: "Barrio", admin3Label: null, maxLevel: 2 },
  TT: { admin1Label: "Región/Borough", admin2Label: "Municipio", admin3Label: null, maxLevel: 2 },
  CO: { admin1Label: "Departamento", admin2Label: "Municipio", admin3Label: null, maxLevel: 2 },
  EC: { admin1Label: "Provincia", admin2Label: "Cantón", admin3Label: "Parroquia", maxLevel: 3 },
  PE: { admin1Label: "Departamento / Región", admin2Label: "Provincia", admin3Label: "Distrito", maxLevel: 3 },
  BR: { admin1Label: "Estado", admin2Label: "Município", admin3Label: null, maxLevel: 2 },
  AR: { admin1Label: "Provincia", admin2Label: "Departamento/Partido", admin3Label: "Localidad", maxLevel: 3 },
  PY: { admin1Label: "Departamento", admin2Label: "Distrito", admin3Label: null, maxLevel: 2 },
  UY: { admin1Label: "Departamento", admin2Label: "Ciudad", admin3Label: null, maxLevel: 2 },
  BO: { admin1Label: "Departamento", admin2Label: "Municipio", admin3Label: null, maxLevel: 2 },
  CL: { admin1Label: "Región", admin2Label: "Provincia", admin3Label: "Comuna", maxLevel: 3 },
  VE: { admin1Label: "Estado", admin2Label: "Municipio", admin3Label: "Parroquia", maxLevel: 3 },
  GY: { admin1Label: "Región", admin2Label: "—", admin3Label: null, maxLevel: 1 },
  SR: { admin1Label: "Distrito", admin2Label: "—", admin3Label: null, maxLevel: 1 },
  GF: { admin1Label: "Departamento", admin2Label: "Comuna", admin3Label: null, maxLevel: 2 }
};

const DEFAULT_COUNTRY_LABELS: CountryLabels = {
  admin1Label: "Región / Estado",
  admin2Label: "Provincia / Condado",
  admin3Label: "Ciudad / Municipio",
  maxLevel: 3
};

function normalizeIso2(input: string | null | undefined): string {
  return (input ?? "").trim().toUpperCase();
}

function normalizeName(input: string | null | undefined): string {
  return (input ?? "").trim();
}

function normalizeNameKey(input: string | null | undefined): string {
  return normalizeName(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function normalizeCallingCode(raw: string | null | undefined): string | null {
  const source = (raw ?? "").trim();
  if (!source) return null;

  const firstChunk = source
    .split(/,|;|\band\b/i)[0]
    ?.trim()
    .split(/\s+/)[0]
    ?.trim();
  if (!firstChunk) return null;

  const trunk = firstChunk.includes("-") ? firstChunk.split("-")[0] : firstChunk;
  const digits = trunk.replace(/[^0-9]/g, "");
  if (!digits) return null;
  return `+${digits}`;
}

async function downloadText(url: string): Promise<string> {
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(`No se pudo descargar ${url}. status=${response.status}`);
  }
  return await response.text();
}

export function parseCountryInfo(
  input: string,
  options?: { targetSet?: Set<string>; requiredCallingCodes?: Record<string, string> }
): CountryInfoRow[] {
  const targetSet = options?.targetSet ?? TARGET_SET;
  const requiredCallingCodes = options?.requiredCallingCodes ?? REQUIRED_CALLING_CODES;
  const rows: CountryInfoRow[] = [];
  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const cols = rawLine.split("\t");
    if (cols.length < 13) continue;

    const iso2 = normalizeIso2(cols[0]);
    if (!targetSet.has(iso2)) continue;

    const requiredCallingCode = requiredCallingCodes[iso2] || null;
    const parsedCallingCode = normalizeCallingCode(cols[12]);

    rows.push({
      iso2,
      iso3: normalizeIso2(cols[1]) || null,
      name: normalizeName(cols[4]) || iso2,
      callingCode:
        (requiredCallingCode === "+1" ? requiredCallingCode : parsedCallingCode) ||
        requiredCallingCode ||
        null
    });
  }
  return rows;
}

export function parseAdmin1Codes(input: string, targetSet: Set<string> = TARGET_SET): Admin1Row[] {
  const rows: Admin1Row[] = [];
  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const cols = rawLine.split("\t");
    if (cols.length < 2) continue;

    const parts = cols[0].split(".");
    if (parts.length < 2) continue;

    const iso2 = normalizeIso2(parts[0]);
    if (!targetSet.has(iso2)) continue;

    const admin1Code = parts.slice(1).join(".").trim();
    const name = normalizeName(cols[1]);
    if (!admin1Code || !name) continue;

    rows.push({ iso2, admin1Code, name });
  }
  return rows;
}

export function parseAdmin2Codes(input: string, targetSet: Set<string> = TARGET_SET): Admin2Row[] {
  const rows: Admin2Row[] = [];
  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const cols = rawLine.split("\t");
    if (cols.length < 2) continue;

    const parts = cols[0].split(".");
    if (parts.length < 3) continue;

    const iso2 = normalizeIso2(parts[0]);
    if (!targetSet.has(iso2)) continue;

    const admin1Code = parts[1]?.trim() ?? "";
    const admin2Code = parts.slice(2).join(".").trim();
    const name = normalizeName(cols[1]);
    if (!admin1Code || !admin2Code || !name) continue;

    rows.push({ iso2, admin1Code, admin2Code, name });
  }
  return rows;
}

async function upsertCountryBase(params: {
  prisma: PrismaClient;
  row: CountryInfoRow;
  labels: CountryLabels;
  requiredCallingCodes?: Record<string, string>;
}) {
  const desiredCallingCode =
    params.row.callingCode || params.requiredCallingCodes?.[params.row.iso2] || REQUIRED_CALLING_CODES[params.row.iso2] || null;
  const existing = await params.prisma.geoCountry.findUnique({
    where: { iso2: params.row.iso2 },
    select: {
      id: true,
      iso3: true,
      name: true,
      callingCode: true,
      admin1Label: true,
      admin2Label: true,
      admin3Label: true,
      adminMaxLevel: true
    }
  });

  if (!existing) {
    const created = await params.prisma.geoCountry.create({
      data: {
        iso2: params.row.iso2,
        iso3: params.row.iso3,
        name: params.row.name,
        callingCode: desiredCallingCode,
        admin1Label: params.labels.admin1Label,
        admin2Label: params.labels.admin2Label,
        admin3Label: params.labels.admin3Label,
        adminMaxLevel: params.labels.maxLevel,
        isActive: true
      },
      select: { id: true }
    });

    await params.prisma.geoCountryMeta.upsert({
      where: { countryId: created.id },
      update: {
        level1Label: params.labels.admin1Label,
        level2Label: params.labels.admin2Label,
        level3Label: params.labels.admin3Label,
        maxLevel: params.labels.maxLevel
      },
      create: {
        countryId: created.id,
        level1Label: params.labels.admin1Label,
        level2Label: params.labels.admin2Label,
        level3Label: params.labels.admin3Label,
        maxLevel: params.labels.maxLevel
      }
    });

    return { countryId: created.id, created: true, updated: false };
  }

  const update: {
    iso3?: string | null;
    name?: string;
    callingCode?: string | null;
    admin1Label?: string;
    admin2Label?: string;
    admin3Label?: string | null;
    adminMaxLevel?: number;
    isActive: boolean;
  } = {
    isActive: true
  };

  if (!normalizeName(existing.name) && normalizeName(params.row.name)) update.name = params.row.name;
  if (!existing.iso3 && params.row.iso3) update.iso3 = params.row.iso3;
  if ((existing.callingCode ?? null) !== desiredCallingCode) update.callingCode = desiredCallingCode;
  if ((existing.admin1Label ?? null) !== params.labels.admin1Label) update.admin1Label = params.labels.admin1Label;
  if ((existing.admin2Label ?? null) !== params.labels.admin2Label) update.admin2Label = params.labels.admin2Label;
  if ((existing.admin3Label ?? null) !== params.labels.admin3Label) update.admin3Label = params.labels.admin3Label;
  if (existing.adminMaxLevel !== params.labels.maxLevel) update.adminMaxLevel = params.labels.maxLevel;

  const updateKeys = Object.keys(update);
  if (updateKeys.length > 1) {
    await params.prisma.geoCountry.update({ where: { id: existing.id }, data: update });
  } else {
    await params.prisma.geoCountry.update({ where: { id: existing.id }, data: { isActive: true } });
  }

  const meta = await params.prisma.geoCountryMeta.findUnique({
    where: { countryId: existing.id },
    select: {
      id: true,
      level1Label: true,
      level2Label: true,
      level3Label: true,
      maxLevel: true
    }
  });

  if (!meta) {
    await params.prisma.geoCountryMeta.create({
      data: {
        countryId: existing.id,
        level1Label: params.labels.admin1Label,
        level2Label: params.labels.admin2Label,
        level3Label: params.labels.admin3Label,
        maxLevel: params.labels.maxLevel
      }
    });
  } else {
    const metaUpdate: {
      level1Label?: string;
      level2Label?: string;
      level3Label?: string | null;
      maxLevel?: number;
    } = {};

    if (meta.level1Label !== params.labels.admin1Label) metaUpdate.level1Label = params.labels.admin1Label;
    if (meta.level2Label !== params.labels.admin2Label) metaUpdate.level2Label = params.labels.admin2Label;
    if ((meta.level3Label ?? null) !== params.labels.admin3Label) metaUpdate.level3Label = params.labels.admin3Label;
    if (meta.maxLevel !== params.labels.maxLevel) metaUpdate.maxLevel = params.labels.maxLevel;

    if (Object.keys(metaUpdate).length) {
      await params.prisma.geoCountryMeta.update({ where: { id: meta.id }, data: metaUpdate });
    }
  }

  return { countryId: existing.id, created: false, updated: updateKeys.length > 1 };
}

async function upsertCountryDivisions(params: {
  prisma: PrismaClient;
  countryId: string;
  admin1Rows: Admin1Row[];
  admin2Rows: Admin2Row[];
  stats: MutableCountryStats;
}) {
  const existingAdmin1 = await params.prisma.geoAdmin1.findMany({
    where: { countryId: params.countryId },
    select: { id: true, code: true, name: true }
  });

  const admin1ByCode = new Map(existingAdmin1.map((row) => [row.code.trim().toUpperCase(), row]));
  const admin1ByName = new Map(existingAdmin1.map((row) => [normalizeNameKey(row.name), row]));

  const existingDivLevel1 = await params.prisma.geoDivision.findMany({
    where: { countryId: params.countryId, level: 1 },
    select: { id: true, code: true, name: true, legacyGeoAdmin1Id: true }
  });

  const div1ByCode = new Map(existingDivLevel1.map((row) => [row.code.trim().toUpperCase(), row]));
  const div1ByName = new Map(existingDivLevel1.map((row) => [normalizeNameKey(row.name), row]));

  const level1Context = new Map<string, { legacyAdmin1Id: string; division1Id: string }>();

  for (const row of params.admin1Rows) {
    const codeKey = row.admin1Code.trim().toUpperCase();
    const nameKey = normalizeNameKey(row.name);

    let legacyAdmin1 = admin1ByCode.get(codeKey) ?? admin1ByName.get(nameKey) ?? null;
    if (!legacyAdmin1) {
      legacyAdmin1 = await params.prisma.geoAdmin1.create({
        data: {
          countryId: params.countryId,
          code: row.admin1Code,
          name: row.name,
          isActive: true
        },
        select: { id: true, code: true, name: true }
      });
      params.stats.admin1Created += 1;
      admin1ByCode.set(codeKey, legacyAdmin1);
      admin1ByName.set(nameKey, legacyAdmin1);
    } else {
      const updateData: { code?: string; name?: string; isActive: boolean } = { isActive: true };
      if (!normalizeName(legacyAdmin1.code)) updateData.code = row.admin1Code;
      if (!normalizeName(legacyAdmin1.name)) updateData.name = row.name;
      await params.prisma.geoAdmin1.update({ where: { id: legacyAdmin1.id }, data: updateData });
      params.stats.admin1Updated += 1;
      legacyAdmin1 = {
        ...legacyAdmin1,
        code: updateData.code ?? legacyAdmin1.code,
        name: updateData.name ?? legacyAdmin1.name
      };
      admin1ByCode.set(codeKey, legacyAdmin1);
      admin1ByName.set(nameKey, legacyAdmin1);
    }

    let division1 = div1ByCode.get(codeKey) ?? div1ByName.get(nameKey) ?? null;
    if (!division1) {
      division1 = await params.prisma.geoDivision.create({
        data: {
          countryId: params.countryId,
          level: 1,
          code: row.admin1Code,
          name: row.name,
          parentId: null,
          legacyGeoAdmin1Id: legacyAdmin1.id,
          dataSource: GeoDivisionDataSource.official,
          isActive: true
        },
        select: { id: true, code: true, name: true, legacyGeoAdmin1Id: true }
      });
    } else {
      const updateData: {
        name?: string;
        legacyGeoAdmin1Id?: string;
        isActive: boolean;
      } = { isActive: true };
      if (!normalizeName(division1.name)) updateData.name = row.name;
      if (!division1.legacyGeoAdmin1Id) updateData.legacyGeoAdmin1Id = legacyAdmin1.id;
      await params.prisma.geoDivision.update({ where: { id: division1.id }, data: updateData });
      division1 = {
        ...division1,
        name: updateData.name ?? division1.name,
        legacyGeoAdmin1Id: updateData.legacyGeoAdmin1Id ?? division1.legacyGeoAdmin1Id
      };
    }

    div1ByCode.set(codeKey, division1);
    div1ByName.set(nameKey, division1);
    level1Context.set(codeKey, { legacyAdmin1Id: legacyAdmin1.id, division1Id: division1.id });
  }

  const existingAdmin2 = await params.prisma.geoAdmin2.findMany({
    where: { admin1: { countryId: params.countryId } },
    select: {
      id: true,
      admin1Id: true,
      code: true,
      name: true
    }
  });
  const admin2ByKey = new Map(existingAdmin2.map((row) => [`${row.admin1Id}|${row.code.trim().toUpperCase()}`, row]));
  const admin2ByName = new Map(existingAdmin2.map((row) => [`${row.admin1Id}|${normalizeNameKey(row.name)}`, row]));

  const existingDivLevel2 = await params.prisma.geoDivision.findMany({
    where: { countryId: params.countryId, level: 2 },
    select: {
      id: true,
      parentId: true,
      code: true,
      name: true,
      legacyGeoAdmin1Id: true,
      legacyGeoAdmin2Id: true
    }
  });
  const div2ByKey = new Map(existingDivLevel2.map((row) => [`${row.parentId ?? ""}|${row.code.trim().toUpperCase()}`, row]));
  const div2ByName = new Map(existingDivLevel2.map((row) => [`${row.parentId ?? ""}|${normalizeNameKey(row.name)}`, row]));

  for (const row of params.admin2Rows) {
    const parent = level1Context.get(row.admin1Code.trim().toUpperCase());
    if (!parent) {
      params.stats.admin2SkippedMissingParent += 1;
      continue;
    }

    const admin2CodeKey = `${parent.legacyAdmin1Id}|${row.admin2Code.trim().toUpperCase()}`;
    const admin2NameKey = `${parent.legacyAdmin1Id}|${normalizeNameKey(row.name)}`;
    let legacyAdmin2 = admin2ByKey.get(admin2CodeKey) ?? admin2ByName.get(admin2NameKey) ?? null;

    if (!legacyAdmin2) {
      legacyAdmin2 = await params.prisma.geoAdmin2.create({
        data: {
          admin1Id: parent.legacyAdmin1Id,
          code: row.admin2Code,
          name: row.name,
          isActive: true
        },
        select: { id: true, admin1Id: true, code: true, name: true }
      });
      params.stats.admin2Created += 1;
      admin2ByKey.set(admin2CodeKey, legacyAdmin2);
      admin2ByName.set(admin2NameKey, legacyAdmin2);
    } else {
      const updateData: { code?: string; name?: string; isActive: boolean } = { isActive: true };
      if (!normalizeName(legacyAdmin2.code)) updateData.code = row.admin2Code;
      if (!normalizeName(legacyAdmin2.name)) updateData.name = row.name;
      await params.prisma.geoAdmin2.update({ where: { id: legacyAdmin2.id }, data: updateData });
      params.stats.admin2Updated += 1;
      legacyAdmin2 = {
        ...legacyAdmin2,
        code: updateData.code ?? legacyAdmin2.code,
        name: updateData.name ?? legacyAdmin2.name
      };
      admin2ByKey.set(admin2CodeKey, legacyAdmin2);
      admin2ByName.set(admin2NameKey, legacyAdmin2);
    }

    const div2CodeKey = `${parent.division1Id}|${row.admin2Code.trim().toUpperCase()}`;
    const div2NameKey = `${parent.division1Id}|${normalizeNameKey(row.name)}`;
    let division2 = div2ByKey.get(div2CodeKey) ?? div2ByName.get(div2NameKey) ?? null;

    if (!division2) {
      division2 = await params.prisma.geoDivision.create({
        data: {
          countryId: params.countryId,
          level: 2,
          code: row.admin2Code,
          name: row.name,
          parentId: parent.division1Id,
          legacyGeoAdmin1Id: parent.legacyAdmin1Id,
          legacyGeoAdmin2Id: legacyAdmin2.id,
          dataSource: GeoDivisionDataSource.official,
          isActive: true
        },
        select: {
          id: true,
          parentId: true,
          code: true,
          name: true,
          legacyGeoAdmin1Id: true,
          legacyGeoAdmin2Id: true
        }
      });
    } else {
      const updateData: {
        name?: string;
        legacyGeoAdmin1Id?: string;
        legacyGeoAdmin2Id?: string;
        isActive: boolean;
      } = { isActive: true };
      if (!normalizeName(division2.name)) updateData.name = row.name;
      if (!division2.legacyGeoAdmin1Id) updateData.legacyGeoAdmin1Id = parent.legacyAdmin1Id;
      if (!division2.legacyGeoAdmin2Id) updateData.legacyGeoAdmin2Id = legacyAdmin2.id;
      await params.prisma.geoDivision.update({ where: { id: division2.id }, data: updateData });
      division2 = {
        ...division2,
        name: updateData.name ?? division2.name,
        legacyGeoAdmin1Id: updateData.legacyGeoAdmin1Id ?? division2.legacyGeoAdmin1Id,
        legacyGeoAdmin2Id: updateData.legacyGeoAdmin2Id ?? division2.legacyGeoAdmin2Id
      };
    }

    div2ByKey.set(div2CodeKey, division2);
    div2ByName.set(div2NameKey, division2);
  }

  for (const row of params.admin1Rows) {
    const codeKey = row.admin1Code.trim().toUpperCase();
    if (!level1Context.has(codeKey)) params.stats.admin1Skipped += 1;
  }

  for (const row of params.admin2Rows) {
    const parent = level1Context.get(row.admin1Code.trim().toUpperCase());
    if (!parent) {
      params.stats.admin2Skipped += 1;
      continue;
    }

    const key = `${parent.legacyAdmin1Id}|${row.admin2Code.trim().toUpperCase()}`;
    if (!admin2ByKey.has(key)) params.stats.admin2Skipped += 1;
  }
}

export async function runImportGeoNames(config?: RunImportGeoNamesConfig) {
  const prisma = new PrismaClient();

  try {
    const targetIso2 = config?.targetIso2?.length ? [...config.targetIso2] : [...TARGET_ISO2];
    const targetSet = new Set<string>(targetIso2.map((iso2) => normalizeIso2(iso2)));
    const requiredCallingCodes: Record<string, string> = {
      ...REQUIRED_CALLING_CODES,
      ...(config?.requiredCallingCodes ?? {})
    };
    const countryNames: Record<string, string> = {
      ...COUNTRY_NAMES,
      ...(config?.countryNames ?? {})
    };
    const countryLabels: Record<string, CountryLabels> = {
      ...COUNTRY_LABELS,
      ...(config?.countryLabels ?? {})
    };

    const [countryInfoText, admin1Text, admin2Text] = await Promise.all([
      downloadText(GEO_URLS.countryInfo),
      downloadText(GEO_URLS.admin1),
      downloadText(GEO_URLS.admin2)
    ]);

    const countryRows = parseCountryInfo(countryInfoText, {
      targetSet,
      requiredCallingCodes
    });
    const admin1Rows = parseAdmin1Codes(admin1Text, targetSet);
    const admin2Rows = parseAdmin2Codes(admin2Text, targetSet);

    const countryByIso2 = new Map(countryRows.map((row) => [row.iso2, row]));

    const results: CountryResult[] = [];

    for (const iso2 of targetIso2) {
      const labels = countryLabels[iso2] ?? DEFAULT_COUNTRY_LABELS;

      const info = countryByIso2.get(iso2) ?? {
        iso2,
        iso3: null,
        name: countryNames[iso2] ?? iso2,
        callingCode: requiredCallingCodes[iso2] ?? null
      };

      const upsertResult = await upsertCountryBase({
        prisma,
        row: info,
        labels,
        requiredCallingCodes
      });

      const stats: MutableCountryStats = {
        admin1Created: 0,
        admin1Updated: 0,
        admin1Skipped: 0,
        admin2Created: 0,
        admin2Updated: 0,
        admin2Skipped: 0,
        admin2SkippedMissingParent: 0
      };

      await upsertCountryDivisions({
        prisma,
        countryId: upsertResult.countryId,
        admin1Rows: admin1Rows.filter((row) => row.iso2 === iso2),
        admin2Rows: admin2Rows.filter((row) => row.iso2 === iso2),
        stats
      });

      results.push({
        iso2,
        countryCreated: upsertResult.created,
        countryUpdated: upsertResult.updated,
        callingCode: info.callingCode,
        admin1: {
          created: stats.admin1Created,
          updated: stats.admin1Updated,
          skipped: stats.admin1Skipped
        },
        admin2: {
          created: stats.admin2Created,
          updated: stats.admin2Updated,
          skipped: stats.admin2Skipped,
          skippedMissingParent: stats.admin2SkippedMissingParent
        }
      });
    }

    const summary = {
      ok: true,
      downloaded: {
        countryInfoRows: countryRows.length,
        admin1Rows: admin1Rows.length,
        admin2Rows: admin2Rows.length
      },
      countries: results
    };

    console.log(JSON.stringify(summary, null, 2));
    return summary;
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runImportGeoNames().catch((error) => {
    console.error("[import-geonames] failed", error);
    process.exitCode = 1;
  });
}
