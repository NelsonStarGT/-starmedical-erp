import { LabRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError } from "@/lib/prisma/errors.server";

export async function getLabRoleForUser(userId: string, branchId?: string | null): Promise<LabRole | null> {
  // Prisma client puede no estar generado si migraciones no han corrido
  if (!(prisma as any)?.labAccess) return null;
  try {
    const access = await prisma.labAccess.findFirst({
      where: {
        userId,
        isActive: true,
        branchId: branchId || "GLOBAL"
      },
      orderBy: [{ updatedAt: "desc" }]
    });
    return access?.role || null;
  } catch (error) {
    // Table missing when migrations haven't been applied yet.
    if (isPrismaMissingTableError(error)) {
      return null;
    }
    throw error;
  }
}

export async function hasLabRole(userId: string, allowedRoles: LabRole[], branchId?: string | null) {
  const role = await getLabRoleForUser(userId, branchId);
  if (!role) return false;
  return allowedRoles.includes(role);
}
