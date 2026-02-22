import { PrismaClient } from "@prisma/client";
import { inferPhoneIso2ByCountryText, normalizePhoneToE164, sanitizeInput, type PhoneCountryCodeConfig } from "../../lib/phone/normalize";

const prisma = new PrismaClient();

type CatalogEntry = PhoneCountryCodeConfig;

type MigrationCounters = {
  updated: number;
  invalid: number;
  noCountry: number;
};

type MigrationResult = MigrationCounters & {
  total: number;
  alreadyNormalized: number;
};

function parseArgs() {
  const args = process.argv.slice(2);
  const defaultIsoArg = args.find((arg) => arg.startsWith("--default="));
  const defaultIso2 = defaultIsoArg ? defaultIsoArg.slice("--default=".length).trim().toUpperCase() : null;
  return { defaultIso2: defaultIso2 || null };
}

async function loadCatalog() {
  const rows = await prisma.phoneCountryCode.findMany({
    where: { isActive: true },
    orderBy: [{ countryName: "asc" }],
    select: {
      iso2: true,
      countryName: true,
      dialCode: true,
      minLength: true,
      maxLength: true,
      example: true,
      isActive: true
    }
  });

  if (!rows.length) {
    throw new Error("No hay catálogo de PhoneCountryCode activo. Ejecuta seed primero.");
  }
  return rows as CatalogEntry[];
}

function resolvePreferredIso2(
  input: {
    countryText?: string | null;
    geoIso2?: string | null;
    defaultIso2?: string | null;
  },
  catalog: CatalogEntry[]
) {
  const geoIso2 = (input.geoIso2 ?? "").trim().toUpperCase();
  if (geoIso2 && catalog.some((item) => item.iso2 === geoIso2)) return geoIso2;
  const byCountryText = inferPhoneIso2ByCountryText(input.countryText, catalog);
  if (byCountryText) return byCountryText;
  if (input.defaultIso2 && catalog.some((item) => item.iso2 === input.defaultIso2)) return input.defaultIso2;
  return null;
}

function isE164Input(raw: string | null | undefined) {
  return sanitizeInput(raw).startsWith("+");
}

function classifyMissingCountry(rawPhone: string, preferredIso2: string | null) {
  return !preferredIso2 && !isE164Input(rawPhone);
}

async function migrateClientProfiles(catalog: CatalogEntry[], defaultIso2: string | null): Promise<MigrationResult> {
  const rows = await prisma.clientProfile.findMany({
    where: {
      OR: [{ phone: { not: null } }, { phoneE164: { not: null } }]
    },
    select: {
      id: true,
      phone: true,
      phoneE164: true,
      country: true,
      clientLocations: {
        where: { isPrimary: true },
        take: 1,
        select: {
          geoCountry: { select: { iso2: true } }
        }
      }
    }
  });

  const counters: MigrationResult = {
    total: rows.length,
    updated: 0,
    invalid: 0,
    noCountry: 0,
    alreadyNormalized: 0
  };

  for (const row of rows) {
    const source = row.phoneE164 ?? row.phone;
    if (!source) continue;

    const preferredIso2 = resolvePreferredIso2(
      {
        countryText: row.country,
        geoIso2: row.clientLocations[0]?.geoCountry?.iso2 ?? null,
        defaultIso2
      },
      catalog
    );

    if (classifyMissingCountry(source, preferredIso2)) {
      counters.noCountry += 1;
      console.warn(`[phone-migration][clientProfile] skip ${row.id}: sin país para número local.`);
      continue;
    }

    try {
      const normalized = normalizePhoneToE164(source, catalog, {
        preferredIso2: preferredIso2 ?? undefined,
        fieldLabel: "Teléfono"
      });
      if (!normalized) continue;

      if (row.phone === normalized.e164 && row.phoneE164 === normalized.e164) {
        counters.alreadyNormalized += 1;
        continue;
      }

      await prisma.clientProfile.update({
        where: { id: row.id },
        data: {
          phone: normalized.e164,
          phoneE164: normalized.e164
        }
      });
      counters.updated += 1;
    } catch (error) {
      counters.invalid += 1;
      console.warn(`[phone-migration][clientProfile] skip ${row.id}: ${(error as Error).message}`);
    }
  }

  return counters;
}

