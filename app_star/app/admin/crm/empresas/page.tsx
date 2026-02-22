import { redirect } from "next/navigation";

export default function CrmEmpresasRedirect() {
  redirect("/admin/crm/inbox?type=b2b");
}
