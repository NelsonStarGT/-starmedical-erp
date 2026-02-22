import WorklistClient from "./WorklistClient";
import { listImagingWorklist } from "@/lib/server/diagnostics.service";

export const runtime = "nodejs";

export default async function ImagingWorklistPage() {
  const initialOrders = await listImagingWorklist();
  return <WorklistClient initialOrders={initialOrders} />;
}
