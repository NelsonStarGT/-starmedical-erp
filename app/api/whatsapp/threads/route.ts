import { NextResponse } from "next/server";
import { fetchThreads } from "@/service/whatsappGateway";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  const numberId = searchParams.get("numberId");

  if (!workspaceId || !numberId) {
    return NextResponse.json(
      { error: "workspaceId y numberId son requeridos" },
      { status: 400 }
    );
  }

  const data = await fetchThreads({ workspaceId, numberId });
  return NextResponse.json(data);
}
