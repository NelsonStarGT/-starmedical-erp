import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { sanitizeTextDocHtml } from "@/lib/text-docs/sanitizeHtml";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  contentJson: z.any(),
  contentHtml: z.string().min(1, "CONTENT_REQUIRED")
});

function errorResponse(code: string, status = 400) {
  return NextResponse.json({ ok: false, error: code }, { status });
}

function normalizeDoc(doc: any) {
  const latest = doc.versions?.[0] ?? null;
  return {
    id: doc.id,
    title: doc.title,
    moduleKey: doc.moduleKey,
    serviceKey: doc.serviceKey,
    subjectType: doc.subjectType,
    subjectRef: doc.subjectRef,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    latestVersion: latest
      ? {
          id: latest.id,
          versionNo: latest.versionNo,
          contentJson: latest.contentJson,
          contentHtml: latest.contentHtml,
          createdAt: latest.createdAt,
          createdById: latest.createdById
        }
      : null
  };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return errorResponse("UNAUTHENTICATED", 401);
  const { id } = params;

  try {
    const doc = await prisma.textDoc.findUnique({
      where: { id },
      include: { versions: { orderBy: { versionNo: "desc" }, take: 1 } }
    });

    if (!doc) return errorResponse("NOT_FOUND", 404);
    return NextResponse.json({ ok: true, data: normalizeDoc(doc) });
  } catch (err) {
    console.error("text-docs:get", err);
    return errorResponse("SERVER_ERROR", 500);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return errorResponse("UNAUTHENTICATED", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("INVALID_JSON", 400);
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return errorResponse("INVALID_INPUT", 400);

  const data = parsed.data;
  const safeHtml = sanitizeTextDocHtml(data.contentHtml);
  if (!safeHtml) return errorResponse("INVALID_CONTENT_HTML", 400);
  const { id } = params;

  try {
    const doc = await prisma.textDoc.findUnique({ where: { id } });
    if (!doc) return errorResponse("NOT_FOUND", 404);

    await prisma.$transaction(async (tx) => {
      const lastVersion = await tx.textDocVersion.findFirst({
        where: { docId: id },
        orderBy: { versionNo: "desc" },
        select: { versionNo: true }
      });
      const nextVersion = (lastVersion?.versionNo || 0) + 1;

      await tx.textDoc.update({
        where: { id },
        data: {
          ...(data.title ? { title: data.title } : {}),
          updatedAt: new Date()
        }
      });

      await tx.textDocVersion.create({
        data: {
          docId: id,
          versionNo: nextVersion,
          contentJson: data.contentJson,
          contentHtml: safeHtml,
          createdById: auth.user?.id || null
        }
      });
    });

    const updated = await prisma.textDoc.findUnique({
      where: { id },
      include: { versions: { orderBy: { versionNo: "desc" }, take: 1 } }
    });

    if (!updated) return errorResponse("NOT_FOUND", 404);
    return NextResponse.json({ ok: true, data: normalizeDoc(updated) });
  } catch (err) {
    console.error("text-docs:update", err);
    return errorResponse("SERVER_ERROR", 500);
  }
}
