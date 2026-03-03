import { redirect } from "next/navigation";

export default function MembershipRenewalsPage() {
  redirect("/admin/suscripciones/membresias/afiliaciones/pacientes?renewWindowDays=30");
}
