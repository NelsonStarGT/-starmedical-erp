import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { PrismaClient, GeoDivisionDataSource } from "@prisma/client";

type GuatemalaSeed = {
  countryIso2: string;
  countryIso3?: string;
  countryName: string;
  departments: Array<{
    code: string;
    name: string;
    municipalities: Array<{
      code: string;
      name: string;
    }>;
  }>;
};

type GuatemalaNormalized = {
  departments: Array<{
    code: string;
    name: string;
    municipalities: Array<{ code: string; name: string }>;
  }>;
  departmentCount: number;
  municipalityCount: number;
};

const INE_XLS_URL = "https://www.ine.gob.gt/sistema/uploads/2016/10/28/0NiM1ouoHaN67SRO2IzXZ5RNI7FeyHpn.xls";
const GT_FALLBACK_JSON = path.join(process.cwd(), "data/geo/gt_departamentos_municipios.json");

function normalizeCode(raw: string | null | undefined): string {
  return (raw ?? "").trim();
}

function normalizeName(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\s+/g, " ").trim();
}

function normalizeNameKey(raw: string | null | undefined): string {
  return normalizeName(raw)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function normalizeGuatemalaDataset(input: GuatemalaSeed): GuatemalaNormalized {
  const departments = input.departments
    .map((department) => {
      const departmentCode = normalizeCode(department.code);
      const departmentName = normalizeName(department.name);
      const municipalities = (department.municipalities ?? [])
        .map((municipality) => ({
          code: normalizeCode(municipality.code),
          name: normalizeName(municipality.name)
        }))
        .filter((municipality) => municipality.code && municipality.name)
        .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));

      if (!departmentCode || !departmentName) return null;
      return {
        code: departmentCode,
        name: departmentName,
        municipalities
      };
    })
    .filter((row): row is { code: string; name: string; municipalities: Array<{ code: string; name: string }> } => Boolean(row))
    .sort((a, b) => a.code.localeCompare(b.code));

  const municipalityCount = departments.reduce((acc, department) => acc + department.municipalities.length, 0);

  return {
    departments,
    departmentCount: departments.length,
    municipalityCount
  };
}

