import { redirect } from "next/navigation";

export default function FacturacionBandejaIndexPage() {
  redirect("/admin/facturacion/bandeja/PENDIENTES_COBRO");
}
