import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import { getSessionUserFromCookies } from "@/lib/auth";
import type { RecepcionCapability } from "@/lib/recepcion/permissions";
import { buildRecepcionAccess, type RecepcionAccess } from "@/lib/recepcion/rbac";

export type RecepcionServerContext = {
  user: SessionUser;
  access: RecepcionAccess;
};

export async function requireRecepcionCapability(capability?: RecepcionCapability): Promise<RecepcionServerContext> {
  const cookieStore = await cookies();
  const user = await getSessionUserFromCookies(cookieStore);
  if (!user) redirect("/login");

  const access = buildRecepcionAccess(user);
  if (!access.canViewModule) forbidden();
  if (capability && !access.capabilities.includes(capability)) forbidden();

  return {
    user,
    access
  };
}
