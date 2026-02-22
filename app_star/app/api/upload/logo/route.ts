import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ ok: true, message: "Logo upload listo" });
}

export { POST } from "../image/route";
