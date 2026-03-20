import { NextRequest, NextResponse } from "next/server";
import { withApiErrorHandling } from "@/lib/api/http";
import { requireUsersAdminApi } from "@/lib/users/access";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireUsersAdminApi(req);
  if (auth.errorResponse) return auth.errorResponse;

  return NextResponse.json(
    {
      error: "Vinculación RRHH no disponible en el esquema actual",
      userId: params.id
    },
    { status: 501 }
  );
}

export const POST = withApiErrorHandling(handler);
