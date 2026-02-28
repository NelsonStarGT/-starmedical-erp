import { NextRequest, NextResponse } from "next/server";
import { ensureMembershipAccess } from "@/lib/api/memberships";
import { createDurationPresetSchema, listDurationPresetsQuerySchema } from "@/lib/memberships/schemas";
import { createDurationPreset, listDurationPresets } from "@/lib/memberships/service";
import { PERMISSIONS } from "@/lib/rbac";
import { handleMembershipApiError, parseBooleanQueryParam } from "@/app/api/memberships/_utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = ensureMembershipAccess(req, PERMISSIONS.MEMBERSHIPS_READ);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const parsed = listDurationPresetsQuerySchema.safeParse({
      includeInactive: parseBooleanQueryParam(req.nextUrl.searchParams.get("includeInactive"))
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Parámetros inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const data = await listDurationPresets(parsed.data, auth.user);
    return NextResponse.json({ data });
  } catch (error) {
    return handleMembershipApiError(error);
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureMembershipAccess(req, PERMISSIONS.MEMBERSHIPS_ADMIN);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const json = await req.json();
    const payload = createDurationPresetSchema.parse(json);
    const data = await createDurationPreset(payload, auth.user);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleMembershipApiError(error);
  }
}
