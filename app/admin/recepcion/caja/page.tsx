import CashierV1 from "@/components/recepcion/CashierV1";
import { requireRecepcionCapability } from "@/lib/recepcion/server";

export default async function RecepcionCajaPage() {
  const { access } = await requireRecepcionCapability("RECEPTION_CASHIER_VIEW");

  return <CashierV1 canWrite={access.canWriteCashier} />;
}
