import test from "node:test";
import assert from "node:assert/strict";
import { ClientAffiliationStatus, ClientProfileType } from "@prisma/client";
import { actionRestoreClientProfile, actionSoftDeleteClientProfile } from "@/app/admin/clientes/actions";
import { prisma } from "@/lib/prisma";

type ClientRecord = {
  id: string;
  type: ClientProfileType;
  deletedAt: Date | null;
};

type AffiliationRecord = {
  id: string;
  personClientId: string;
  deletedAt: Date | null;
  status: ClientAffiliationStatus;
  isPrimaryPayer: boolean;
};

type PersonCompanyLinkRecord = {
  id: string;
  personId: string;
  companyId: string;
  deletedAt: Date | null;
  isActive: boolean;
  isPrimary: boolean;
  endAt: Date | null;
};

const actorUser = {
  id: "admin-1",
  email: "admin@starmedical.test",
  name: "Admin",
  roles: ["ADMIN"],
  permissions: []
};

function setupPrismaMock(params: {
  clients: ClientRecord[];
  affiliations?: AffiliationRecord[];
  personCompanyLinks?: PersonCompanyLinkRecord[];
}) {
  const clients = params.clients.map((item) => ({ ...item }));
  const affiliations = (params.affiliations ?? []).map((item) => ({ ...item }));
  const personCompanyLinks = (params.personCompanyLinks ?? []).map((item) => ({ ...item }));
  const audits: any[] = [];
  const timeline: any[] = [];

  const tx = {
    clientProfile: {
      findFirst: async ({ where }: any) => {
        return (
          clients.find((client) => {
            if (where?.id && client.id !== where.id) return false;
            if (Object.prototype.hasOwnProperty.call(where ?? {}, "deletedAt")) {
              return client.deletedAt === where.deletedAt;
            }
            return true;
          }) ?? null
        );
      },
      findUnique: async ({ where }: any) => clients.find((client) => client.id === where.id) ?? null,
      update: async ({ where, data, select }: any) => {
        const current = clients.find((client) => client.id === where.id);
        if (!current) throw new Error("not found");
        Object.assign(current, data);
        if (!select) return current;
        return Object.fromEntries(Object.keys(select).map((key) => [key, (current as any)[key]]));
      }
    },
    clientAffiliation: {
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        affiliations.forEach((affiliation) => {
          const matchPerson = !where?.personClientId || affiliation.personClientId === where.personClientId;
          const matchDeletedAt =
            !Object.prototype.hasOwnProperty.call(where ?? {}, "deletedAt") || affiliation.deletedAt === where.deletedAt;
          if (!matchPerson || !matchDeletedAt) return;
          Object.assign(affiliation, data);
          count += 1;
        });
        return { count };
      }
    },
    personCompanyLink: {
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        personCompanyLinks.forEach((link) => {
          const matchPerson = !where?.personId || link.personId === where.personId;
          const matchDeletedAt =
            !Object.prototype.hasOwnProperty.call(where ?? {}, "deletedAt") || link.deletedAt === where.deletedAt;
          if (!matchPerson || !matchDeletedAt) return;
          Object.assign(link, data);
          count += 1;
        });
        return { count };
      }
    },
    auditLog: {
      create: async ({ data }: any) => {
        audits.push(data);
        return data;
      }
    },
    clientAuditEvent: {
      create: async ({ data }: any) => {
        timeline.push(data);
        return data;
      }
    }
  } as any;

  const originalTransaction = prisma.$transaction;
  (prisma as any).$transaction = async (fn: any) => fn(tx);

  return {
    clients,
    affiliations,
    personCompanyLinks,
    audits,
    timeline,
    restore: () => {
      (prisma as any).$transaction = originalTransaction;
    }
  };
}

test("actionSoftDeleteClientProfile archiva cliente activo", async () => {
  const archivedAt = new Date("2026-02-06T16:00:00.000Z");
  const mock = setupPrismaMock({
    clients: [{ id: "c-person-1", type: ClientProfileType.PERSON, deletedAt: null }]
  });

  try {
    const result = await actionSoftDeleteClientProfile("c-person-1", "Depuración de duplicado", {
      actorUser,
      skipRevalidate: true,
      now: archivedAt
    });

    assert.equal(result.ok, true);
    assert.equal(mock.clients[0]?.deletedAt?.toISOString(), archivedAt.toISOString());
    assert.equal(mock.audits.length, 1);
    assert.equal(mock.timeline.length, 1);
    assert.equal(mock.audits[0]?.action, "CLIENT_PROFILE_SOFT_DELETED");
    assert.equal(mock.audits[0]?.metadata?.reason, "Depuración de duplicado");
  } finally {
    mock.restore();
  }
});

