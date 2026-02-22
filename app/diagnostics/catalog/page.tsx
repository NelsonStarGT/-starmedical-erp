import CatalogClient from "./CatalogClient";
import { listCatalogItems } from "@/lib/server/diagnostics.service";

export const runtime = "nodejs";

export default async function DiagnosticsCatalogPage() {
  const items = await listCatalogItems(true);
  return <CatalogClient initialItems={items} />;
}
