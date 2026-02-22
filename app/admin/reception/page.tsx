import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserFromCookies } from "@/lib/auth";
import { WorklistTable } from "@/components/reception/WorklistTable";
import { actionGetReceptionWorklist } from "@/app/admin/reception/actions";
import { buildReceptionContext } from "@/lib/reception/rbac";
import { resolveActiveBranchStrict } from "@/lib/branch/activeBranch";

export default async function ReceptionDashboardPage() {
  const cookieStore = await cookies();
  const user = await getSessionUserFromCookies(cookieStore);
  if (!user) redirect("/login");

  const context = buildReceptionContext(user);
  const siteId = await resolveActiveBranchStrict(user, cookieStore);

  if (!siteId) {
    return (
      <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
        Selecciona una sede activa en el encabezado para iniciar operación.
      </div>
    );
  }

  const snapshot = await actionGetReceptionWorklist({ siteId });

  return (
    <WorklistTable
      key={siteId}
      siteId={siteId}
      initialItems={snapshot.items}
      initialNextByArea={snapshot.nextQueueItemByArea}
      capabilities={context.capabilities}
    />
  );
}
