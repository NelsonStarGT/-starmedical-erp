import { redirect } from "next/navigation";

export default function CrmDashboardRedirect() {
  redirect("/admin/crm/inbox?type=b2b");
}
