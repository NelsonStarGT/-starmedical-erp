import { getLabTestSettings } from "@/lib/labtest/settings";
import { isMissingLabTableError } from "@/lib/labtest/dbGuard";
import { getSessionUserFromCookies } from "@/lib/auth";
import { cookies } from "next/headers";
import { getLabRoleForUser } from "@/lib/labtest/access";
import SettingsClient from "./SettingsClient";

export const runtime = "nodejs";

export default async function LabSettingsPage() {
  let settings = null;
  const user = await getSessionUserFromCookies(cookies());
  const role = user ? await getLabRoleForUser(user.id, user.branchId) : null;
  const canEdit = role === "LAB_ADMIN" || role === "LAB_SUPERVISOR";
  try {
    settings = await getLabTestSettings();
  } catch (err: any) {
    if (!isMissingLabTableError(err)) {
      throw err;
    }
  }
  return <SettingsClient initialData={settings} canEdit={!!canEdit} />;
}
