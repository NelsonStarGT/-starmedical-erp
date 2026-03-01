import { redirect } from "next/navigation";

export default function SubscriptionsGatewayPage() {
  redirect("/admin/suscripciones/membresias/configuracion?tab=pasarela");
}
