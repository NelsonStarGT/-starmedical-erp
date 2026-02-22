import ImagingWorklistClient from "@/app/diagnostics/imaging/worklist/WorklistClient";
import { listImagingWorklist } from "@/lib/server/diagnostics.service";

export const runtime = "nodejs";

export default async function ImagingUltrasoundWorklistPage() {
  const initialOrders = await listImagingWorklist("US");
  return <ImagingWorklistClient initialOrders={initialOrders} modality="US" />;
}
