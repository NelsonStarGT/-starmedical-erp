import { PrismaClient } from "@prisma/client";
import { runImportGeoNames } from "./import-geonames";

export const EUROPE_TARGET_ISO2 = [
  "AL",
  "AD",
  "AT",
  "BA",
  "BE",
  "BG",
  "BY",
  "CH",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GB",
  "GR",
  "HR",
  "HU",
  "IE",
  "IS",
  "IT",
  "LI",
  "LT",
  "LU",
  "LV",
  "MC",
  "MD",
  "ME",
  "MK",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "RS",
  "RU",
  "SE",
  "SI",
  "SK",
  "SM",
  "UA",
  "VA"
] as const;

const EUROPE_REQUIRED_CALLING_CODES: Record<string, string> = {
  AL: "+355",
  AD: "+376",
  AT: "+43",
  BA: "+387",
  BE: "+32",
  BG: "+359",
  BY: "+375",
  CH: "+41",
  CY: "+357",
  CZ: "+420",
  DE: "+49",
  DK: "+45",
  EE: "+372",
  ES: "+34",
  FI: "+358",
  FR: "+33",
  GB: "+44",
  GR: "+30",
  HR: "+385",
  HU: "+36",
  IE: "+353",
  IS: "+354",
  IT: "+39",
  LI: "+423",
  LT: "+370",
  LU: "+352",
  LV: "+371",
  MC: "+377",
  MD: "+373",
  ME: "+382",
  MK: "+389",
  MT: "+356",
  NL: "+31",
  NO: "+47",
  PL: "+48",
  PT: "+351",
  RO: "+40",
  RS: "+381",
  RU: "+7",
  SE: "+46",
  SI: "+386",
  SK: "+421",
  SM: "+378",
  UA: "+380",
  VA: "+39"
};

type CountryCounts = {
  iso2: string;
  countryName: string;
  callingCode: string | null;
  level1: number;
  level2: number;
  level3: number;
};

async function collectCounts(prisma: PrismaClient): Promise<CountryCounts[]> {
  const countries = await prisma.geoCountry.findMany({
    where: { iso2: { in: [...EUROPE_TARGET_ISO2] } },
    select: {
      id: true,
      iso2: true,
      name: true,
      callingCode: true
    },
    orderBy: { iso2: "asc" }
  });

  const out: CountryCounts[] = [];
  for (const country of countries) {
    const [level1, level2, level3] = await Promise.all([
      prisma.geoDivision.count({ where: { countryId: country.id, level: 1 } }),
      prisma.geoDivision.count({ where: { countryId: country.id, level: 2 } }),
      prisma.geoDivision.count({ where: { countryId: country.id, level: 3 } })
    ]);

    out.push({
      iso2: country.iso2,
      countryName: country.name,
      callingCode: country.callingCode,
      level1,
      level2,
      level3
    });
  }

  return out;
}

export async function runImportEurope() {
  await runImportGeoNames({
    targetIso2: EUROPE_TARGET_ISO2,
    requiredCallingCodes: EUROPE_REQUIRED_CALLING_CODES
  });

  const prisma = new PrismaClient();
  try {
    const countries = await collectCounts(prisma);
    const totals = countries.reduce(
      (acc, item) => {
        acc.level1 += item.level1;
        acc.level2 += item.level2;
        acc.level3 += item.level3;
        return acc;
      },
      { level1: 0, level2: 0, level3: 0 }
    );

    const summary = {
      ok: true,
      countriesCount: countries.length,
      totals,
      countries
    };

    console.log(JSON.stringify(summary, null, 2));
    return summary;
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runImportEurope().catch((error) => {
    console.error("[import-europe] failed", error);
    process.exitCode = 1;
  });
}
