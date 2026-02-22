import { prisma } from "@/lib/prisma";
import { listResultsBandeja } from "@/lib/server/labtest.service";
import ResultsClient from "./ResultsClient";
import { isMissingLabTableError } from "@/lib/labtest/dbGuard";

export const runtime = "nodejs";

export default async function ResultsPage() {
  let labReady = true;
  let initial: any[] = [];

  try {
    initial = await listResultsBandeja();
  } catch (err: any) {
    if (isMissingLabTableError(err)) {
      labReady = false;
      initial = [];
    } else {
      throw err;
    }
  }

  try {
    await prisma.labTestItem.count();
  } catch (err: any) {
    if (isMissingLabTableError(err)) labReady = false;
  }

  return <ResultsClient initialData={initial} labReady={labReady} />;
}
