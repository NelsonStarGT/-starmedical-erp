import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserFromCookies } from "@/lib/auth";
import { buildReceptionContext } from "@/lib/reception/rbac";
import { resolveActiveBranchStrict } from "@/lib/branch/activeBranch";
import { actionListPortalAppointmentRequests } from "@/app/admin/reception/actions";
import PortalRequestsClient from "@/app/admin/reception/PortalRequestsClient";

export default async function ReceptionPortalRequestsPage() {
  const cookieStore = await cookies();
  const user = await getSessionUserFromCookies(cookieStore);
  if (!user) redirect("/login");

  const context = buildReceptionContext(user);
  const siteId = await resolveActiveBranchStrict(user, cookieStore);

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
