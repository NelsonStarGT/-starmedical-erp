import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api/hr";
import { recalcPayrollRun } from "@/lib/hr/payroll";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const resolvedParams = "then" in params ? await params : params;
  const auth = requireRole(req, [], "HR:PAYROLL:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const result = await recalcPayrollRun(resolvedParams.id, auth.user?.id);
    return NextResponse.json({ data: result.run, blockers: result.blockers });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "No se pudo recalcular" }, { status: 400 });
  }
}
