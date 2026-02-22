import { NextRequest, NextResponse } from "next/server";
import { sendMessage } from "@/service/whatsappGateway";

export async function POST(req: NextRequest) {
  const payload = await req.json();
  await sendMessage(payload);
  return NextResponse.json({
    ok: true,
    echo: payload,
    message: "Integración con gateway pendiente"
  });
}
