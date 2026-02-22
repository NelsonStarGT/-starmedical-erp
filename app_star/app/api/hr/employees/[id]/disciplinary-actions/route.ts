import { NextRequest, NextResponse } from "next/server";
import { DisciplinaryActionStatus, DisciplinaryActionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";
import { disciplinaryActionSchema } from "@/lib/hr/schemas";
import { parseDateInput } from "@/lib/hr/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const resolvedParams = "then" in params ? await params : params;
  const auth = requireRole(req, [], "HR:EMPLOYEES:READ");
  if (auth.errorResponse) return auth.errorResponse;

  const searchParams = req.nextUrl.searchParams;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(25, Math.max(1, Number(searchParams.get("pageSize")) || 5));

  const where = { employeeId: resolvedParams.id };
  const [total, actions] = await prisma.$transaction([
    prisma.disciplinaryAction.count({ where }),
    prisma.disciplinaryAction.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { issuedAt: "desc" }],
      include: { attachments: { orderBy: { createdAt: "asc" } } },
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ]);

  return NextResponse.json({
    data: actions.map((action) => ({
      id: action.id,
      type: action.type,
      title: action.title,
      description: action.description,
      comments: action.comments,
      status: action.status,
      startDate: action.startDate,
      endDate: action.endDate,
      issuedAt: action.issuedAt,
      createdAt: action.createdAt,
      approvedById: action.approvedById,
      createdById: action.createdById,
      attachments: action.attachments.map((att) => ({
        id: att.id,
        fileUrl: att.fileUrl,
        fileName: att.fileName,
        mime: att.mime
      }))
    })),
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      hasMore: page * pageSize < total
    }
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const resolvedParams = "then" in params ? await params : params;
  const auth = requireRole(req, [], "HR:EMPLOYEES:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => ({}));
  const parsed = disciplinaryActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const startDate = parseDateInput(parsed.data.startDate, "Fecha inicio") || new Date();
    const endDate = parseDateInput(parsed.data.endDate, "Fecha fin");
    const issuedAt = startDate || new Date();

    const { action, attachments } = await prisma.$transaction(async (tx) => {
      const action = await tx.disciplinaryAction.create({
        data: {
          employeeId: resolvedParams.id,
          type: parsed.data.type as DisciplinaryActionType,
          title: parsed.data.reason.trim(),
          description: parsed.data.comments?.trim() || null,
          comments: parsed.data.comments?.trim() || null,
          issuedAt,
          startDate,
          endDate: endDate || null,
          status: DisciplinaryActionStatus.DRAFT,
          createdById: auth.user?.id || null
        }
      });

      const attachments =
        parsed.data.attachments && parsed.data.attachments.length > 0
          ? await Promise.all(
              parsed.data.attachments.map((att) =>
                tx.disciplinaryAttachment.create({
                  data: {
                    disciplinaryActionId: action.id,
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
        type: action.type,
        title: action.title,
        description: action.description,
        comments: action.comments,
        status: action.status,
        startDate: action.startDate,
        endDate: action.endDate,
        issuedAt: action.issuedAt,
        createdAt: action.createdAt,
        attachments: attachments.map((att) => ({
          id: att.id,
          fileUrl: att.fileUrl,
          fileName: att.fileName,
          mime: att.mime
        }))
      }
    });
  } catch (err) {
    console.error("[hr:disciplinary:create]", err);
    return NextResponse.json({ error: "No se pudo crear la sanción disciplinaria" }, { status: 500 });
  }
}