test("actionSoftDeleteClientProfile falla si cliente ya está archivado", async () => {
  const mock = setupPrismaMock({
    clients: [{ id: "c-person-2", type: ClientProfileType.PERSON, deletedAt: new Date("2026-01-01T00:00:00.000Z") }]
  });

  try {
    await assert.rejects(
      () =>
        actionSoftDeleteClientProfile("c-person-2", undefined, {
          actorUser,
          skipRevalidate: true
        }),
      /ya archivado/
    );
    assert.equal(mock.audits.length, 0);
  } finally {
    mock.restore();
  }
});

test("actionSoftDeleteClientProfile archiva afiliaciones cuando tipo PERSON", async () => {
  const archivedAt = new Date("2026-02-06T18:30:00.000Z");
  const mock = setupPrismaMock({
    clients: [{ id: "c-person-3", type: ClientProfileType.PERSON, deletedAt: null }],
    affiliations: [
      {
        id: "aff-1",
        personClientId: "c-person-3",
        deletedAt: null,
        status: ClientAffiliationStatus.ACTIVE,
        isPrimaryPayer: true
      }
    ],
    personCompanyLinks: [
      {
        id: "pcl-1",
        personId: "c-person-3",
        companyId: "c-company-3",
        deletedAt: null,
        isActive: true,
        isPrimary: true,
        endAt: null
      }
    ]
  });

  try {
    await actionSoftDeleteClientProfile("c-person-3", undefined, {
      actorUser,
      skipRevalidate: true,
      now: archivedAt
    });

    assert.equal(mock.affiliations[0]?.status, ClientAffiliationStatus.INACTIVE);
    assert.equal(mock.affiliations[0]?.isPrimaryPayer, false);
    assert.equal(mock.affiliations[0]?.deletedAt?.toISOString(), archivedAt.toISOString());
    assert.equal(mock.audits[0]?.metadata?.archivedAffiliations, 1);
    assert.equal(mock.personCompanyLinks[0]?.isActive, false);
    assert.equal(mock.personCompanyLinks[0]?.isPrimary, false);
    assert.equal(mock.personCompanyLinks[0]?.deletedAt?.toISOString(), archivedAt.toISOString());
    assert.equal(mock.personCompanyLinks[0]?.endAt?.toISOString(), archivedAt.toISOString());
    assert.equal(mock.audits[0]?.metadata?.archivedCompanyLinks, 1);
  } finally {
    mock.restore();
  }
});

test("actionRestoreClientProfile restaura cliente archivado", async () => {
  const originalDeletedAt = new Date("2026-02-01T11:00:00.000Z");
  const mock = setupPrismaMock({
    clients: [{ id: "c-company-1", type: ClientProfileType.COMPANY, deletedAt: originalDeletedAt }]
  });

  try {
    const result = await actionRestoreClientProfile("c-company-1", {
      actorUser,
      skipRevalidate: true
    });

    assert.equal(result.ok, true);
    assert.equal(mock.clients[0]?.deletedAt, null);
    assert.equal(mock.audits.length, 1);
    assert.equal(mock.timeline.length, 1);
    assert.equal(mock.audits[0]?.action, "CLIENT_PROFILE_RESTORED");
    assert.equal(mock.audits[0]?.before?.deletedAt, originalDeletedAt.toISOString());
    assert.equal(mock.audits[0]?.after?.deletedAt, null);
  } finally {
    mock.restore();
  }
});

test("actionRestoreClientProfile falla si cliente no está archivado", async () => {
  const mock = setupPrismaMock({
    clients: [{ id: "c-insurer-1", type: ClientProfileType.INSURER, deletedAt: null }]
  });

  try {
    await assert.rejects(
      () =>
        actionRestoreClientProfile("c-insurer-1", {
          actorUser,
          skipRevalidate: true
        }),
      /no está archivado/
    );
    assert.equal(mock.audits.length, 0);
  } finally {
    mock.restore();
  }
});
