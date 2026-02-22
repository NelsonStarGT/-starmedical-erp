import OrdersClient from "./OrdersClient";
import { listCatalogItems, listOrders } from "@/lib/server/diagnostics.service";

export const runtime = "nodejs";

export default async function DiagnosticsOrdersPage() {
  const initialOrders = await listOrders();
  const initialCatalog = await listCatalogItems(false);
  return <OrdersClient initialOrders={initialOrders} initialCatalog={initialCatalog} />;
}
