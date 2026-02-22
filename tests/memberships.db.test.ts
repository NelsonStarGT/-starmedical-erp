import test from "node:test";
import assert from "node:assert/strict";
import { MembershipStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createContract,
  createPlan,
  createPlanCategory,
  getMembershipDashboard,
  registerContractPayment,
  subscribePublicMembership
} from "@/lib/memberships/service";

function rand(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

test("memberships v2: categorías + plan + dashboard + subscribe + payment guard", async (t) => {
  const created: {
    categoryId?: string;
    planId?: string;
    ownerClientId?: string;
    suspendedContractId?: string;
    activeContractId?: string;
    subscribeContractId?: string;
    legalEntityId?: string;
  } = {};

  try {
    try {
      await prisma.$queryRawUnsafe('SELECT "segment" FROM "MembershipPlan" LIMIT 1');
    } catch {
      t.skip("Esquema de membresías v2 no migrado en DB local");
      return;
    }

    const legalEntity = await prisma.legalEntity.create({
      data: {
        name: rand("Membership Test LE"),
        comercialName: "Membership QA",
        nit: String(Date.now()).slice(-8),
        isActive: true
      }
    });
    created.legalEntityId = legalEntity.id;

    const category = await createPlanCategory({
      name: rand("Cat QA B2C"),
      segment: "B2C",
      sortOrder: 1,
      isActive: true
    });
    created.categoryId = category.id;

    const plan = await createPlan({
      name: rand("Plan QA"),
      slug: rand("plan-qa").toLowerCase(),
      description: "Plan QA",
      type: "INDIVIDUAL",
      segment: "B2C",
      categoryId: category.id,
      imageUrl: "https://example.com/plan-qa.png",
      active: true,
      priceMonthly: 99,
      priceAnnual: 999,
      currency: "GTQ",
      maxDependents: 3
    });
    created.planId = plan.id;

    assert.equal(plan.categoryId, category.id);
    assert.equal(plan.imageUrl, "https://example.com/plan-qa.png");

    const owner = await prisma.clientProfile.create({
      data: {
        type: "PERSON",
        firstName: "QA",
        lastName: "Membership",
        email: `${rand("qa-membership")}@starmedical.test`,
        phone: `502${Math.floor(10000000 + Math.random() * 89999999)}`
      }
    });
    created.ownerClientId = owner.id;

    const activeContract = await createContract(
      {
        ownerType: "PERSON",
        ownerId: owner.id,
        planId: plan.id,
        status: "ACTIVO",
        startAt: new Date(),
        billingFrequency: "MONTHLY",
        channel: "TEST"
      },
      null
    );
    created.activeContractId = activeContract.id;

    const dashboard = await getMembershipDashboard(null);
    assert.ok(Array.isArray(dashboard.categories));
    assert.ok(dashboard.categories.some((item) => item.categoryId === category.id));

    const suspendedContract = await createContract(
      {
        ownerType: "PERSON",
        ownerId: owner.id,
        planId: plan.id,
        status: "SUSPENDIDO",
        startAt: new Date(),
        billingFrequency: "MONTHLY",
        channel: "TEST"
      },
      null
    );
    created.suspendedContractId = suspendedContract.id;

    await registerContractPayment(
      suspendedContract.id,
      {
        amount: 50,
        method: "CASH",
        kind: "RENEWAL",
        status: "PAID",
        refNo: rand("PAY")
      },
      null
    );

    const suspendedAfterPayment = await prisma.membershipContract.findUnique({ where: { id: suspendedContract.id } });
    assert.equal(suspendedAfterPayment?.status, MembershipStatus.SUSPENDIDO);

    const idempotencyKey = rand("sub-web");
    const firstSubscribe = await subscribePublicMembership({
      idempotencyKey,
      planId: plan.id,
      segment: "B2C",
      categoryId: category.id,
      channel: "WEB",
      customer: {
        type: "PERSON",
        firstName: "Web",
        lastName: "Customer",
        email: `${rand("web-customer")}@starmedical.test`,
        phone: `502${Math.floor(10000000 + Math.random() * 89999999)}`
      }
    });

    created.subscribeContractId = firstSubscribe.contractId;
    assert.ok(firstSubscribe.contractId);
    assert.ok(firstSubscribe.nextStepUrl.includes("contractId="));

    const subscribedContract = await prisma.membershipContract.findUnique({ where: { id: firstSubscribe.contractId } });
    assert.equal(subscribedContract?.status, MembershipStatus.PENDIENTE);

    const secondSubscribe = await subscribePublicMembership({
      idempotencyKey,
      planId: plan.id,
      segment: "B2C",
      categoryId: category.id,
      channel: "WEB",
      customer: {
        type: "PERSON",
        firstName: "Web",
        lastName: "Customer",
        email: `${rand("web-customer-ignored")}@starmedical.test`
      }
    });

    assert.equal(secondSubscribe.contractId, firstSubscribe.contractId);
  } finally {
    const contractIds = [created.activeContractId, created.suspendedContractId, created.subscribeContractId].filter(Boolean) as string[];

    if (contractIds.length) {
      await prisma.membershipPayment.deleteMany({ where: { contractId: { in: contractIds } } }).catch(() => {});
      await prisma.membershipPublicSubscriptionRequest.deleteMany({ where: { contractId: { in: contractIds } } }).catch(() => {});
      await prisma.membershipContract.deleteMany({ where: { id: { in: contractIds } } }).catch(() => {});
    }

    if (created.ownerClientId) {
      await prisma.clientProfile.deleteMany({ where: { id: created.ownerClientId } }).catch(() => {});
    }

    if (created.planId) {
      await prisma.membershipPlan.deleteMany({ where: { id: created.planId } }).catch(() => {});
    }

    if (created.categoryId) {
      await prisma.membershipPlanCategory.deleteMany({ where: { id: created.categoryId } }).catch(() => {});
    }

    if (created.legalEntityId) {
      await prisma.legalEntity.deleteMany({ where: { id: created.legalEntityId } }).catch(() => {});
    }
  }
});
