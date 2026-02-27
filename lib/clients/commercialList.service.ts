import { ClientPhoneCategory, ClientProfileType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeTenantId } from "@/lib/tenant";

export type ClientCommercialSort = "createdAt_desc" | "name_asc";

export type ClientCommercialListQuery = {
  tenantId: unknown;
  q?: string;
  type?: ClientProfileType | "";
  statusId?: string;
  includeArchived?: boolean;
  page?: number;
  pageSize?: number;
  sort?: ClientCommercialSort;
};

export type ClientCommercialListItem = {
  id: string;
  clientCode: string | null;
  displayName: string;
  type: ClientProfileType;
  identifier: string | null;
  primaryPhone: string | null;
  primaryPhoneHref: string | null;
  primaryEmail: string | null;
  primaryEmailHref: string | null;
  whatsappHref: string | null;
  statusLabel: string | null;
  createdAt: Date;
  isArchived: boolean;
};

export type ClientCommercialListResult = {
  items: ClientCommercialListItem[];
  total: number;
  page: number;
  pageSize: number;
};

function normalizeSearch(value?: string | null) {
  return (value ?? "").trim();
}

function displayName(row: {
  type: ClientProfileType;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  secondLastName: string | null;
  companyName: string | null;
  tradeName: string | null;
}) {
  if (row.type === ClientProfileType.PERSON) {
    return [row.firstName, row.middleName, row.lastName, row.secondLastName].filter(Boolean).join(" ").trim() || "Persona";
  }
  return row.companyName || row.tradeName || "Cliente";
}

function stripToDigits(value: string) {
  return value.replace(/\D+/g, "");
}

function selectPrimaryEmail(input: {
  clientEmails: Array<{ valueRaw: string; valueNormalized: string; isPrimary: boolean }>;
  email: string | null;
  clientContacts: Array<{ email: string | null; isPrimary: boolean }>;
}) {
  const primaryEmail = input.clientEmails.find((item) => item.isPrimary) ?? input.clientEmails[0] ?? null;
  const primaryContact = input.clientContacts.find((item) => item.isPrimary) ?? input.clientContacts[0] ?? null;
  const value =
    primaryEmail?.valueNormalized?.trim() ||
    primaryEmail?.valueRaw?.trim() ||
    input.email?.trim() ||
    primaryContact?.email?.trim() ||
    null;

  if (!value) {
    return { value: null, href: null };
  }

  const normalized = value.toLowerCase();
  return {
    value,
    href: normalized.includes("@") ? `mailto:${normalized}` : null
  };
}

function buildTelHref(value: string | null) {
  if (!value) return null;
  const compact = value.replace(/\s+/g, "").trim();
  return compact ? `tel:${compact}` : null;
}

function toWhatsAppDigits(phone: { e164: string | null; countryCode: string; number: string }) {
  const e164Digits = stripToDigits(phone.e164 || "");
  if (e164Digits) return e164Digits;

  const countryCodeDigits = stripToDigits(phone.countryCode);
  const numberDigits = stripToDigits(phone.number);
  if (!numberDigits) return null;

  if (countryCodeDigits && !numberDigits.startsWith(countryCodeDigits)) {
    return `${countryCodeDigits}${numberDigits}`;
  }

  return numberDigits;
}

function selectPrimaryPhone(input: {
  clientPhones: Array<{
    number: string;
    e164: string | null;
    countryCode: string;
    category: ClientPhoneCategory;
    canWhatsapp: boolean;
    isPrimary: boolean;
  }>;
  phone: string | null;
  clientContacts: Array<{ phone: string | null; phoneE164: string | null; isPrimary: boolean }>;
}) {
  const primaryPhone = input.clientPhones.find((item) => item.isPrimary) ?? input.clientPhones[0] ?? null;
  const whatsappPhone =
    input.clientPhones.find(
      (item) =>
        item.category === ClientPhoneCategory.WHATSAPP || item.category === ClientPhoneCategory.MOBILE || item.canWhatsapp
    ) ?? null;

  if (primaryPhone) {
    const value = primaryPhone.e164?.trim() || primaryPhone.number?.trim() || null;
    const whatsappDigits = whatsappPhone ? toWhatsAppDigits(whatsappPhone) : null;

    return {
      value,
      href: buildTelHref(value),
      whatsappHref: whatsappDigits ? `https://wa.me/${whatsappDigits}` : null
    };
  }

  const primaryContact = input.clientContacts.find((item) => item.isPrimary) ?? input.clientContacts[0] ?? null;
  const fallback = input.phone?.trim() || primaryContact?.phoneE164?.trim() || primaryContact?.phone?.trim() || null;

  return {
    value: fallback,
    href: buildTelHref(fallback),
    whatsappHref: null
  };
}

