import { prisma } from "@/lib/prisma";
import { listRequirements } from "@/lib/server/labtest.service";
import RequirementsClient from "../requirements/RequirementsClient";
import { isMissingLabTableError } from "@/lib/labtest/dbGuard";

export const runtime = "nodejs";

export default async function OrdersPage() {
  let labReady = true;
  let initial: any[] = [];

  try {
    initial = await listRequirements();
  } catch (err: any) {
    if (isMissingLabTableError(err)) {
      labReady = false;
      initial = [];
    } else {
      throw err;
    }
  }

  try {
    await prisma.labTestOrder.count();
  } catch (err: any) {
    if (isMissingLabTableError(err)) labReady = false;
  }

  return <RequirementsClient initialData={initial} labReady={labReady} />;
}
