import { ClientCatalogType, ClientProfileType, PrismaClient } from "@prisma/client";
import { seedGeoCatalogs } from "./seed.geo";
import { seedPhoneCountryCodes } from "./seed.phone";
import { COMPANY_CONTACT_DEPARTMENTS } from "../lib/catalogs/departments";
import { ECONOMIC_ACTIVITIES } from "../lib/catalogs/economicActivities";
import { COMPANY_CONTACT_JOB_TITLES } from "../lib/catalogs/jobTitles";
import { COMPANY_PBX_CATEGORY_SEED } from "../lib/catalogs/pbxCategories";

const prisma = new PrismaClient();

const REAL_PERSON_DPI = "1234567890101";
const REAL_PERSON_EMAIL = "maria.real@starmedical.com";

const BASE_DOCUMENT_TYPES = [
  "PASSPORT",
  "DPI",
  "NIT",
  "RFC",
  "CURP",
  "DUI",
  "RTN",
  "RUC",
  "CEDULA",
  "SSN",
  "RTU",
  "Penales",
  "Policiacos",
  "Recibo de luz",
  "Recibo de agua",
  "Recibo de telefono",
  "Otros"
] as const;

const BASE_MARITAL_STATUS = ["Soltero", "Casado", "Divorciado", "Viudo", "Unión libre"] as const;
const BASE_ACADEMIC_LEVELS = ["Primaria", "Secundaria", "Técnico", "Universitario", "Maestría", "Doctorado"] as const;
const BASE_RELATIONSHIP_TYPES = ["Padre", "Madre", "Tutor", "Encargado", "Cónyuge", "Hermano", "Otro"] as const;
const BASE_LOCATION_TYPES = ["Principal", "Sucursal", "Oficina", "Planta", "Tienda", "Fiscal", "Casa", "Trabajo", "Otro"] as const;
const BASE_SOCIAL_NETWORKS = ["Facebook", "Instagram", "TikTok", "LinkedIn", "X", "YouTube", "Otra red"] as const;
const BASE_PERSON_CATEGORIES = ["General", "Paciente", "Particular"] as const;
const BASE_COMPANY_CATEGORIES = ["Corporativo", "PyME", "Operador", "ONG", "Gobierno", "Educativa", "Otro"] as const;
const BASE_INSTITUTION_CATEGORIES = [
  "Colegio",
  "Universidad",
  "Hospital",
  "Laboratorio",
  "Clínica",
  "Centro médico",
  "ONG",
  "Fundación",
  "Gobierno",
  "Iglesia",
  "Cooperativa",
  "Asociación",
  "Institución"
] as const;
const BASE_INSTITUTION_TYPES = ["Privada", "Pública", "Internacional"] as const;
const BASE_PROFESSIONS = ["Médico", "Ingeniero", "Docente", "Abogado", "Contador", "Administrativo"] as const;

const LEGACY_LOCATION_TYPE_TRANSLATIONS: ReadonlyArray<{ legacy: string; es: string }> = [
  { legacy: "MAIN", es: "Principal" },
  { legacy: "BRANCH", es: "Sucursal" },
  { legacy: "OFFICE", es: "Oficina" },
  { legacy: "PLANT", es: "Planta" },
  { legacy: "STORE", es: "Tienda" },
  { legacy: "FISCAL", es: "Fiscal" },
  { legacy: "HOME", es: "Casa" },
  { legacy: "WORK", es: "Trabajo" },
  { legacy: "OTHER", es: "Otro" }
];

const BASE_ACQUISITION_SOURCES: ReadonlyArray<{
  name: string;
  code: string;
  category: string;
  sortOrder: number;
}> = [
  { name: "Llegada a instalaciones", code: "WALK_IN", category: "DIRECT", sortOrder: 10 },
  { name: "WhatsApp", code: "WHATSAPP", category: "DIGITAL", sortOrder: 20 },
  { name: "Redes sociales", code: "SOCIAL_MEDIA", category: "DIGITAL", sortOrder: 30 },
  { name: "Google Maps", code: "GOOGLE_MAPS", category: "DIGITAL", sortOrder: 40 },
  { name: "Referido", code: "REFERRED", category: "REFERRAL", sortOrder: 50 },
  { name: "Empresa", code: "COMPANY", category: "B2B", sortOrder: 60 },
  { name: "Otro", code: "OTHER", category: "OTHER", sortOrder: 70 }
];

const SOCIAL_SOURCE_DETAILS: ReadonlyArray<{ code: string; name: string }> = [
  { code: "FACEBOOK", name: "Facebook" },
  { code: "INSTAGRAM", name: "Instagram" },
  { code: "TIKTOK", name: "TikTok" },
  { code: "LINKEDIN", name: "LinkedIn" },
  { code: "X", name: "X" },
  { code: "YOUTUBE", name: "YouTube" },
  { code: "OTHER_NETWORK", name: "Otra red" }
];

