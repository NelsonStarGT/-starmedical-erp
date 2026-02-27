import { ClientProfileType, Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tenantIdFromUser } from "@/lib/tenant";
import { CLIENT_TYPE_LABELS } from "@/lib/clients/constants";

export type RecepcionClientSearchItem = {
  id: string;
  type: ClientProfileType;
  typeLabel: string;
  clientCode: string | null;
  displayName: string;
  documentRef: string | null;
  phone: string | null;
  email: string | null;
  href: string;
};

function normalizeSearchInput(value?: string | null) {
  return String(value || "").trim();
}

function compactSearchInput(value: string) {
  return value.replace(/\s+/g, "").trim();
}

function displayName(row: {
  type: ClientProfileType;
  firstName: string | null;
  middleName: string | null;
  thirdName: string | null;
  lastName: string | null;
  secondLastName: string | null;
  thirdLastName: string | null;
  companyName: string | null;
  tradeName: string | null;
}) {
  if (row.type === ClientProfileType.PERSON) {
    const label = [row.firstName, row.middleName, row.thirdName, row.lastName, row.secondLastName, row.thirdLastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    return label || "Persona";
  }

  return row.tradeName || row.companyName || "Cliente";
}

export async function searchRecepcionClients(input: {
  user: SessionUser;
  q: string;
  limit?: number;
}): Promise<RecepcionClientSearchItem[]> {
  const q = normalizeSearchInput(input.q);
  if (q.length < 2) return [];

  const tenantId = tenantIdFromUser(input.user);
  const mode = Prisma.QueryMode.insensitive;
  const compact = compactSearchInput(q);
  const compactLower = compact.toLowerCase();
  const limit = Math.min(Math.max(input.limit ?? 12, 5), 25);

  const rows = await prisma.clientProfile.findMany({
    where: {
      tenantId,
      deletedAt: null,
      type: {
        in: [
          ClientProfileType.PERSON,
          ClientProfileType.COMPANY,
          ClientProfileType.INSTITUTION,
          ClientProfileType.INSURER
        ]
      },
      OR: [
        { clientCode: { contains: q, mode } },
        { firstName: { contains: q, mode } },
        { middleName: { contains: q, mode } },
        { lastName: { contains: q, mode } },
        { secondLastName: { contains: q, mode } },
        { companyName: { contains: q, mode } },
        { tradeName: { contains: q, mode } },
        { nit: { contains: compact, mode } },
        { dpi: { contains: compact, mode } },
        { phone: { contains: compact, mode } },
        { email: { contains: q, mode } },
        {
          clientIdentifiers: {
            some: {
              isActive: true,
              OR: [
                { value: { contains: q, mode } },
                { valueNormalized: { contains: compactLower } }
              ]
            }
          }
        },
        {
          clientPhones: {
            some: {
              isActive: true,
              OR: [
                { number: { contains: compact, mode } },
                { e164: { contains: compact, mode } }
              ]
            }
          }
        },
        {
          clientEmails: {
            some: {
              isActive: true,
              OR: [
                { valueRaw: { contains: q, mode } },
                { valueNormalized: { contains: q.toLowerCase() } }
              ]
            }
          }
        }
      ]
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      type: true,
      clientCode: true,
      firstName: true,
      middleName: true,
      thirdName: true,
      lastName: true,
      secondLastName: true,
      thirdLastName: true,
      companyName: true,
      tradeName: true,
      dpi: true,
      nit: true,
      phone: true,
      email: true,
      clientIdentifiers: {
        where: { isActive: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: {
          value: true
        }
      },
      clientPhones: {
        where: { isActive: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: {
          number: true,
          e164: true
        }
      },
      clientEmails: {
        where: { isActive: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: {
          valueRaw: true,
          valueNormalized: true
        }
      }
    }
  });

  return rows.map((row) => {
    const resolvedDocument = row.dpi || row.nit || row.clientIdentifiers[0]?.value || null;
    const resolvedPhone = row.phone || row.clientPhones[0]?.number || row.clientPhones[0]?.e164 || null;
    const resolvedEmail = row.email || row.clientEmails[0]?.valueRaw || row.clientEmails[0]?.valueNormalized || null;

    return {
      id: row.id,
      type: row.type,
      typeLabel: CLIENT_TYPE_LABELS[row.type],
      clientCode: row.clientCode,
      displayName: displayName(row),
      documentRef: resolvedDocument,
      phone: resolvedPhone,
      email: resolvedEmail,
      href: `/admin/clientes/${row.id}`
    };
  });
}
