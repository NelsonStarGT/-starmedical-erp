import { OperationalArea, PrismaClient, QueueStatus } from "@prisma/client";
import { isPrismaMissingTableError } from "../lib/prisma/errors";

const prisma = new PrismaClient();

async function main() {
  console.info("[seed:core] Ensuring reception queues exist for each branch...");

  const branches = await prisma.branch.findMany({
    select: { id: true, name: true, isActive: true }
  });

  if (branches.length === 0) {
    console.warn("[seed:core] No branches found. Skipping (no fake data will be created).");
    return;
  }

  const areas = Object.values(OperationalArea);
  const data = branches.flatMap((branch) =>
    areas.map((area) => ({
      siteId: branch.id,
      area,
      status: QueueStatus.ACTIVE
    }))
  );

  const result = await prisma.queue.createMany({
    data,
    skipDuplicates: true
  });

  console.info(
    `[seed:core] Branches=${branches.length} Areas=${areas.length} QueuesCreated=${result.count} (idempotent)`
  );
}

main()
  .catch((error) => {
    if (isPrismaMissingTableError(error)) {
      console.error("[seed:core] Missing tables (P2021). Run migrations first: `npm run db:migrate:deploy`.");
    } else {
      console.error("[seed:core] Failed:", error);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

