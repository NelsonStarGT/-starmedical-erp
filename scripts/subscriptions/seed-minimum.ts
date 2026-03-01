#!/usr/bin/env tsx
import { PrismaClient, MembershipPlanSegment, MembershipBenefitServiceType } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SEED: Array<{ name: string; segment: MembershipPlanSegment; sortOrder: number }> = [
  { name: "Individual", segment: MembershipPlanSegment.B2C, sortOrder: 10 },
  { name: "Escolar", segment: MembershipPlanSegment.B2C, sortOrder: 20 },
  { name: "Familiar", segment: MembershipPlanSegment.B2C, sortOrder: 30 },
  { name: "Familiar Plus", segment: MembershipPlanSegment.B2C, sortOrder: 40 },
  { name: "Empresarial", segment: MembershipPlanSegment.B2B, sortOrder: 50 }
];

const DURATION_SEED = [
  { name: "15 días", days: 15, sortOrder: 10 },
  { name: "30 días", days: 30, sortOrder: 20 },
  { name: "3 meses", days: 90, sortOrder: 30 },
  { name: "6 meses", days: 180, sortOrder: 40 },
  { name: "12 meses", days: 365, sortOrder: 50 }
] as const;

const BENEFIT_SEED: Array<{ title: string; serviceType: MembershipBenefitServiceType; sortOrder: number; iconKey: string }> = [
  { title: "Consulta general", serviceType: MembershipBenefitServiceType.CONSULTA, sortOrder: 10, iconKey: "stethoscope" },
  { title: "Hemograma", serviceType: MembershipBenefitServiceType.LAB, sortOrder: 20, iconKey: "flask-conical" },
  { title: "Rx tórax", serviceType: MembershipBenefitServiceType.RX, sortOrder: 30, iconKey: "scan-line" },
  { title: "Audiometría", serviceType: MembershipBenefitServiceType.AUDIOLOGIA, sortOrder: 40, iconKey: "ear" }
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("[subscriptions:seed-minimum] bloqueado en production.");
  }

  for (const category of CATEGORY_SEED) {
    await prisma.membershipPlanCategory.upsert({
      where: {
        name_segment: {
          name: category.name,
          segment: category.segment
        }
      },
      update: {
        isActive: true,
        sortOrder: category.sortOrder
      },
      create: {
        name: category.name,
        segment: category.segment,
        isActive: true,
        sortOrder: category.sortOrder
      }
    });
  }

  for (const preset of DURATION_SEED) {
    const existingPreset = await prisma.membershipDurationPreset.findFirst({
      where: { branchId: null, name: preset.name }
    });

    if (existingPreset) {
      await prisma.membershipDurationPreset.update({
        where: { id: existingPreset.id },
        data: {
          days: preset.days,
          isActive: true,
          sortOrder: preset.sortOrder
        }
      });
    } else {
      await prisma.membershipDurationPreset.create({
        data: {
          name: preset.name,
          days: preset.days,
          branchId: null,
          isActive: true,
          sortOrder: preset.sortOrder
        }
      });
    }
  }

  for (const benefit of BENEFIT_SEED) {
    const existingBenefit = await prisma.membershipBenefitCatalog.findFirst({
      where: { branchId: null, title: benefit.title, serviceType: benefit.serviceType }
    });

    if (existingBenefit) {
      await prisma.membershipBenefitCatalog.update({
        where: { id: existingBenefit.id },
        data: {
          iconKey: benefit.iconKey,
          isActive: true,
          sortOrder: benefit.sortOrder
        }
      });
    } else {
      await prisma.membershipBenefitCatalog.create({
        data: {
          title: benefit.title,
          serviceType: benefit.serviceType,
          branchId: null,
          iconKey: benefit.iconKey,
          isActive: true,
          sortOrder: benefit.sortOrder
        }
      });
    }
  }

  const [categories, durations, benefits] = await Promise.all([
    prisma.membershipPlanCategory.count({
      where: {
        OR: CATEGORY_SEED.map((row) => ({ name: row.name, segment: row.segment }))
      }
    }),
    prisma.membershipDurationPreset.count({
      where: {
        OR: DURATION_SEED.map((row) => ({ name: row.name, branchId: null }))
      }
    }),
    prisma.membershipBenefitCatalog.count({
      where: {
        OR: BENEFIT_SEED.map((row) => ({ title: row.title, serviceType: row.serviceType, branchId: null }))
      }
    })
  ]);

  console.info(`[subscriptions:seed-minimum] categories=${categories} durations=${durations} benefits=${benefits}`);
}

main()
  .catch((error) => {
    console.error("[subscriptions:seed-minimum] failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