const DOCUMENT_TYPE_ALIASES: Array<{ legacy: string; canonical: (typeof BASE_DOCUMENT_TYPES)[number] }> = [
  { legacy: "Policíacos", canonical: "Policiacos" },
  { legacy: "Recibo de teléfono", canonical: "Recibo de telefono" },
  { legacy: "Recibo teléfono", canonical: "Recibo de telefono" },
  { legacy: "Pasaporte", canonical: "PASSPORT" }
];

function assertDevOnly() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("[seed:clients] bloqueado en production.");
  }
}

async function ensureCatalogItems(type: ClientCatalogType, items: readonly string[]) {
  for (const name of items) {
    await prisma.clientCatalogItem.upsert({
      where: {
        type_name: {
          type,
          name
        }
      },
      update: {},
      create: {
        type,
        name,
        isActive: true
      }
    });
  }
}

async function ensureCatalogItemsWithStableIds(
  type: ClientCatalogType,
  items: ReadonlyArray<{ id: string; label: string }>
) {
  for (const item of items) {
    const existingById = await prisma.clientCatalogItem.findUnique({
      where: { id: item.id },
      select: { id: true, type: true, name: true, isActive: true }
    });

    if (existingById) {
      if (existingById.type !== type) {
        throw new Error(`[seed:clients] id en conflicto (${item.id}) para tipo ${String(existingById.type)}.`);
      }
      if (existingById.name !== item.label || !existingById.isActive) {
        await prisma.clientCatalogItem.update({
          where: { id: item.id },
          data: {
            name: item.label,
            isActive: true
          }
        });
      }
      continue;
    }

    const existingByName = await prisma.clientCatalogItem.findFirst({
      where: {
        type,
        name: item.label
      },
      select: { id: true, isActive: true }
    });
    if (existingByName) {
      if (existingByName.id !== item.id) {
        try {
          await prisma.clientCatalogItem.update({
            where: { id: existingByName.id },
            data: {
              id: item.id,
              isActive: true
            }
          });
        } catch {
          await prisma.clientCatalogItem.update({
            where: { id: existingByName.id },
            data: {
              isActive: true
            }
          });
        }
      } else if (!existingByName.isActive) {
        await prisma.clientCatalogItem.update({
          where: { id: existingByName.id },
          data: { isActive: true }
        });
      }
      continue;
    }

    await prisma.clientCatalogItem.create({
      data: {
        id: item.id,
        type,
        name: item.label,
        isActive: true
      }
    });
  }
}

async function translateLegacyLocationTypesToSpanish() {
  for (const item of LEGACY_LOCATION_TYPE_TRANSLATIONS) {
    const legacy = await prisma.clientCatalogItem.findFirst({
      where: {
        type: ClientCatalogType.LOCATION_TYPE,
        name: item.legacy
      },
      select: { id: true }
    });
    if (!legacy) continue;

    const esExists = await prisma.clientCatalogItem.findFirst({
      where: {
        type: ClientCatalogType.LOCATION_TYPE,
        name: item.es
      },
      select: { id: true }
    });

    if (esExists) {
      if (esExists.id !== legacy.id) {
        await prisma.clientCatalogItem.update({
          where: { id: legacy.id },
          data: { isActive: false }
        });
      }
      continue;
    }

    await prisma.clientCatalogItem.update({
      where: { id: legacy.id },
      data: { name: item.es, isActive: true }
    });
  }
}

