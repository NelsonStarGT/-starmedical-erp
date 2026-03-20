import { NextRequest, NextResponse } from "next/server";
import { requireUsersAdminApi } from "@/lib/users/access";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireUsersAdminApi(req);
  if (auth.errorResponse) return auth.errorResponse;

  return NextResponse.json({
    linked: false,
    employeeId: null,
    available: false,
    message: `La vinculación RRHH no está disponible en el esquema actual para el usuario ${params.id}.`
  });
}
