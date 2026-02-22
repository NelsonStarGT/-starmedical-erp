import { prisma } from "@/lib/prisma";

type AdminRecipient = {
  userId: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
};

function normalizeEmail(value: unknown) {
  const email = String(value || "").trim().toLowerCase();
  return email.includes("@") ? email : null;
}

export async function resolveOpsAdminRecipient(input?: { tenantId?: string | null }): Promise<AdminRecipient | null> {
  const envEmail = normalizeEmail(process.env.OPS_ADMIN_EMAIL);
  if (envEmail) {
    return {
      userId: null,
      name: process.env.OPS_ADMIN_NAME?.trim() || "OPS Admin",
      email: envEmail,
      phone: process.env.OPS_ADMIN_PHONE?.trim() || null
    };
  }

  const tenantId = String(input?.tenantId || "").trim() || null;
  const client = prisma as any;
  if (!client?.user?.findFirst) return null;

  try {
    const user = await client.user.findFirst({
      where: {
        isActive: true,
        email: { not: null },
        ...(tenantId ? { tenantId } : {})
      },
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        email: true,
        phone: true
      }
    });

    if (!user) return null;

    return {
      userId: String(user.id || "") || null,
      name: user.name || null,
      email: normalizeEmail(user.email),
      phone: user.phone || null
    };
  } catch {
    return null;
  }
}