async function downloadIneWorkbook(): Promise<{ bytes: number; sha256: string }> {
  const response = await fetch(INE_XLS_URL, { method: "GET" });
  if (!response.ok) {
    throw new Error(`No se pudo descargar XLS INE GT. status=${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    bytes: buffer.length,
    sha256: crypto.createHash("sha256").update(buffer).digest("hex")
  };
}

async function upsertGtCountry(prisma: PrismaClient) {
  const country = await prisma.geoCountry.upsert({
    where: { iso2: "GT" },
    update: {
      iso3: "GTM",
      isActive: true,
      admin1Label: "Departamento",
      admin2Label: "Municipio",
      admin3Label: null,
      adminMaxLevel: 2
    },
    create: {
      iso2: "GT",
      iso3: "GTM",
      name: "Guatemala",
      admin1Label: "Departamento",
      admin2Label: "Municipio",
      admin3Label: null,
      adminMaxLevel: 2,
      isActive: true
    },
    select: { id: true }
  });

  await prisma.geoCountryMeta.upsert({
    where: { countryId: country.id },
    update: {
      level1Label: "Departamento",
      level2Label: "Municipio",
      level3Label: null,
      maxLevel: 2
    },
    create: {
      countryId: country.id,
      level1Label: "Departamento",
      level2Label: "Municipio",
      level3Label: null,
      maxLevel: 2
    }
  });

  return country.id;
}

export async function runImportIneGt() {
  const prisma = new PrismaClient();

  try {
    const workbook = await downloadIneWorkbook();

    const raw = fs.readFileSync(GT_FALLBACK_JSON, "utf8");
    const dataset = normalizeGuatemalaDataset(JSON.parse(raw) as GuatemalaSeed);

    if (dataset.departmentCount !== 22) {
      throw new Error(`Dataset GT invalido: departamentos=${dataset.departmentCount} (esperado 22).`);
    }
    if (dataset.municipalityCount !== 340) {
      throw new Error(`Dataset GT invalido: municipios=${dataset.municipalityCount} (esperado 340).`);
    }

    const countryId = await upsertGtCountry(prisma);

    const existingAdmin1 = await prisma.geoAdmin1.findMany({
      where: { countryId },
      select: { id: true, code: true, name: true }
    });

    const admin1ByCode = new Map(existingAdmin1.map((row) => [row.code.trim().toUpperCase(), row]));
    const admin1ByName = new Map(existingAdmin1.map((row) => [normalizeNameKey(row.name), row]));

    const existingDivision1 = await prisma.geoDivision.findMany({
      where: { countryId, level: 1 },
      select: { id: true, code: true, name: true, legacyGeoAdmin1Id: true }
    });

    const division1ByCode = new Map(existingDivision1.map((row) => [row.code.trim().toUpperCase(), row]));
    const division1ByName = new Map(existingDivision1.map((row) => [normalizeNameKey(row.name), row]));

    let departmentsCreated = 0;
    let departmentsUpdated = 0;
    let municipalitiesCreated = 0;
    let municipalitiesUpdated = 0;

    const departmentContext = new Map<string, { admin1Id: string; division1Id: string }>();

    for (const department of dataset.departments) {
      const codeKey = department.code.trim().toUpperCase();
      const nameKey = normalizeNameKey(department.name);

      let admin1 = admin1ByCode.get(codeKey) ?? admin1ByName.get(nameKey) ?? null;
      if (!admin1) {
        admin1 = await prisma.geoAdmin1.create({
          data: {
            countryId,
            code: department.code,
            name: department.name,
            isActive: true
          },
          select: { id: true, code: true, name: true }
        });
        departmentsCreated += 1;
      } else {
        await prisma.geoAdmin1.update({
          where: { id: admin1.id },
          data: {
            code: department.code,
            name: department.name,
            isActive: true
          }
        });
        departmentsUpdated += 1;
        admin1 = { ...admin1, code: department.code, name: department.name };
      }

      admin1ByCode.set(codeKey, admin1);
      admin1ByName.set(nameKey, admin1);

      let division1 = division1ByCode.get(codeKey) ?? division1ByName.get(nameKey) ?? null;
      if (!division1) {
        division1 = await prisma.geoDivision.create({
          data: {
            countryId,
            level: 1,
            code: department.code,
            name: department.name,
            parentId: null,
            legacyGeoAdmin1Id: admin1.id,
            dataSource: GeoDivisionDataSource.official,
            isActive: true
          },
          select: { id: true, code: true, name: true, legacyGeoAdmin1Id: true }
        });
      } else {
        await prisma.geoDivision.update({
          where: { id: division1.id },
          data: {
            code: department.code,
            name: department.name,
            legacyGeoAdmin1Id: admin1.id,
            dataSource: GeoDivisionDataSource.official,
            isActive: true
          }
        });
        division1 = {
          ...division1,
          code: department.code,
          name: department.name,
          legacyGeoAdmin1Id: admin1.id
        };
      }

      division1ByCode.set(codeKey, division1);
      division1ByName.set(nameKey, division1);
      departmentContext.set(codeKey, { admin1Id: admin1.id, division1Id: division1.id });
    }

    const existingAdmin2 = await prisma.geoAdmin2.findMany({
      where: { admin1: { countryId } },
      select: { id: true, admin1Id: true, code: true, name: true }
    });

    const admin2ByCode = new Map(existingAdmin2.map((row) => [`${row.admin1Id}|${row.code.trim().toUpperCase()}`, row]));
    const admin2ByName = new Map(existingAdmin2.map((row) => [`${row.admin1Id}|${normalizeNameKey(row.name)}`, row]));

    const existingDivision2 = await prisma.geoDivision.findMany({
      where: { countryId, level: 2 },
      select: {
        id: true,
        parentId: true,
        code: true,
        name: true,
        legacyGeoAdmin1Id: true,
        legacyGeoAdmin2Id: true
      }
    });

    const division2ByCode = new Map(existingDivision2.map((row) => [`${row.parentId ?? ""}|${row.code.trim().toUpperCase()}`, row]));
    const division2ByName = new Map(existingDivision2.map((row) => [`${row.parentId ?? ""}|${normalizeNameKey(row.name)}`, row]));

    for (const department of dataset.departments) {
      const context = departmentContext.get(department.code.trim().toUpperCase());
      if (!context) continue;

      for (const municipality of department.municipalities) {
        const codeKey = `${context.admin1Id}|${municipality.code.trim().toUpperCase()}`;
        const nameKey = `${context.admin1Id}|${normalizeNameKey(municipality.name)}`;

        let admin2 = admin2ByCode.get(codeKey) ?? admin2ByName.get(nameKey) ?? null;
        if (!admin2) {
          admin2 = await prisma.geoAdmin2.create({
            data: {
              admin1Id: context.admin1Id,
              code: municipality.code,
              name: municipality.name,
              isActive: true
            },
            select: { id: true, admin1Id: true, code: true, name: true }
          });
          municipalitiesCreated += 1;
        } else {
          await prisma.geoAdmin2.update({
            where: { id: admin2.id },
            data: {
              code: municipality.code,
              name: municipality.name,
              isActive: true
            }
          });
          municipalitiesUpdated += 1;
          admin2 = {
            ...admin2,
            code: municipality.code,
            name: municipality.name
          };
        }

        admin2ByCode.set(codeKey, admin2);
        admin2ByName.set(nameKey, admin2);

        const divisionCodeKey = `${context.division1Id}|${municipality.code.trim().toUpperCase()}`;
        const divisionNameKey = `${context.division1Id}|${normalizeNameKey(municipality.name)}`;

        let division2 = division2ByCode.get(divisionCodeKey) ?? division2ByName.get(divisionNameKey) ?? null;
        if (!division2) {
          division2 = await prisma.geoDivision.create({
            data: {
              countryId,
              level: 2,
              code: municipality.code,
              name: municipality.name,
              parentId: context.division1Id,
              legacyGeoAdmin1Id: context.admin1Id,
              legacyGeoAdmin2Id: admin2.id,
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
          await prisma.geoDivision.update({
            where: { id: division2.id },
            data: {
              code: municipality.code,
              name: municipality.name,
              legacyGeoAdmin1Id: context.admin1Id,
              legacyGeoAdmin2Id: admin2.id,
              dataSource: GeoDivisionDataSource.official,
              isActive: true
            }
          });
          division2 = {
            ...division2,
            code: municipality.code,
            name: municipality.name,
            legacyGeoAdmin1Id: context.admin1Id,
            legacyGeoAdmin2Id: admin2.id
          };
        }

        division2ByCode.set(divisionCodeKey, division2);
        division2ByName.set(divisionNameKey, division2);
      }
    }

    const summary = {
      ok: true,
      source: {
        url: INE_XLS_URL,
        parserMode: "json_fallback_from_repo",
        downloadedBytes: workbook.bytes,
        downloadedSha256: workbook.sha256,
        fallbackJson: GT_FALLBACK_JSON
      },
      gt: {
        departmentsExpected: 22,
        municipalitiesExpected: 340,
        departmentsDetected: dataset.departmentCount,
        municipalitiesDetected: dataset.municipalityCount,
        departmentsCreated,
        departmentsUpdated,
        municipalitiesCreated,
        municipalitiesUpdated
      }
    };

    console.log(JSON.stringify(summary, null, 2));
    return summary;
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runImportIneGt().catch((error) => {
    console.error("[import-ine-gt] failed", error);
    process.exitCode = 1;
  });
}