function compareNames(left: string, right: string) {
  return left.localeCompare(right, "es", { sensitivity: "base" });
}

function applySort(items: ClientCommercialListItem[], sort: ClientCommercialSort) {
  const rows = [...items];
  rows.sort((left, right) => {
    if (sort === "name_asc") return compareNames(left.displayName, right.displayName);
    return right.createdAt.getTime() - left.createdAt.getTime();
  });
  return rows;
}

export async function listClientsCommercial(query: ClientCommercialListQuery): Promise<ClientCommercialListResult> {
  const tenantId = normalizeTenantId(query.tenantId);
  const q = normalizeSearch(query.q);
  const pageSize = Math.min(Math.max(query.pageSize ?? 10, 10), 200);
  const page = Math.max(query.page ?? 1, 1);
  const offset = (page - 1) * pageSize;
  const includeArchived = Boolean(query.includeArchived);
  const andFilters: Prisma.ClientProfileWhereInput[] = [];

  if (q) {
    andFilters.push({
      OR: [
        { clientCode: { contains: q, mode: "insensitive" } },
        { firstName: { contains: q, mode: "insensitive" } },
        { middleName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { secondLastName: { contains: q, mode: "insensitive" } },
        { companyName: { contains: q, mode: "insensitive" } },
        { tradeName: { contains: q, mode: "insensitive" } },
        { nit: { contains: q, mode: "insensitive" } },
        { dpi: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        {
          clientPhones: {
            some: {
              isActive: true,
              OR: [{ number: { contains: q, mode: "insensitive" } }, { e164: { contains: q, mode: "insensitive" } }]
            }
          }
        },
        {
          clientEmails: {
            some: {
              isActive: true,
              OR: [{ valueRaw: { contains: q, mode: "insensitive" } }, { valueNormalized: { contains: q.toLowerCase() } }]
            }
          }
        }
      ]
    });
  }

  const where: Prisma.ClientProfileWhereInput = {
    tenantId,
    ...(includeArchived ? {} : { deletedAt: null }),
    ...(query.type ? { type: query.type } : {}),
    ...(query.statusId ? { statusId: query.statusId } : {}),
    ...(andFilters.length ? { AND: andFilters } : {})
  };

  const rows = await prisma.clientProfile.findMany({
    where,
    select: {
      id: true,
      clientCode: true,
      type: true,
      firstName: true,
      middleName: true,
      lastName: true,
      secondLastName: true,
      companyName: true,
      tradeName: true,
      nit: true,
      dpi: true,
      phone: true,
      email: true,
      createdAt: true,
      deletedAt: true,
      status: { select: { name: true } },
      clientPhones: {
        where: { isActive: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 5,
        select: {
          number: true,
          e164: true,
          countryCode: true,
          category: true,
          canWhatsapp: true,
          isPrimary: true
        }
      },
      clientEmails: {
        where: { isActive: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 5,
        select: {
          valueRaw: true,
          valueNormalized: true,
          isPrimary: true
        }
      },
      clientContacts: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 5,
        select: {
          phone: true,
          phoneE164: true,
          email: true,
          isPrimary: true
        }
      }
    }
  });

  const mapped = rows.map((row): ClientCommercialListItem => {
    const primaryPhone = selectPrimaryPhone({
      clientPhones: row.clientPhones,
      phone: row.phone,
      clientContacts: row.clientContacts
    });
    const primaryEmail = selectPrimaryEmail({
      clientEmails: row.clientEmails,
      email: row.email,
      clientContacts: row.clientContacts
    });

    return {
      id: row.id,
      clientCode: row.clientCode,
      displayName: displayName(row),
      type: row.type,
      identifier: row.type === ClientProfileType.PERSON ? row.dpi : row.nit,
      primaryPhone: primaryPhone.value,
      primaryPhoneHref: primaryPhone.href,
      primaryEmail: primaryEmail.value,
      primaryEmailHref: primaryEmail.href,
      whatsappHref: primaryPhone.whatsappHref,
      statusLabel: row.status?.name ?? null,
      createdAt: row.createdAt,
      isArchived: Boolean(row.deletedAt)
    };
  });

  const sorted = applySort(mapped, query.sort ?? "createdAt_desc");
  const total = sorted.length;
  const items = sorted.slice(offset, offset + pageSize);

  return {
    items,
    total,
    page,
    pageSize
  };
}
