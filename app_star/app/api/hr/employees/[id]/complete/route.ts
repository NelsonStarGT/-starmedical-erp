import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireHrPermission } from "@/lib/api/rbac";
import { safeJson, withApiErrorHandling } from "@/lib/api/http";
import { rateLimit, getClientIp } from "@/lib/api/rateLimit";
import { normalizeCompletionStep } from "@/lib/hr/transitions";

export const dynamic = "force-dynamic";

const schema = z.object({
  onboardingStep: z.coerce.number().int().min(3).optional(),
  completedAt: z.string().datetime().optional()
});

async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireHrPermission(req, "HR:EMPLOYEES:WRITE");
  if (auth.errorResponse) return auth.errorResponse;
  const rl = rateLimit(`${getClientIp(req)}:${req.nextUrl.pathname}`, 20, 60_000);
  if (!rl.allowed) throw { status: 429, body: { error: "Rate limit", retryAt: rl.retryAt } };
  if ((auth.user?.roles || []).some((r) => r.toUpperCase() === "STAFF")) {
    throw { status: 403, body: { error: "No autorizado", code: "FORBIDDEN" } };
  }
  const { id } = params;

  const parsed = schema.safeParse(await safeJson(req));
  if (!parsed.success) throw { status: 400, body: { error: "Datos inválidos" } };

  const employee = await prisma.hrEmployee.findUnique({ where: { id } });
  if (!employee) throw { status: 404, body: { error: "Empleado no encontrado" } };
  if (employee.onboardingStatus === "ACTIVE") {
    throw { status: 409, body: { error: "Onboarding ya completado" } };
  }

  const onboardingStep = normalizeCompletionStep(parsed.data.onboardingStep);
  const updated = await prisma.hrEmployee.update({
    where: { id },
    data: {
      onboardingStatus: "ACTIVE",
      onboardingStep,
      completedAt: parsed.data.completedAt ? new Date(parsed.data.completedAt) : new Date(),
      isActive: employee.status === "ACTIVE"
    }
  });

  return NextResponse.json({
    data: { id: updated.id, onboardingStatus: updated.onboardingStatus, onboardingStep: updated.onboardingStep }
  });
}

export const POST = withApiErrorHandling(handler);
