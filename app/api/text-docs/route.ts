import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { sanitizeTextDocHtml } from "@/lib/text-docs/sanitizeHtml";

export const dynamic = "force-dynamic";

const moduleKeySchema = z.enum(["MED", "ENF", "US", "RX", "LAB", "ADM", "SSO"]);
const subjectTypeSchema = z.enum(["PATIENT", "COMPANY", "INVENTORY", "OTHER"]);

const createSchema = z.object({
  title: z.string().trim().min(1, "TITLE_REQUIRED"),
  moduleKey: moduleKeySchema,
  serviceKey: z.string().trim().optional().nullable(),
  subjectType: subjectTypeSchema,
  subjectRef: z.string().trim().min(1, "SUBJECT_REF_REQUIRED"),
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

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return errorResponse("UNAUTHENTICATED", 401);

  try {
    const docs = await prisma.textDoc.findMany({
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: { versions: { orderBy: { versionNo: "desc" }, take: 1 } }
    });

    return NextResponse.json({ ok: true, data: docs.map(normalizeDoc) });
  } catch (err) {
    console.error("text-docs:list", err);
    return errorResponse("SERVER_ERROR", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return errorResponse("UNAUTHENTICATED", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("INVALID_JSON", 400);
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("INVALID_INPUT", 400);
  }

  const data = parsed.data;
  const safeHtml = sanitizeTextDocHtml(data.contentHtml);
  if (!safeHtml) return errorResponse("INVALID_CONTENT_HTML", 400);

  try {
    const doc = await prisma.textDoc.create({
      data: {
        title: data.title,
        moduleKey: data.moduleKey,
        serviceKey: data.serviceKey || null,
        subjectType: data.subjectType,
        subjectRef: data.subjectRef,
        versions: {
          create: {
            versionNo: 1,
            contentJson: data.contentJson,
            contentHtml: safeHtml,
            createdById: auth.user?.id || null
          }
        }
      },
      include: { versions: { orderBy: { versionNo: "desc" }, take: 1 } }
    });

    return NextResponse.json({ ok: true, data: normalizeDoc(doc) }, { status: 201 });
  } catch (err) {
    console.error("text-docs:create", err);
    return errorResponse("SERVER_ERROR", 500);
  }
}