async function ensureClientCatalogDefaults() {
  await prisma.clientCatalogItem.upsert({
    where: {
      type_name: {
        type: ClientCatalogType.CLIENT_STATUS,
        name: "Activo"
      }
    },
    update: {},
    create: {
      type: ClientCatalogType.CLIENT_STATUS,
      name: "Activo",
      description: "Estado activo por defecto para perfiles vigentes.",
      isActive: true
    }
  });

  await ensureCatalogItems(ClientCatalogType.DOCUMENT_TYPE, BASE_DOCUMENT_TYPES);
  await ensureCatalogItems(ClientCatalogType.MARITAL_STATUS, BASE_MARITAL_STATUS);
  await ensureCatalogItems(ClientCatalogType.ACADEMIC_LEVEL, BASE_ACADEMIC_LEVELS);
  await ensureCatalogItems(ClientCatalogType.RELATIONSHIP_TYPE, BASE_RELATIONSHIP_TYPES);
  await ensureCatalogItems(ClientCatalogType.LOCATION_TYPE, BASE_LOCATION_TYPES);
  await translateLegacyLocationTypesToSpanish();
  await ensureCatalogItems(ClientCatalogType.SOCIAL_NETWORK, BASE_SOCIAL_NETWORKS);
  await ensureCatalogItems(ClientCatalogType.PERSON_CATEGORY, BASE_PERSON_CATEGORIES);
  await ensureCatalogItems(ClientCatalogType.COMPANY_CATEGORY, BASE_COMPANY_CATEGORIES);
  await ensureCatalogItemsWithStableIds(ClientCatalogType.SECTOR, ECONOMIC_ACTIVITIES);
  await ensureCatalogItems(ClientCatalogType.INSTITUTION_CATEGORY, BASE_INSTITUTION_CATEGORIES);
  await ensureCatalogItems(ClientCatalogType.INSTITUTION_TYPE, BASE_INSTITUTION_TYPES);
  await ensureCatalogItems(ClientCatalogType.PERSON_PROFESSION, BASE_PROFESSIONS);

  // Alias legacy detectado: mantener registro original y no mutar configuraciones del admin.
  for (const { legacy, canonical } of DOCUMENT_TYPE_ALIASES) {
    const legacyRow = await prisma.clientCatalogItem.findFirst({
      where: { type: ClientCatalogType.DOCUMENT_TYPE, name: legacy },
      select: { id: true }
    });
    if (!legacyRow) continue;

    await prisma.clientCatalogItem.upsert({
      where: {
        type_name: {
          type: ClientCatalogType.DOCUMENT_TYPE,
          name: canonical
        }
      },
      update: {},
      create: {
        type: ClientCatalogType.DOCUMENT_TYPE,
        name: canonical,
        isActive: true
      }
    });
  }
}

async function ensureClientAcquisitionDefaults() {
  for (const source of BASE_ACQUISITION_SOURCES) {
    const existing = await prisma.clientAcquisitionSource.findFirst({
      where: {
        OR: [{ name: source.name }, { code: source.code }]
      },
      select: { id: true }
    });

    if (existing) continue;

    await prisma.clientAcquisitionSource.create({
      data: {
        name: source.name,
        code: source.code,
        category: source.category,
        sortOrder: source.sortOrder,
        isActive: true
      }
    });
  }

  const socialSource = await prisma.clientAcquisitionSource.findFirst({
    where: {
      OR: [{ code: "SOCIAL_MEDIA" }, { name: "Redes sociales" }]
    },
    select: { id: true }
  });

  if (!socialSource) return;

  for (const detail of SOCIAL_SOURCE_DETAILS) {
    await prisma.clientAcquisitionDetailOption.upsert({
      where: {
        sourceId_code: {
          sourceId: socialSource.id,
          code: detail.code
        }
      },
      update: {},
      create: {
        sourceId: socialSource.id,
        code: detail.code,
        name: detail.name,
        isActive: true
      }
    });
  }
}

async function ensureClientContactDirectoryDefaults() {
  const delegate = prisma as unknown as {
    clientContactDepartmentDirectory?: {
      upsert?: (args: unknown) => Promise<unknown>;
    };
    clientContactJobTitleDirectory?: {
      upsert?: (args: unknown) => Promise<unknown>;
    };
    clientPbxCategoryDirectory?: {
      upsert?: (args: unknown) => Promise<unknown>;
    };
  };

  const departmentUpsert = delegate.clientContactDepartmentDirectory?.upsert;
  const jobTitleUpsert = delegate.clientContactJobTitleDirectory?.upsert;
  const pbxCategoryUpsert = delegate.clientPbxCategoryDirectory?.upsert;

  if (!departmentUpsert || !jobTitleUpsert || !pbxCategoryUpsert) {
    return;
  }

  const tenantRows = await prisma.tenant.findMany({
    select: { id: true }
  });
  const tenantIds = Array.from(new Set(["global", ...tenantRows.map((row) => row.id).filter(Boolean)]));

  for (const tenantId of tenantIds) {
    for (let index = 0; index < COMPANY_CONTACT_DEPARTMENTS.length; index += 1) {
      const department = COMPANY_CONTACT_DEPARTMENTS[index]!;
      await departmentUpsert({
        where: {
          tenantId_code: {
            tenantId,
            code: department.id
          }
        },
        update: {},
        create: {
          tenantId,
          code: department.id,
          name: department.label,
          sortOrder: (index + 1) * 10,
          isActive: true
        }
      });
    }

    for (let index = 0; index < COMPANY_CONTACT_JOB_TITLES.length; index += 1) {
      const jobTitle = COMPANY_CONTACT_JOB_TITLES[index]!;
      await jobTitleUpsert({
        where: {
          tenantId_code: {
            tenantId,
            code: jobTitle.id
          }
        },
        update: {},
        create: {
          tenantId,
          code: jobTitle.id,
          name: jobTitle.label,
          sortOrder: (index + 1) * 10,
          isActive: true
        }
      });
    }

    for (let index = 0; index < COMPANY_PBX_CATEGORY_SEED.length; index += 1) {
      const pbxCategory = COMPANY_PBX_CATEGORY_SEED[index]!;
      await pbxCategoryUpsert({
        where: {
          tenantId_code: {
            tenantId,
            code: pbxCategory.id
          }
        },
        update: {},
        create: {
          tenantId,
          code: pbxCategory.id,
          name: pbxCategory.label,
          sortOrder: (index + 1) * 10,
          isSystem: true,
          isActive: true
        }
      });
    }
  }
}

