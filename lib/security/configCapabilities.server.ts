import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser, type SessionUser } from "@/lib/auth";
import { hasConfigCapability, type ConfigCapability } from "@/lib/security/configCapabilities";

export async function requireConfigCapability(
  req: NextRequest,
  capability: ConfigCapability
): Promise<{
  user: SessionUser | null;
  response: NextResponse | null;
}> {
  const auth = await requireAuthenticatedUser(req);
  if (auth.errorResponse) {
    return { user: null, response: auth.errorResponse };
  }

  if (!hasConfigCapability(auth.user, capability)) {
    return {
      user: auth.user,
      response: NextResponse.json(
        {
          ok: false,
          code: "FORBIDDEN",
          error: "No autorizado",
          capability
        },
        { status: 403 }
      )
    };
  }

  return {
    user: auth.user,
    response: null
  };
}
