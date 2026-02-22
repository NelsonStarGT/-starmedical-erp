import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserFromCookies } from "@/lib/auth";
import { getAvailabilitySnapshot } from "@/lib/reception/dashboard.service";
import { resolveActiveBranchStrict } from "@/lib/branch/activeBranch";
import AvailabilityClient from "../AvailabilityClient";

export default async function ReceptionAvailabilityPage() {
  const cookieStore = await cookies();
  const user = await getSessionUserFromCookies(cookieStore);
  if (!user) redirect("/login");
  const siteId = await resolveActiveBranchStrict(user, cookieStore);
  if (!siteId) {
    return (
      <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
        Selecciona una sede activa en el encabezado para ver disponibilidad.
      </div>
    );
  }

  const snapshot = await getAvailabilitySnapshot({ siteId });
  return <AvailabilityClient key={siteId} siteId={siteId} initialSnapshot={snapshot} />;
}
