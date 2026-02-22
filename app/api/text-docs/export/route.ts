import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import htmlToDocx from "html-to-docx";

import { requireAuth } from "@/lib/auth";
import { sanitizeTextDocHtml } from "@/lib/text-docs/sanitizeHtml";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const exportSchema = z.object({
  html: z.string().min(1, "HTML_REQUIRED"),
  title: z.string().optional()
});

function errorResponse(code: string, status = 400) {
  return NextResponse.json({ ok: false, error: code }, { status });
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

  const parsed = exportSchema.safeParse(body);
  if (!parsed.success) return errorResponse("INVALID_INPUT", 400);

  const { html: rawHtml, title } = parsed.data;
  const html = sanitizeTextDocHtml(rawHtml);
  if (!html) {
    return NextResponse.json(
      { ok: false, error: "HTML inválido o potencialmente peligroso.", code: "INVALID_HTML" },
      { status: 400 }
    );
  }

  const safeTitle = (title || "documento").trim() || "documento";
  const fileName = `${safeTitle.replace(/[^a-z0-9-_]+/gi, "_")}.docx`;

  try {
    const buffer = await htmlToDocx(html, null, {
      table: { row: { cantSplit: true } },
      footer: false,
      pageNumber: false
    });

    const uint8 = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(buffer as Uint8Array);
    const blob = new Blob([uint8], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });

    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileName}"`
      }
    });
  } catch (err) {
    console.error("text-docs:export-docx", err);
    return errorResponse("SERVER_ERROR", 500);
  }
}
