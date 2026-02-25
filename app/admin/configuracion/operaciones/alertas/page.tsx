import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ConfigAccessDeniedCard from "@/components/configuracion/ConfigAccessDeniedCard";
import { getSessionUserFromCookies } from "@/lib/auth";
import OpsAlertsPanel from "@/components/configuracion/OpsAlertsPanel";
import { canAccessConfigOps } from "@/lib/security/configCapabilities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OpsAlertasPage() {
  const user = await getSessionUserFromCookies(cookies());
  if (!user) redirect("/login");

  if (!canAccessConfigOps(user)) {
    return (
      <ConfigAccessDeniedCard
        sectionLabel="Operaciones · Historial y alertas"
        requirementLabel="rol SUPER_ADMIN u OPS"
      />
    );
  }

  return <OpsAlertsPanel />;
}
