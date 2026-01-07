import { redirect } from "next/navigation";

export default function CrmPacientesRedirect() {
  redirect("/admin/crm/pacientes/inicio");
}
