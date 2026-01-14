import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";
import { compensationUpdateSchema } from "@/lib/hr/schemas";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const resolvedParams = "then" in params ? await params : params;
  const auth = requireRole(req, ["ADMIN", "HR_ADMIN", "HR_USER", "STAFF"], "HR:EMPLOYEES:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => ({}));
  const parsed = compensationUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const engagement = await prisma.employeeEngagement.findFirst({
    where: { employeeId: resolvedParams.id, isPrimary: true }
  });
  if (!engagement) return NextResponse.json({ error: "Relación laboral no encontrada" }, { status: 404 });

  const hasSalary = typeof parsed.data.baseSalary === "number";
  const hasAllowance = typeof parsed.data.baseAllowance === "number";
  const hasPayScheme = parsed.data.payScheme !== undefined;

  if (!hasSalary && !hasAllowance && !hasPayScheme) {
    return NextResponse.json({ error: "Sin cambios de compensación" }, { status: 400 });
  }

  const finalSalary = hasSalary ? parsed.data.baseSalary : engagement.baseSalary?.toNumber() ?? null;
  const finalAllowance = hasAllowance ? parsed.data.baseAllowance : engagement.baseAllowance?.toNumber() ?? null;
  const finalPayScheme = hasPayScheme ? parsed.data.payScheme : engagement.paymentScheme;

  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.employeeEngagement.update({
      where: { id: engagement.id },
      data: {
        baseSalary: hasSalary ? parsed.data.baseSalary : undefined,
        baseAllowance: hasAllowance ? parsed.data.baseAllowance : undefined,
        paymentScheme: hasPayScheme ? parsed.data.payScheme : undefined,
        compensationAmount: hasSalary ? parsed.data.baseSalary : undefined
      }
    });

    await tx.hrCompensationHistory.create({
      data: {
        employeeId: resolvedParams.id,
        effectiveFrom: new Date(),
        prevSalary: engagement.baseSalary,
        newSalary: finalSalary,
        prevAllowance: engagement.baseAllowance,
        newAllowance: finalAllowance,
        prevPayScheme: engagement.paymentScheme,
        newPayScheme: finalPayScheme,
        comments: parsed.data.comments?.trim() || null,
        createdById: auth.user?.id || null
      }
    });

    return saved;
  });

  return NextResponse.json({
    data: {
      baseSalary: updated.baseSalary?.toString() || null,
      baseAllowance: updated.baseAllowance?.toString() || null,
      payScheme: updated.paymentScheme
    }
  });
}
