import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserFromCookies } from "@/lib/auth";
import { buildPortalCapabilities } from "@/lib/portales";
import { resolveActiveBranchStrict } from "@/lib/branch/activeBranch";
import { prisma } from "@/lib/prisma";
import PortalesControlCenterClient from "@/app/admin/portales/PortalesControlCenterClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminPortalesPage() {
  const cookieStore = await cookies();
  const user = await getSessionUserFromCookies(cookieStore);
  if (!user) redirect("/login");

  const capabilities = buildPortalCapabilities(user);
  let activeBranchId: string | null = null;
  let activeBranchName: string | null = null;

  try {
    activeBranchId = await resolveActiveBranchStrict(user, cookieStore);
  } catch {
    activeBranchId = null;
  }

  if (activeBranchId) {
    try {
      const branch = await prisma.branch.findUnique({
        where: { id: activeBranchId },
        select: { name: true }
      });
      activeBranchName = branch?.name ?? activeBranchId;
    } catch {
      activeBranchName = activeBranchId;
    }
  }

  return (
    <PortalesControlCenterClient
      userName={user.name || user.email}
      capabilities={capabilities}
      activeBranchId={activeBranchId}
      activeBranchName={activeBranchName}
    />
  );
}
