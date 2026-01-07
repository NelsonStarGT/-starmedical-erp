import { redirect } from "next/navigation";

export default function CrmLegacySettingsRedirect() {
  redirect("/admin/crm/settings");
}

