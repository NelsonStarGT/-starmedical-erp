import { cookies } from "next/headers";
import { getSessionUserFromCookies } from "@/lib/auth";
import { getLabRoleForUser } from "@/lib/labtest/access";
import UsersClient from "./UsersClient";

export const runtime = "nodejs";

export default async function LabUsersSettingsPage() {
  const user = await getSessionUserFromCookies(cookies());
  const role = user ? await getLabRoleForUser(user.id, user.branchId) : null;
  const canEdit = role === "LAB_ADMIN" || role === "LAB_SUPERVISOR";

  if (!role) {
    return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Sin acceso a LabTest.</div>;
  }

  return <UsersClient canEdit={canEdit} />;
}
