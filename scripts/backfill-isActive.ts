import { HrEmployeeStatus, OnboardingStatus, Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const onboardingToDraft = await prisma.hrEmployee.count({
    where: { onboardingStatus: { equals: null as unknown as OnboardingStatus } }
  });
  const activateWhere: Prisma.HrEmployeeWhereInput = {
    status: HrEmployeeStatus.ACTIVE,
    onboardingStatus: OnboardingStatus.ACTIVE,
    OR: [{ isActive: { equals: false } }, { isActive: null as any }]
  };
  const toActivate = await prisma.hrEmployee.count({ where: activateWhere });
  const deactivateWhere: Prisma.HrEmployeeWhereInput = {
    OR: [{ status: { not: HrEmployeeStatus.ACTIVE } }, { onboardingStatus: { not: OnboardingStatus.ACTIVE } }],
    NOT: [{ isActive: false as any }]
  };
  const toDeactivate = await prisma.hrEmployee.count({ where: deactivateWhere });

  console.log(
    `[backfill-isActive] dryRun=${dryRun} | onboarding null->DRAFT=${onboardingToDraft} | isActive->true=${toActivate} | isActive->false=${toDeactivate}`
  );

  if (dryRun) return;

  if (onboardingToDraft) {
    await prisma.hrEmployee.updateMany({
      where: { onboardingStatus: { equals: null as unknown as OnboardingStatus } },
      data: { onboardingStatus: OnboardingStatus.DRAFT }
    });
  }
  if (toActivate) {
    await prisma.hrEmployee.updateMany({ where: activateWhere, data: { isActive: true } });
  }
  if (toDeactivate) {
    await prisma.hrEmployee.updateMany({ where: deactivateWhere, data: { isActive: false } });
  }

  const finalActive = await prisma.hrEmployee.count({
    where: { status: HrEmployeeStatus.ACTIVE, onboardingStatus: OnboardingStatus.ACTIVE, isActive: true }
  });
  console.log(`[backfill-isActive] Final active legacy flag count=${finalActive}`);
}

main()
  .catch((err) => {
    console.error("[backfill-isActive] failed", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
