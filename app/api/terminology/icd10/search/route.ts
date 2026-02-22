import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { withApiErrorHandling } from "@/lib/api/http";
import { listCie10Codes } from "@/lib/medical/cie10Store";
import { searchIcd10Fallback } from "@/lib/terminology/icd10";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const q = req.nextUrl.searchParams.get("q") || "";
  try {
    const list = await listCie10Codes({
      query: q,
      active: true,
      page: 1,
      pageSize: 30
    });
    const data = list.items.map((item) => ({ code: item.code, label: item.title }));
    return NextResponse.json({ data });
  } catch {
    const data = searchIcd10Fallback(q, 30);
    return NextResponse.json({ data });
  }
}

export const GET = withApiErrorHandling(handler);
