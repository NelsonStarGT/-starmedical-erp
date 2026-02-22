import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  buildActiveBranchCookie,
  persistPreferredActiveBranch,
  resolveActiveBranchWithMeta
} from "@/lib/branch/activeBranch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function classifyStatus(message: string) {
  if (message === "Sede requerida.") return 400;
  if (message === "Sucursal no autorizada.") return 403;
  if (message === "Sede no encontrada o inactiva.") return 400;
  return 500;
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const resolved = await resolveActiveBranchWithMeta(auth.user!, req.cookies);
    const activeBranch = resolved.branchId
      ? resolved.activeBranches.find((branch) => branch.id === resolved.branchId) ?? null
      : null;

    return NextResponse.json({
      ok: true,
      data: {
        branchId: resolved.branchId,
        branch: activeBranch
          ? {
              id: activeBranch.id,
              name: activeBranch.name,
              code: activeBranch.code ?? null
            }
          : null,
        canSwitch: resolved.canSwitch,
        accessMode: resolved.accessMode
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo resolver la sede activa.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const branchId = String(body?.branchId || "").trim();
  if (!branchId) {
    return NextResponse.json({ ok: false, error: "Sede requerida." }, { status: 400 });
  }

  try {
    const branch = await persistPreferredActiveBranch({
      user: auth.user!,
      branchId
    });

    const response = NextResponse.json({
      ok: true,
      data: {
        id: branch.id,
        name: branch.name,
        code: branch.code ?? null
      }
    });
    response.cookies.set(buildActiveBranchCookie(branch.id));
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cambiar la sede activa.";
    return NextResponse.json({ ok: false, error: message }, { status: classifyStatus(message) });
  }
}
