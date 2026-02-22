import { ClientCatalogType, ClientProfileType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REAL_PERSON_DPI = "1234567890101";
const REAL_PERSON_EMAIL = "maria.real@starmedical.com";
const BASE_DOCUMENT_TYPES = [
  "DPI",
  "RTU",
  "Penales",
  "Policiacos",
  "Recibo de luz",
  "Recibo de agua",
  "Recibo de telefono",
  "Otros"
] as const;

const DOCUMENT_TYPE_ALIASES: Array<{ legacy: string; canonical: (typeof BASE_DOCUMENT_TYPES)[number] }> = [
  { legacy: "Policíacos", canonical: "Policiacos" },
  { legacy: "Recibo de teléfono", canonical: "Recibo de telefono" },
  { legacy: "Recibo teléfono", canonical: "Recibo de telefono" }
];

function assertDevOnly() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("[seed:clients] bloqueado en production.");
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
    update: {
      isActive: true
    },
    create: {
      type: ClientCatalogType.CLIENT_STATUS,
      name: "Activo",
      description: "Estado activo por defecto para perfiles vigentes.",
      isActive: true
    }
  });

  for (const name of BASE_DOCUMENT_TYPES) {
    await prisma.clientCatalogItem.upsert({
      where: {
        type_name: {
          type: ClientCatalogType.DOCUMENT_TYPE,
          name
        }
      },
      update: {
        isActive: true
      },
      create: {
        type: ClientCatalogType.DOCUMENT_TYPE,
        name,
        isActive: true
      }
    });
  }

  for (const { legacy, canonical } of DOCUMENT_TYPE_ALIASES) {
    const legacyRow = await prisma.clientCatalogItem.findFirst({
      where: {
        type: ClientCatalogType.DOCUMENT_TYPE,
        name: legacy
      },
      select: { id: true }
    });
    if (!legacyRow) continue;

    const canonicalRow = await prisma.clientCatalogItem.findFirst({
      where: {
        type: ClientCatalogType.DOCUMENT_TYPE,
        name: canonical
      },
      select: { id: true }
    });

    if (canonicalRow) {
      await prisma.clientCatalogItem.update({
        where: { id: legacyRow.id },
        data: { isActive: false }
      });
      continue;
    }

    await prisma.clientCatalogItem.update({
      where: { id: legacyRow.id },
      data: { name: canonical, isActive: true }
    });
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

async function cleanupDemoPeople() {
  const demoPeople = await prisma.clientProfile.findMany({
    where: {
      type: ClientProfileType.PERSON,
      deletedAt: null,
      OR: [{ email: { endsWith: "@starmedical.test", mode: "insensitive" } }, { dpi: { startsWith: "1000000000" } }]
    },
    select: { id: true }
  });

  if (!demoPeople.length) return { cleanedCount: 0 };

  const archivedAt = new Date();
  await prisma.clientProfile.updateMany({
    where: { id: { in: demoPeople.map((person) => person.id) } },
    data: { deletedAt: archivedAt }
  });

  return { cleanedCount: demoPeople.length };
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
        phone: "+50255558888",
        phoneE164: "+50255558888",
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
      phone: "+50255558888",
      phoneE164: "+50255558888",
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

  await ensureClientCatalogDefaults();
  const cleanup = await cleanupDemoPeople();
  const statusId = await resolveActiveStatusId();
  const realPerson = await ensureRealPerson(statusId);

  console.info("[seed:clients] documentTypes=%d", BASE_DOCUMENT_TYPES.length);
  console.info("[seed:clients] cleanedDemoPersons=%d", cleanup.cleanedCount);
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
