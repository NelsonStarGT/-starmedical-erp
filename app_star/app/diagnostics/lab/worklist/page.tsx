import LabWorklistClient from "./WorklistClient";
import { listLabWorklist } from "@/lib/server/diagnostics.service";

export const runtime = "nodejs";

export default async function LabWorklistPage() {
  const initialOrders = await listLabWorklist();
  return <LabWorklistClient initialOrders={initialOrders} />;
}