async function migrateClientContacts(catalog: CatalogEntry[], defaultIso2: string | null): Promise<MigrationResult> {
  const rows = await prisma.clientContact.findMany({
    where: {
      OR: [{ phone: { not: null } }, { phoneE164: { not: null } }]
    },
    select: {
      id: true,
      phone: true,
      phoneE164: true,
      client: {
        select: {
          country: true,
          clientLocations: {
            where: { isPrimary: true },
            take: 1,
            select: {
              geoCountry: { select: { iso2: true } }
            }
          }
        }
      }
    }
  });

  const counters: MigrationResult = {
    total: rows.length,
    updated: 0,
    invalid: 0,
    noCountry: 0,
    alreadyNormalized: 0
  };

  for (const row of rows) {
    const source = row.phoneE164 ?? row.phone;
    if (!source) continue;

    const preferredIso2 = resolvePreferredIso2(
      {
        countryText: row.client.country,
        geoIso2: row.client.clientLocations[0]?.geoCountry?.iso2 ?? null,
        defaultIso2
      },
      catalog
    );

    if (classifyMissingCountry(source, preferredIso2)) {
      counters.noCountry += 1;
      console.warn(`[phone-migration][clientContact] skip ${row.id}: sin país para número local.`);
      continue;
    }

    try {
      const normalized = normalizePhoneToE164(source, catalog, {
        preferredIso2: preferredIso2 ?? undefined,
        fieldLabel: "Teléfono de contacto"
      });
      if (!normalized) continue;

      if (row.phone === normalized.e164 && row.phoneE164 === normalized.e164) {
        counters.alreadyNormalized += 1;
        continue;
      }

      await prisma.clientContact.update({
        where: { id: row.id },
        data: {
          phone: normalized.e164,
          phoneE164: normalized.e164
        }
      });
      counters.updated += 1;
    } catch (error) {
      counters.invalid += 1;
      console.warn(`[phone-migration][clientContact] skip ${row.id}: ${(error as Error).message}`);
    }
  }

  return counters;
}

async function migrateCompanyContacts(catalog: CatalogEntry[], defaultIso2: string | null): Promise<MigrationResult> {
  const rows = await prisma.companyContact.findMany({
    where: {
      OR: [{ phone: { not: null } }, { phoneE164: { not: null } }]
    },
    select: {
      id: true,
      phone: true,
      phoneE164: true,
      company: {
        select: {
          clientProfile: {
            select: {
              country: true,
              clientLocations: {
                where: { isPrimary: true },
                take: 1,
                select: {
                  geoCountry: { select: { iso2: true } }
                }
              }
            }
          }
        }
      }
    }
  });

  const counters: MigrationResult = {
    total: rows.length,
    updated: 0,
    invalid: 0,
    noCountry: 0,
    alreadyNormalized: 0
  };

  for (const row of rows) {
    const source = row.phoneE164 ?? row.phone;
    if (!source) continue;

    const preferredIso2 = resolvePreferredIso2(
      {
        countryText: row.company.clientProfile.country,
        geoIso2: row.company.clientProfile.clientLocations[0]?.geoCountry?.iso2 ?? null,
        defaultIso2
      },
      catalog
    );

    if (classifyMissingCountry(source, preferredIso2)) {
      counters.noCountry += 1;
      console.warn(`[phone-migration][companyContact] skip ${row.id}: sin país para número local.`);
      continue;
    }

    try {
      const normalized = normalizePhoneToE164(source, catalog, {
        preferredIso2: preferredIso2 ?? undefined,
        fieldLabel: "Teléfono de contacto"
      });
      if (!normalized) continue;

      if (row.phone === normalized.e164 && row.phoneE164 === normalized.e164) {
        counters.alreadyNormalized += 1;
        continue;
      }

      await prisma.companyContact.update({
        where: { id: row.id },
        data: {
          phone: normalized.e164,
          phoneE164: normalized.e164
        }
      });
      counters.updated += 1;
    } catch (error) {
      counters.invalid += 1;
      console.warn(`[phone-migration][companyContact] skip ${row.id}: ${(error as Error).message}`);
    }
  }

  return counters;
}

async function main() {
  const args = parseArgs();
  const catalog = await loadCatalog();

  if (args.defaultIso2 && !catalog.some((item) => item.iso2 === args.defaultIso2)) {
    throw new Error(`--default=${args.defaultIso2} no existe en PhoneCountryCode activo.`);
  }

  const [profiles, clientContacts, companyContacts] = await Promise.all([
    migrateClientProfiles(catalog, args.defaultIso2),
    migrateClientContacts(catalog, args.defaultIso2),
    migrateCompanyContacts(catalog, args.defaultIso2)
  ]);

  console.info("[phone-migration] done", {
    defaultIso2: args.defaultIso2,
    profiles,
    clientContacts,
    companyContacts
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
