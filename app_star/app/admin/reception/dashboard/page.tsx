import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserFromCookies } from "@/lib/auth";
import { buildReceptionContext } from "@/lib/reception/rbac";
import { resolveActiveBranchStrict } from "@/lib/branch/activeBranch";
import { actionGetReceptionDashboardLite } from "@/app/admin/reception/actions";
import DashboardClient from "@/app/admin/reception/DashboardClient";

export default async function ReceptionDashboardPage() {
  const cookieStore = await cookies();
  const user = await getSessionUserFromCookies(cookieStore);
  if (!user) redirect("/login");
  const context = buildReceptionContext(user);
  const siteId = await resolveActiveBranchStrict(user, cookieStore);

  if (!siteId) {
    return (
      <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
        Selecciona una sede activa en el encabezado para ver el dashboard.
      </div>
    );
  }

  const snapshot = await actionGetReceptionDashboardLite(siteId);

  return <DashboardClient siteId={siteId} capabilities={context.capabilities} initialSnapshot={snapshot} />;
}
