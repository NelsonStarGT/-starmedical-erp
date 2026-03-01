import { NextRequest } from "next/server";
import { ensureMembershipAccess } from "@/lib/api/memberships";
import { PERMISSIONS } from "@/lib/rbac";
import { getPharmacyConfig, updatePharmacyConfig } from "@/lib/subscriptions/pharmacy/service";
import { pharmacyConfigSchema } from "@/lib/subscriptions/pharmacy/schemas";
import { handlePharmacyApiError } from "@/app/api/subscriptions/pharmacy/_utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = ensureMembershipAccess(req, PERMISSIONS.MEMBERSHIPS_READ);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const data = await getPharmacyConfig();
    return Response.json({ data });
  } catch (error) {
    return handlePharmacyApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  const auth = ensureMembershipAccess(req, PERMISSIONS.MEMBERSHIPS_ADMIN);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const json = await req.json();
    const payload = pharmacyConfigSchema.parse(json);
    const data = await updatePharmacyConfig(payload);
    return Response.json({ data });
  } catch (error) {
    return handlePharmacyApiError(error);
  }
}
