import IntakeClient from "./IntakeClient";
import { listCatalogItems } from "@/lib/server/diagnostics.service";

export const runtime = "nodejs";

export default async function DiagnosticsIntakePage() {
  const catalog = await listCatalogItems(false);
  return <IntakeClient catalog={catalog} />;
}
