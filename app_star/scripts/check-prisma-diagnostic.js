import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const hasModel = !!prisma.diagnosticOrder;
  console.log("diagnosticOrder exists:", hasModel);
}

main()
  .catch((err) => {
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
