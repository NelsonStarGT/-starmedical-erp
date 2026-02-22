import { NextResponse } from "next/server";

export function labNotReadyResponse() {
  return NextResponse.json({ ok: true, data: [], code: "LAB_NOT_READY", warning: "LabTest no migrado" });
}
