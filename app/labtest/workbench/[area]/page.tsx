import { prisma } from "@/lib/prisma";
import { listWorkbench } from "@/lib/server/labtest.service";
import { isMissingLabTableError } from "@/lib/labtest/dbGuard";
import WorkbenchAreaClient from "../WorkbenchAreaClient";
import { getLabTestSettings } from "@/lib/labtest/settings";
import { redirect } from "next/navigation";
import { slugToArea } from "@/lib/labtest/areas";

export const runtime = "nodejs";

export default async function WorkbenchAreaPage({ params }: { params: { area: string } }) {
  const area = slugToArea[params.area];
  if (!area) redirect("/labtest/workbench");

  let labReady = true;
  let items: Awaited<ReturnType<typeof listWorkbench>> = [];
  const settings = await getLabTestSettings();

  try {
    items = await listWorkbench(area);
  } catch (err: any) {
    if (isMissingLabTableError(err)) {
      labReady = false;
      items = [];
    } else {
      throw err;
    }
  }

  try {
    await prisma.labTestItem.count();
  } catch (err: any) {
    if (isMissingLabTableError(err)) labReady = false;
  }

  return (
    <WorkbenchAreaClient
      area={area}
      areaSlug={params.area}
      items={items}
      labReady={labReady}
      sla={{ routine: settings.slaRoutineMin, urgent: settings.slaUrgentMin, stat: settings.slaStatMin }}
      autoInProcess={settings.workbenchAutoInProcess}
    />
  );
}
