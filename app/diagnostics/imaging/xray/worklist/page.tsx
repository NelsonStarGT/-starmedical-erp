import ImagingWorklistClient from "@/app/diagnostics/imaging/worklist/WorklistClient";
import { listImagingWorklist } from "@/lib/server/diagnostics.service";

export const runtime = "nodejs";

export default async function ImagingXrayWorklistPage() {
  const initialOrders = await listImagingWorklist("XR");
  return <ImagingWorklistClient initialOrders={initialOrders} modality="XR" />;
}
