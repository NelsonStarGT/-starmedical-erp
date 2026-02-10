import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserFromCookies } from "@/lib/auth";
import { buildReceptionContext } from "@/lib/reception/rbac";
import { RECEPTION_ACTIVE_BRANCH_COOKIE_NAME, resolveReceptionBranchId } from "@/lib/reception/active-branch";
import { actionListPortalAppointmentRequests } from "@/app/admin/reception/actions";
import PortalRequestsClient from "@/app/admin/reception/PortalRequestsClient";

export default async function ReceptionPortalRequestsPage() {
  const cookieStore = await cookies();
  const user = await getSessionUserFromCookies(cookieStore);
  if (!user) redirect("/login");

  const context = buildReceptionContext(user);
  const siteId = resolveReceptionBranchId(user, {
    cookieBranchId: cookieStore.get(RECEPTION_ACTIVE_BRANCH_COOKIE_NAME)?.value ?? null
  });

  const initialScope = "all" as const;
  const rows = await actionListPortalAppointmentRequests({
    siteId: siteId ?? undefined,
    scope: initialScope
  });

  return (
    <PortalRequestsClient
      activeSiteId={siteId}
      capabilities={context.capabilities}
      initialRows={rows}
      initialScope={initialScope}
    />
  );
}
