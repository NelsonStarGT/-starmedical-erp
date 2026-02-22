import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserFromCookies } from "@/lib/auth";
import { buildReceptionContext } from "@/lib/reception/rbac";
import { resolveActiveBranchStrict } from "@/lib/branch/activeBranch";
import AppointmentIntakeForm from "@/components/reception/AppointmentIntakeForm";

export default async function ReceptionAppointmentsPage() {
  const cookieStore = await cookies();
  const user = await getSessionUserFromCookies(cookieStore);
  if (!user) redirect("/login");
  const context = buildReceptionContext(user);
  const siteId = await resolveActiveBranchStrict(user, cookieStore);

  return (
    <div className="space-y-4">
      <AppointmentIntakeForm siteId={siteId} capabilities={context.capabilities} />
    </div>
  );
}
