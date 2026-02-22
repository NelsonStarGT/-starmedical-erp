import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserFromCookies } from "@/lib/auth";
import { buildReceptionContext } from "@/lib/reception/rbac";
import { resolveActiveBranchStrict } from "@/lib/branch/activeBranch";
import { actionGetReceptionSlaSettings, actionListReceptionSlaAudit } from "@/app/admin/reception/actions";
import ReceptionSettingsPanel from "@/components/reception/ReceptionSettingsPanel";

export default async function ReceptionSettingsPage() {
  const cookieStore = await cookies();
  const user = await getSessionUserFromCookies(cookieStore);
  if (!user) redirect("/login");

  const context = buildReceptionContext(user);
  const siteId = await resolveActiveBranchStrict(user, cookieStore);

  if (!siteId) {
    return (
      <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
        Selecciona una sede activa para configurar timings SLA.
      </div>
    );
  }

  const [policy, audit] = await Promise.all([
    actionGetReceptionSlaSettings(siteId),
    actionListReceptionSlaAudit(siteId)
  ]);

  return <ReceptionSettingsPanel siteId={siteId} capabilities={context.capabilities} initialPolicy={policy} initialAudit={audit} />;
}
