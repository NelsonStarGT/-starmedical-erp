import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const countries = ["GT", "SV", "HN", "NI", "CR", "PA", "US", "MX", "CO", "EC"];

  for (const iso2 of countries) {
    const country = await prisma.geoCountry.findUnique({
      where: { iso2 },
      select: {
        id: true,
        name: true,
        meta: {
          select: {
            level1Label: true,
            level2Label: true,
            level3Label: true,
            maxLevel: true
          }
        }
      }
    });

    if (!country) {
      console.log(`${iso2}: country missing`);
      continue;
    }

    const [level1, level2, level3, postal, postalOfficial, postalOperational] = await Promise.all([
      prisma.geoDivision.count({ where: { countryId: country.id, level: 1, isActive: true } }),
      prisma.geoDivision.count({ where: { countryId: country.id, level: 2, isActive: true } }),
      prisma.geoDivision.count({ where: { countryId: country.id, level: 3, isActive: true } }),
      prisma.geoPostalCode.count({ where: { countryId: country.id, isActive: true } }),
      prisma.geoPostalCode.count({ where: { countryId: country.id, isActive: true, dataSource: "official" } }),
      prisma.geoPostalCode.count({ where: { countryId: country.id, isActive: true, dataSource: "operational" } })
    ]);

    console.log(
      `${iso2} ${country.name} | labels=${country.meta?.level1Label ?? "-"}/${country.meta?.level2Label ?? "-"}/${country.meta?.level3Label ?? "-"} maxLevel=${country.meta?.maxLevel ?? "-"} | divisions=${level1}/${level2}/${level3} | postal=${postal} (official=${postalOfficial}, operational=${postalOperational})`
    );
  }

  const duplicateDivisionKeys = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM (
      SELECT "countryId", "level", "code", "parentId", COUNT(*) AS rows_count
      FROM "GeoDivision"
      GROUP BY "countryId", "level", "code", "parentId"
      HAVING COUNT(*) > 1
    ) d
  `;
  console.log(`GeoDivision duplicate hierarchy keys => ${duplicateDivisionKeys[0]?.count ?? 0}`);

  const gtCountry = await prisma.geoCountry.findUnique({ where: { iso2: "GT" }, select: { id: true } });
  if (!gtCountry) {
    console.log("GT lookup skipped: country not found");
    return;
  }

  const gtPostal = await prisma.geoPostalCode.findFirst({
    where: {
      countryId: gtCountry.id,
      postalCode: "05011",
      isActive: true
    },
    select: {
      postalCode: true,
      label: true,
      division: {
        select: {
          id: true,
          name: true,
          level: true,
          parent: {
            select: {
              id: true,
              name: true,
              level: true,
              parent: {
                select: {
                  id: true,
                  name: true,
                  level: true
                }
              }
            }
          }
        }
      },
      admin1: { select: { name: true } },
      admin2: { select: { name: true } },
      admin3: { select: { name: true } }
    }
  });

  if (!gtPostal) {
    console.log("GT 05011 lookup: no match");
    return;
  }

  const path: Array<{ level: number; name: string }> = [];
  let cursor: {
    level: number;
    name: string;
    parent: unknown;
  } | null = gtPostal.division as {
    level: number;
    name: string;
    parent: unknown;
  } | null;
  while (cursor) {
    path.push({ level: cursor.level, name: cursor.name });
    cursor = (cursor.parent as { level: number; name: string; parent: unknown } | null) ?? null;
  }
  path.sort((a, b) => a.level - b.level);

  console.log(
    `GT lookup 05011 => label=${gtPostal.label ?? "-"} admin=${gtPostal.admin1?.name ?? "-"}/${gtPostal.admin2?.name ?? "-"}/${gtPostal.admin3?.name ?? "-"} path=${path
      .map((segment) => `${segment.level}:${segment.name}`)
      .join(" > ")}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
