import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserFromCookies } from "@/lib/auth";
import { CheckInForm } from "@/components/reception/CheckInForm";
import { buildReceptionContext } from "@/lib/reception/rbac";
import { resolveActiveBranchStrict } from "@/lib/branch/activeBranch";

export default async function ReceptionCheckInPage({
  searchParams
}: {
  searchParams?: { mode?: string; q?: string };
}) {
  const mode = searchParams?.mode === "existing" ? "existing" : "new";
  const initialQuery = searchParams?.q ?? "";
  const cookieStore = await cookies();
  const user = await getSessionUserFromCookies(cookieStore);
  if (!user) redirect("/login");
  const context = buildReceptionContext(user);
  const siteId = await resolveActiveBranchStrict(user, cookieStore);

  return (
    <div className="space-y-4">
      <CheckInForm siteId={siteId} capabilities={context.capabilities} mode={mode} initialQuery={initialQuery} />
    </div>
  );
}
