import { NextRequest } from "next/server";
import { requireRole } from "@/lib/api/hr";

export function requireHrPermission(req: NextRequest, permission: string) {
  return requireRole(req, [], permission);
}
