import { NextRequest, NextResponse } from "next/server";
import { PayrollRunStatus, PayrollRunType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireHrPermission } from "@/lib/api/rbac";
import { safeJson, withApiErrorHandling } from "@/lib/api/http";

export const dynamic = "force-dynamic";

function parsePagination(params: URLSearchParams) {
  const page = Math.max(1, Number(params.get("page") || "1"));
  const pageSize = Math.min(50, Math.max(5, Number(params.get("pageSize") || "10")));
  return { page, pageSize };
}

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function buildRunCode(branchId?: string | null) {
  const short = branchId ? branchId.slice(0, 4).toUpperCase() : "GEN";
  const now = new Date();
  return `PAY-${short}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${now.getTime().toString().slice(-4)}`;
}

async function listHandler(req: NextRequest) {
  const auth = requireHrPermission(req, "HR:PAYROLL:READ");
  if (auth.errorResponse) return auth.errorResponse;
  const params = req.nextUrl.searchParams;
  const { page, pageSize } = parsePagination(params);
  const branchId = params.get("branchId") || undefined;
  const runType = params.get("runType") as PayrollRunType | null;
  const status = params.get("status") as PayrollRunStatus | null;
  const code = params.get("search") || undefined;
  const periodStartFrom = params.get("periodStartFrom");
  const periodEndTo = params.get("periodEndTo");

  const where: any = {};
  if (branchId) where.branchId = branchId;
  if (runType && Object.values(PayrollRunType).includes(runType)) where.runType = runType;
  if (status && Object.values(PayrollRunStatus).includes(status)) where.status = status;
  if (code) where.code = { contains: code, mode: "insensitive" };
  if (periodStartFrom) where.periodStart = { gte: new Date(`${periodStartFrom}T00:00:00Z`) };
  if (periodEndTo) where.periodEnd = { lte: new Date(`${periodEndTo}T00:00:00Z`) };

  const [total, runs] = await prisma.$transaction([
    prisma.payrollRun.count({ where }),
    prisma.payrollRun.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        code: true,
        runType: true,
        status: true,
        branchId: true,
        periodStart: true,
        periodEnd: true,
        createdAt: true,
        branch: { select: { name: true } },
        _count: { select: { runEmployees: true } }
      }
    })
  ]);

  return NextResponse.json({
    ok: true,
    data: {
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      items: runs.map((run) => ({
        id: run.id,
        code: run.code,
        runType: run.runType,
        status: run.status,
        branchId: run.branchId,
        branchName: (run as any).branch?.name || null,
        periodStart: formatDate(run.periodStart),
        periodEnd: formatDate(run.periodEnd),
        employees: run._count.runEmployees,
        createdAt: run.createdAt.toISOString()
      }))
    }
  });
}

async function resolveLegalEntityId(preferred?: string | null) {
  if (preferred) {
    const exists = await prisma.legalEntity.findUnique({ where: { id: preferred }, select: { id: true } });
    if (!exists) throw { status: 400, body: { error: "LEGAL_ENTITY_NOT_FOUND" } };
    return preferred;
  }
  const fallback = await prisma.legalEntity.findFirst({ select: { id: true } });
  if (!fallback) throw { status: 400, body: { error: "MISSING_LEGAL_ENTITY" } };
  return fallback.id;
}

const createSchema = z.object({
  runType: z.nativeEnum(PayrollRunType),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  branchId: z.string().min(1).optional().nullable(),
  legalEntityId: z.string().min(1).optional().nullable(),
  selectedEmployeeIds: z.array(z.string().min(1)).min(1)
});

async function createHandler(req: NextRequest) {
  const auth = requireHrPermission(req, "HR:PAYROLL:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  const body = await safeJson(req);
  const selectedEmployeeIds =
    Array.isArray(body?.selectedEmployeeIds) && body.selectedEmployeeIds.length
      ? body.selectedEmployeeIds
      : Array.isArray(body?.employeeIds) && body.employeeIds.length
        ? body.employeeIds
        : undefined;

  const parsed = createSchema.safeParse({
    ...body,
    branchId: body?.branchId || null,
    legalEntityId: body?.legalEntityId || null,
    selectedEmployeeIds
  });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "INVALID_PAYLOAD", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { runType, periodStart: periodStartStr, periodEnd: periodEndStr } = parsed.data;
  const branchId = parsed.data.branchId || null;

  const periodStart = new Date(`${periodStartStr}T00:00:00Z`);
  const periodEnd = new Date(`${periodEndStr}T00:00:00Z`);
  if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime()) || periodStart > periodEnd) {
    throw { status: 400, body: { error: "INVALID_DATES" } };
  }

  if (branchId) {
    const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { id: true } });
    if (!branch) throw { status: 400, body: { error: "BRANCH_NOT_FOUND" } };
  }

  const legalEntityId = await resolveLegalEntityId(parsed.data.legalEntityId);
  const uniqueEmployeeIds = Array.from(new Set(parsed.data.selectedEmployeeIds));

  const created = await prisma.$transaction(async (tx) => {
    const employees = await tx.hrEmployee.findMany({
      where: { id: { in: uniqueEmployeeIds } },
      select: { id: true }
    });
    if (employees.length !== uniqueEmployeeIds.length) {
      throw { status: 400, body: { error: "EMPLOYEE_NOT_FOUND" } };
    }

    const run = await tx.payrollRun.create({
      data: {
        code: buildRunCode(branchId),
        legalEntityId,
        branchId: branchId || null,
        runType,
        periodStart,
        periodEnd,
        status: PayrollRunStatus.DRAFT,
        createdById: auth.user?.id || null
      }
    });

    await tx.payrollRunEmployee.createMany({
      data: uniqueEmployeeIds.map((id) => ({ payrollRunId: run.id, employeeId: id }))
    });

    return run;
  });

  return NextResponse.json({ ok: true, data: { id: created.id, code: created.code, employees: uniqueEmployeeIds.length } }, { status: 201 });
}

export const GET = withApiErrorHandling(listHandler);
export const POST = withApiErrorHandling(createHandler);
