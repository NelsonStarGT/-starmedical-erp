import { redirect } from "next/navigation";

export default function CrmIndexPage() {
  redirect("/admin/crm/inbox?type=b2b");
}
