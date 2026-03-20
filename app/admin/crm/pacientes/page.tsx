import { redirect } from "next/navigation";

export default function CrmPacientesRedirect() {
  redirect("/admin/crm/inbox?type=b2c");
}