async function resolveActiveStatusId() {
  const activeStatus = await prisma.clientCatalogItem.findFirst({
    where: {
      type: "CLIENT_STATUS",
      isActive: true,
      name: { in: ["Activo", "ACTIVO", "active", "ACTIVE"] }
    },
    select: { id: true }
  });
  return activeStatus?.id ?? null;
}

async function ensureRealPerson(statusId: string | null) {
  const existing = await prisma.clientProfile.findFirst({
    where: {
      type: ClientProfileType.PERSON,
      OR: [{ dpi: REAL_PERSON_DPI }, { email: REAL_PERSON_EMAIL }]
    },
    select: { id: true }
  });

  if (existing) {
    const updated = await prisma.clientProfile.update({
      where: { id: existing.id },
      data: {
        type: ClientProfileType.PERSON,
        firstName: "María",
        middleName: "Elena",
        lastName: "Ramírez",
        secondLastName: "Soto",
        dpi: REAL_PERSON_DPI,
        phone: "50255558888",
        email: REAL_PERSON_EMAIL,
        address: "13 calle 7-45 zona 10",
        city: "Guatemala",
        department: "Guatemala",
        country: "Guatemala",
        statusId,
        deletedAt: null
      },
      select: { id: true }
    });
    return { id: updated.id, mode: "updated" as const };
  }

  const created = await prisma.clientProfile.create({
    data: {
      type: ClientProfileType.PERSON,
      firstName: "María",
      middleName: "Elena",
      lastName: "Ramírez",
      secondLastName: "Soto",
      dpi: REAL_PERSON_DPI,
      phone: "50255558888",
      email: REAL_PERSON_EMAIL,
      address: "13 calle 7-45 zona 10",
      city: "Guatemala",
      department: "Guatemala",
      country: "Guatemala",
      statusId
    },
    select: { id: true }
  });

  return { id: created.id, mode: "created" as const };
}

async function main() {
  assertDevOnly();

  await seedPhoneCountryCodes(prisma);
  await seedGeoCatalogs(prisma);
  await ensureClientCatalogDefaults();
  await ensureClientContactDirectoryDefaults();
  await ensureClientAcquisitionDefaults();
  const statusId = await resolveActiveStatusId();
  const realPerson = await ensureRealPerson(statusId);

  console.info("[seed:clients] documentTypes=%d", BASE_DOCUMENT_TYPES.length);
  console.info("[seed:clients] maritalStatus=%d", BASE_MARITAL_STATUS.length);
  console.info("[seed:clients] academicLevels=%d", BASE_ACADEMIC_LEVELS.length);
  console.info("[seed:clients] relationshipTypes=%d", BASE_RELATIONSHIP_TYPES.length);
  console.info("[seed:clients] locationTypes=%d", BASE_LOCATION_TYPES.length);
  console.info("[seed:clients] socialNetworks=%d", BASE_SOCIAL_NETWORKS.length);
  console.info("[seed:clients] personCategories=%d", BASE_PERSON_CATEGORIES.length);
  console.info("[seed:clients] companyCategories=%d", BASE_COMPANY_CATEGORIES.length);
  console.info("[seed:clients] economicSectors=%d", ECONOMIC_ACTIVITIES.length);
  console.info("[seed:clients] institutionCategories=%d", BASE_INSTITUTION_CATEGORIES.length);
  console.info("[seed:clients] institutionTypes=%d", BASE_INSTITUTION_TYPES.length);
  console.info("[seed:clients] professions=%d", BASE_PROFESSIONS.length);
  console.info("[seed:clients] contactDepartments=%d", COMPANY_CONTACT_DEPARTMENTS.length);
  console.info("[seed:clients] contactJobTitles=%d", COMPANY_CONTACT_JOB_TITLES.length);
  console.info("[seed:clients] pbxCategories=%d", COMPANY_PBX_CATEGORY_SEED.length);
  console.info("[seed:clients] acquisitionSources=%d", BASE_ACQUISITION_SOURCES.length);
  console.info("[seed:clients] socialSourceDetails=%d", SOCIAL_SOURCE_DETAILS.length);
  console.info("[seed:clients] realPersonMode=%s", realPerson.mode);
  console.info("[seed:clients] realPersonId=%s", realPerson.id);
}

main()
  .catch((error) => {
    console.error("[seed:clients] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
