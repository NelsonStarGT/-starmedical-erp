import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserFromCookies } from "@/lib/auth";
import { canAccessOpsHealth } from "@/lib/ops/rbac";
import OpsAlertsPanel from "@/components/configuracion/OpsAlertsPanel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OpsAlertasPage() {
  const user = await getSessionUserFromCookies(cookies());
  if (!user) redirect("/login");

  if (!canAccessOpsHealth(user)) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        No autorizado. Esta vista requiere rol <span className="font-semibold">SUPER_ADMIN</span> u{" "}
        <span className="font-semibold">OPS</span>.
      </div>
    );
  }

  return <OpsAlertsPanel />;
}
