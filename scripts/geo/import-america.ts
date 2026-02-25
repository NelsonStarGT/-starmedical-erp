import { PrismaClient } from "@prisma/client";
import { TARGET_ISO2, runImportGeoNames } from "./import-geonames";
import { runImportIneGt } from "./import-ine-gt";

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
    where: { iso2: { in: [...TARGET_ISO2] } },
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

export async function runImportAmerica() {
  await runImportGeoNames();
  await runImportIneGt();

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
  runImportAmerica().catch((error) => {
    console.error("[import-america] failed", error);
    process.exitCode = 1;
  });
}
