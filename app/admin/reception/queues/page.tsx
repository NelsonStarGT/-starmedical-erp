import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserFromCookies } from "@/lib/auth";
import { QueueBoard } from "@/components/reception/QueueBoard";
import { actionGetQueueBoardSnapshot } from "@/app/admin/reception/actions";
import { buildReceptionContext } from "@/lib/reception/rbac";
import { resolveActiveBranchStrict } from "@/lib/branch/activeBranch";
import { RECEPTION_AREAS, type ReceptionArea } from "@/lib/reception/constants";

export default async function ReceptionQueuesPage({
  searchParams
}: {
  searchParams?: { area?: string | string[] };
}) {
  const cookieStore = await cookies();
  const user = await getSessionUserFromCookies(cookieStore);
  if (!user) redirect("/login");
  const context = buildReceptionContext(user);
  const siteId = await resolveActiveBranchStrict(user, cookieStore);
  if (!siteId) {
    return (
      <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
        Selecciona una sede activa en el encabezado para monitorear colas.
      </div>
    );
  }

  const snapshot = await actionGetQueueBoardSnapshot(siteId);
  const rawArea = Array.isArray(searchParams?.area) ? searchParams?.area[0] : searchParams?.area;
  const focusArea = rawArea && (RECEPTION_AREAS as readonly string[]).includes(rawArea)
    ? (rawArea as ReceptionArea)
    : null;

  return (
    <QueueBoard
      key={siteId}
      siteId={siteId}
      initialData={snapshot}
      capabilities={context.capabilities}
      focusArea={focusArea}
    />
  );
}
