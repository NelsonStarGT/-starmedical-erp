import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CompanyDetailQuery, CompanyListQuery } from "@/lib/companies/schema/company.zod";

export type CompanyDetailInput = CompanyDetailQuery & {
  companyId: string;
};

function buildCompanyListWhere(input: CompanyListQuery): Prisma.CompanyWhereInput {
  const where: Prisma.CompanyWhereInput = {
    tenantId: input.tenantId,
    ...(input.includeArchived ? {} : { deletedAt: null }),
    ...(input.kind ? { kind: input.kind } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.contractStatus ? { contractStatus: input.contractStatus } : {})
  };

  if (input.q) {
    where.OR = [
      { legalName: { contains: input.q, mode: "insensitive" } },
      { tradeName: { contains: input.q, mode: "insensitive" } },
      { taxId: { contains: input.q, mode: "insensitive" } },
      { code: { contains: input.q, mode: "insensitive" } },
      { billingEmail: { contains: input.q, mode: "insensitive" } }
    ];
  }

  return where;
}

export async function listCompaniesRepo(input: CompanyListQuery) {
  const where = buildCompanyListWhere(input);
  const page = input.page;
  const pageSize = input.pageSize;
  const skip = (page - 1) * pageSize;

  const [total, rows] = await Promise.all([
    prisma.company.count({ where }),
    prisma.company.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        tenantId: true,
        code: true,
        kind: true,
        status: true,
        contractStatus: true,
        legalName: true,
        tradeName: true,
        taxId: true,
        billingEmail: true,
        billingPhone: true,
        contractCode: true,
        contractStartDate: true,
        contractEndDate: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        clientProfile: {
          select: {
            id: true,
            type: true,
            companyName: true,
            tradeName: true
          }
        },
        party: {
          select: {
            id: true,
            name: true,
            nit: true
          }
        },
        defaultBillingLegalEntity: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            contacts: true,
            locations: true,
            documents: true
          }
        }
      }
    })
  ]);

  return {
    items: rows,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize))
  };
}

export async function getCompanyDetailRepo(input: CompanyDetailInput) {
  const row = await prisma.company.findFirst({
    where: {
      id: input.companyId,
      tenantId: input.tenantId
    },
    select: {
      id: true,
      tenantId: true,
      clientProfileId: true,
      partyId: true,
      defaultBillingLegalEntityId: true,
      code: true,
      kind: true,
      status: true,
      contractStatus: true,
      legalName: true,
      tradeName: true,
      taxId: true,
      registrationNumber: true,
      billingEmail: true,
      billingPhone: true,
      website: true,
      contractCode: true,
      contractStartDate: true,
      contractEndDate: true,
      defaultCreditTerm: true,
      defaultPaymentMethod: true,
      notes: true,
      metadata: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true,
      createdByUserId: true,
      updatedByUserId: true,
      deletedByUserId: true,
      clientProfile: {
        select: {
          id: true,
          type: true,
          companyName: true,
          tradeName: true,
          email: true,
          phone: true,
          phoneE164: true,
          nit: true
        }
      },
      party: {
        select: {
          id: true,
          type: true,
          name: true,
          nit: true,
          email: true,
          phone: true,
          address: true,
          isActive: true
        }
      },
      defaultBillingLegalEntity: {
        select: {
          id: true,
          name: true,
          comercialName: true,
          nit: true,
          phone: true,
          email: true,
          isActive: true
        }
      },
      contacts: {
        ...(input.includeArchived ? {} : { where: { deletedAt: null } }),
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          role: true,
          status: true,
          firstName: true,
          lastName: true,
          jobTitle: true,
          department: true,
          email: true,
          phone: true,
          phoneE164: true,
          phoneExtension: true,
          preferredChannel: true,
          isPrimary: true,
          receivesBillingEmails: true,
          receivesMedicalResults: true,
          personClientId: true,
          deletedAt: true,
          createdAt: true,
          updatedAt: true
        }
      },
      locations: {
        ...(input.includeArchived ? {} : { where: { deletedAt: null } }),
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          branchId: true,
          type: true,
          status: true,
          name: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
          postalCode: true,
          countryCode: true,
          geoCountryId: true,
          geoAdmin1Id: true,
          geoAdmin2Id: true,
          geoAdmin3Id: true,
          latitude: true,
          longitude: true,
          isPrimary: true,
          supportsReception: true,
          supportsOccupationalHealth: true,
          deletedAt: true,
          createdAt: true,
          updatedAt: true,
          branch: { select: { id: true, name: true, code: true, isActive: true } },
          geoCountry: { select: { id: true, name: true, iso2: true } },
          geoAdmin1: { select: { id: true, name: true, code: true } },
          geoAdmin2: { select: { id: true, name: true, code: true } },
          geoAdmin3: { select: { id: true, name: true, code: true } }
        }
      },
      documents: {
        ...(input.includeArchived ? {} : { where: { deletedAt: null } }),
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          companyLocationId: true,
          fileAssetId: true,
          type: true,
          status: true,
          title: true,
          code: true,
          issuedAt: true,
          effectiveFrom: true,
          expiresAt: true,
          renewalReminderDays: true,
          isRequired: true,
          verifiedAt: true,
          verifiedByUserId: true,
          notes: true,
          metadata: true,
          deletedAt: true,
          createdAt: true,
          updatedAt: true,
          location: { select: { id: true, name: true, type: true } },
          fileAsset: { select: { id: true, storageKey: true, originalName: true, mimeType: true, sizeBytes: true, createdAt: true } }
        }
      }
    }
  });

  if (!row) return null;
  if (!input.includeArchived && row.deletedAt) return null;

  return row;
}
