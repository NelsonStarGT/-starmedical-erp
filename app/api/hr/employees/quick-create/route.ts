import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireHrPermission } from "@/lib/api/rbac";
import { withApiErrorHandling, safeJson } from "@/lib/api/http";
import { rateLimit, getClientIp } from "@/lib/api/rateLimit";

export const dynamic = "force-dynamic";

const quickCreateSchema = z.object({
  firstName: z.string().trim().min(1, "Nombre requerido"),
  lastName: z.string().trim().min(1, "Apellido requerido"),
  phone: z.string().trim().min(4, "Teléfono requerido"),
  address: z.string().trim().min(1, "Dirección requerida"),
  branchId: z.string().trim().min(1, "Sucursal requerida"),
  relationshipType: z.enum(["DEPENDENCIA", "SIN_DEPENDENCIA"]).default("DEPENDENCIA"),
  workLocation: z.string().trim().optional(),
  isExternal: z.boolean().optional(),
  baseSalary: z.number().nonnegative().optional(),
  bonuses: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        amount: z.number().positive()
      })
    )
    .optional()
});

async function generateEmployeeCode(tx: Prisma.TransactionClient) {
  const last = await tx.hrEmployee.findFirst({ orderBy: { createdAt: "desc" }, select: { employeeCode: true } });
  let nextNumber = 1;
  if (last?.employeeCode) {
    const match = last.employeeCode.match(/(\d+)$/);
    if (match) nextNumber = parseInt(match[1], 10) + 1;
  }
  for (let i = 0; i < 10; i++) {
    const candidate = `EMP-${String(nextNumber + i).padStart(6, "0")}`;
    const exists = await tx.hrEmployee.findUnique({ where: { employeeCode: candidate } });
    if (!exists) return candidate;
  }
  return `EMP-${Date.now()}`;
}

async function handler(req: NextRequest) {
  const auth = requireHrPermission(req, "HR:EMPLOYEES:WRITE");
  if (auth.errorResponse) return auth.errorResponse;
  const rl = rateLimit(`${getClientIp(req)}:${req.nextUrl.pathname}`, 10, 60_000);
  if (!rl.allowed) throw { status: 429, body: { error: "Rate limit", retryAt: rl.retryAt } };

  const parsed = quickCreateSchema.safeParse(await safeJson(req));
  if (!parsed.success) {
    throw { status: 400, body: { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors } };
  }

  const data = parsed.data;

  const branch = await prisma.branch.findUnique({ where: { id: data.branchId } });
  if (!branch) {
    throw { status: 400, body: { error: "Sucursal inválida" } };
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const employeeCode = await generateEmployeeCode(tx);
      const employee = await tx.hrEmployee.create({
        data: {
          employeeCode,
          firstName: data.firstName,
          lastName: data.lastName,
          phoneMobile: data.phone,
          addressHome: data.address,
          status: "ACTIVE",
          isActive: false,
          onboardingStatus: "DRAFT",
          onboardingStep: 1,
          isExternal: data.isExternal ?? false,
          primaryLegalEntityId: null,
          createdById: auth.user?.id || null
        }
      });

      await tx.employeeBranchAssignment.create({
        data: {
          employeeId: employee.id,
          branchId: branch.id,
          isPrimary: true,
          code: data.workLocation || branch.code || branch.name || null,
          startDate: new Date(),
          createdById: auth.user?.id || null
        }
      });

      if (data.bonuses && data.bonuses.length > 0) {
        await tx.compensationBonus.createMany({
          data: data.bonuses.map((b) => ({
            employeeId: employee.id,
            engagementId: null,
            name: b.name,
            amount: b.amount,
            isActive: true
          }))
        });
      }

      return { id: employee.id, employeeCode };
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      throw { status: 409, body: { error: "Código duplicado, reintenta", code: "P2002" } };
    }
    throw err;
  }
}

export const POST = withApiErrorHandling(handler);
