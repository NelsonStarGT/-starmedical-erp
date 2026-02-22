import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";
import { warningSchema } from "@/lib/hr/schemas";
import { parseDateInput } from "@/lib/hr/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const resolvedParams = "then" in params ? await params : params;
  const auth = requireRole(req, [], "HR:EMPLOYEES:READ");
  if (auth.errorResponse) return auth.errorResponse;

  const searchParams = req.nextUrl.searchParams;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(25, Math.max(1, Number(searchParams.get("pageSize")) || 5));

  const settings = await prisma.hrSettings.findUnique({ where: { id: 1 } });
  const windowDays = settings?.warningWindowDays ?? 20;
  const threshold = settings?.warningThreshold ?? 3;
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - windowDays);

  const where = { employeeId: resolvedParams.id };
  const [total, recentCount, warnings] = await prisma.$transaction([
    prisma.hrEmployeeWarning.count({ where }),
    prisma.hrEmployeeWarning.count({ where: { ...where, issuedAt: { gte: windowStart } } }),
    prisma.hrEmployeeWarning.findMany({
      where,
      orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
      include: { attachments: { orderBy: { createdAt: "asc" } } },
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ]);

  const data = warnings.map((w) => ({
    id: w.id,
    title: w.title,
    description: w.description,
    issuedAt: w.issuedAt,
    createdAt: w.createdAt,
    attachments: (w.attachments || []).map((att) => ({
      id: att.id,
      fileUrl: att.fileUrl,
      fileName: att.fileName,
      mime: att.mime
    }))
  }));

  return NextResponse.json({
    data,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      hasMore: page * pageSize < total,
      recentCount,
      windowDays,
      threshold
    }
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const resolvedParams = "then" in params ? await params : params;
  const auth = requireRole(req, [], "HR:EMPLOYEES:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => ({}));
  const parsed = warningSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const issuedAt = parseDateInput(parsed.data.issuedAt, "Fecha de emisión") || new Date();

    const { action, attachments } = await prisma.$transaction(async (tx) => {
      const action = await tx.hrEmployeeWarning.create({
        data: {
          employeeId: resolvedParams.id,
          title: parsed.data.title.trim(),
          description: parsed.data.description?.trim() || null,
          issuedAt,
          createdById: auth.user?.id
        }
      });

      const attachments =
        parsed.data.attachments && parsed.data.attachments.length > 0
          ? await Promise.all(
              parsed.data.attachments.map((att) =>
                tx.hrWarningAttachment.create({
                  data: {
                    warningId: action.id,
                    fileUrl: att.fileUrl,
                    fileName: att.fileName?.trim() || att.fileUrl.split("/").pop() || "Adjunto",
                    mime: att.mime || null
                  }
                })
              )
            )
          : [];

      return { action, attachments };
    });

    return NextResponse.json({
      data: {
        id: action.id,
        title: parsed.data.title.trim(),
        description: parsed.data.description?.trim() || null,
        issuedAt,
        attachments: attachments.map((att) => ({
          id: att.id,
          fileUrl: att.fileUrl,
          fileName: att.fileName,
          mime: att.mime
        }))
      }
    });
  } catch (err) {
    console.error("[hr:warnings:create]", { employeeId: resolvedParams.id, err });
    return NextResponse.json({ error: "No se pudo registrar la llamada de atención" }, { status: 500 });
  }
}
