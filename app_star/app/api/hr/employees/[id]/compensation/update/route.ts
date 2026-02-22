import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/api/hr";
import { compensationUpdateSchema } from "@/lib/hr/schemas";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const resolvedParams = "then" in params ? await params : params;
  const auth = requireRole(req, [], "HR:PAYROLL:WRITE");
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
  const finalAllowance = hasAllowance ? parsed.data.baseAllowance : null;
  const finalPayScheme = hasPayScheme ? parsed.data.payScheme : engagement.paymentScheme;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.employeeCompensation.updateMany({
      where: { engagementId: engagement.id, isActive: true },
      data: { isActive: false, effectiveTo: new Date() }
    });

    const saved = await tx.employeeCompensation.create({
      data: {
        engagementId: engagement.id,
        effectiveFrom: new Date(),
        baseSalary: hasSalary ? parsed.data.baseSalary : engagement.baseSalary,
        currency: "GTQ",
        payFrequency: engagement.compensationFrequency || "MONTHLY",
        allowances: finalAllowance ? { base: finalAllowance } : {},
        deductions: {},
        isActive: true,
        paymentScheme: hasPayScheme ? parsed.data.payScheme : engagement.paymentScheme,
        createdById: auth.user?.id || null
      }
    });

    await tx.hrCompensationHistory.create({
      data: {
        employeeId: resolvedParams.id,
        effectiveFrom: saved.effectiveFrom,
        prevSalary: engagement.baseSalary,
        newSalary: saved.baseSalary,
        prevAllowance: null,
        newAllowance: finalAllowance ? new Prisma.Decimal(finalAllowance) : null,
        prevPayScheme: engagement.paymentScheme,
        newPayScheme: saved.paymentScheme,
        comments: parsed.data.comments?.trim() || null,
        createdById: auth.user?.id || null
      }
    });

    await tx.employeeEngagement.update({
      where: { id: engagement.id },
      data: {
        baseSalary: saved.baseSalary,
        paymentScheme: saved.paymentScheme
      }
    });

    return saved;
  });

  return NextResponse.json({
    data: {
      baseSalary: updated.baseSalary?.toString() || null,
      baseAllowance: finalAllowance ? String(finalAllowance) : null,
      payScheme: updated.paymentScheme
    }
  });
}
