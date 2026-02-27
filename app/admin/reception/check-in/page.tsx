import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserFromCookies } from "@/lib/auth";
import { CheckInForm } from "@/components/reception/CheckInForm";
import { buildReceptionContext } from "@/lib/reception/rbac";
import { resolveActiveBranchStrict } from "@/lib/branch/activeBranch";

export default async function ReceptionCheckInPage({
  searchParams
}: {
  searchParams?: { mode?: string | string[]; q?: string | string[]; clientId?: string | string[] };
}) {
  const rawMode = Array.isArray(searchParams?.mode) ? searchParams?.mode[0] : searchParams?.mode;
  const rawQuery = Array.isArray(searchParams?.q) ? searchParams?.q[0] : searchParams?.q;
  const rawClientId = Array.isArray(searchParams?.clientId) ? searchParams?.clientId[0] : searchParams?.clientId;
  const clientId = rawClientId?.trim() ?? "";
  const initialQuery = (rawQuery?.trim() || clientId || "");
  const mode = rawMode === "new" ? "new" : initialQuery ? "existing" : "new";
  const autoSearch = Boolean(clientId);
  const cookieStore = await cookies();
  const user = await getSessionUserFromCookies(cookieStore);
  if (!user) redirect("/login");
  const context = buildReceptionContext(user);
  const siteId = await resolveActiveBranchStrict(user, cookieStore);

  return (
    <div className="space-y-4">
      <CheckInForm
        siteId={siteId}
        capabilities={context.capabilities}
        mode={mode}
        initialQuery={initialQuery}
        autoSearch={autoSearch}
      />
    </div>
  );
}
