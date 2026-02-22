import { NextRequest, NextResponse } from "next/server";
import { OperationalArea } from "@prisma/client";
import { getPublicTurnos } from "@/lib/reception/public-turnos.service";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 120;
const LIMIT_DEFAULT = 20;
const LIMIT_MIN = 1;
const LIMIT_MAX = 50;

type RateEntry = { count: number; resetAt: number };

const rateLimitStore = new Map<string, RateEntry>();

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

function rateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  rateLimitStore.set(ip, entry);
  return { allowed: true };
}

function parseArea(area: string | null): OperationalArea | null {
  if (!area) return null;
  const upper = area.toUpperCase();
  const values = Object.values(OperationalArea) as string[];
  if (!values.includes(upper)) return null;
  return upper as OperationalArea;
}

function parseLimit(limit: string | null): number | null {
  if (!limit) return null;
  const parsed = Number.parseInt(limit, 10);
  if (Number.isNaN(parsed)) return null;
  if (parsed < LIMIT_MIN || parsed > LIMIT_MAX) return null;
  return parsed;
}

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = rateLimit(ip);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Rate limit excedido" },
        {
          status: 429,
          headers: {
            "Retry-After": String(rate.retryAfter ?? 60)
          }
        }
      );
    }

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");
    const areaRaw = searchParams.get("area");
    const limitRaw = searchParams.get("limit");

    if (!siteId) {
      return NextResponse.json({ error: "siteId es requerido" }, { status: 400 });
    }

    const area = parseArea(areaRaw);
    if (areaRaw && !area) {
      return NextResponse.json({ error: "area inválida" }, { status: 400 });
    }

    const limit = parseLimit(limitRaw);
    if (limitRaw && limit === null) {
      return NextResponse.json({ error: "limit inválido (1..50)" }, { status: 400 });
    }

    const data = await getPublicTurnos({
      siteId,
      area: area ?? undefined,
      limit: limit ?? LIMIT_DEFAULT
    });

    const response = NextResponse.json(data, { status: 200 });
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  } catch {
    return NextResponse.json({ error: "Error al obtener turnos" }, { status: 500 });
  }
}
