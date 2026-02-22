import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getLabTestSettings } from "@/lib/labtest/settings";
import { getLabRoleForUser } from "@/lib/labtest/access";
import { resolveMailTransportProvider, sendMail } from "@/lib/email/mailer";

const codeLen = 6;
const MAIL_TIMEOUT_MS = 8_000;
const OTP_RATE_WINDOW_MS = 10 * 60_000;
const OTP_RATE_LIMIT_MAX = 5;

function maskEmail(email?: string | null) {
  if (!email) return "unknown";
  const [local, domain] = String(email).split("@");
  if (!domain) return `${String(email).slice(0, 2)}***`;
  const safeLocal = local.length <= 2 ? `${local.slice(0, 1)}***` : `${local.slice(0, 2)}***`;
  return `${safeLocal}@${domain}`;
}

function maskIp(ip?: string | null) {
  if (!ip) return "unknown";
  const raw = String(ip).trim();
  if (raw.includes(".")) {
    const parts = raw.split(".");
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.***.***`;
  }
  if (raw.includes(":")) {
    const parts = raw.split(":");
    return `${parts.slice(0, 2).join(":")}:***`;
  }
  return `${raw.slice(0, 4)}***`;
}

function createTimeoutError(ms: number) {
  const err = new Error(`MAIL_TIMEOUT_${ms}ms`);
  (err as any).code = "MAIL_TIMEOUT";
  return err;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(createTimeoutError(ms)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const user = auth.user!;

  const role = await getLabRoleForUser(user.id, user.branchId);
  const upperRoles = (user.roles || []).map((r) => String(r).toUpperCase());
  const isSuperAdmin = upperRoles.includes("SUPER_ADMIN");
  const referer = req.headers.get("referer") || "";
  let fromVerify = false;
  if (process.env.NODE_ENV !== "production" && referer) {
    try {
      const url = new URL(referer);
      fromVerify = url.pathname.startsWith("/labtest/verify");
    } catch {
      fromVerify = referer.includes("/labtest/verify");
    }
  }
  if (!role && !isSuperAdmin && !fromVerify) {
    console.info("[otp][send] denied", { reason: "LAB_ACCESS_REQUIRED", userId: user.id });
    return NextResponse.json({ ok: false, error: "Sin acceso LabTest", code: "LAB_ACCESS_REQUIRED" }, { status: 403 });
  }

  const settings = await getLabTestSettings();
  const email = String(user.email || "").trim().toLowerCase();
  const code = Array.from({ length: codeLen }, () => Math.floor(Math.random() * 10)).join("");
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (settings.otpTtlMinutes || 10) * 60 * 1000);
  const xff = req.headers.get("x-forwarded-for");
  const ip =
    (xff && xff.split(",").map((p) => p.trim()).find(Boolean)) ||
    req.headers.get("x-real-ip") ||
    null;

  // rate limit: último challenge <60s
  const recent = await prisma.labOtpChallenge.findFirst({
    where: { userId: user.id, createdAt: { gt: new Date(now.getTime() - 60_000) } },
    orderBy: { createdAt: "desc" }
  });
  if (recent) {
    console.info("[otp][send] rate_limit", {
      userId: user.id,
      email: maskEmail(email),
      ip: maskIp(ip),
      reason: "RECENT_CHALLENGE"
    });
    return NextResponse.json(
      { ok: false, error: "Límite de envíos alcanzado. Intenta más tarde.", code: "OTP_RATE_LIMIT" },
      { status: 429 }
    );
  }

  // rate limit: máximo 5 en 10min (por userId, email e IP)
  const windowAgo = new Date(now.getTime() - OTP_RATE_WINDOW_MS);
  const [countByUser, countByEmail, countByIp] = await Promise.all([
    prisma.labOtpChallenge.count({ where: { userId: user.id, createdAt: { gt: windowAgo } } }),
    prisma.labOtpChallenge.count({ where: { email, createdAt: { gt: windowAgo } } }),
    ip ? prisma.labOtpChallenge.count({ where: { ip, createdAt: { gt: windowAgo } } }) : Promise.resolve(0)
  ]);
  if (countByUser >= OTP_RATE_LIMIT_MAX || countByEmail >= OTP_RATE_LIMIT_MAX || countByIp >= OTP_RATE_LIMIT_MAX) {
    console.info("[otp][send] rate_limit", {
      userId: user.id,
      email: maskEmail(email),
      ip: maskIp(ip),
      reason: "WINDOW_LIMIT",
      counts: { user: countByUser, email: countByEmail, ip: countByIp }
    });
    return NextResponse.json(
      { ok: false, error: "Límite de envíos alcanzado. Intenta más tarde.", code: "OTP_RATE_LIMIT" },
      { status: 429 }
    );
  }

  await prisma.$transaction([
    prisma.labOtpChallenge.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: now }
    }),
    prisma.labOtpChallenge.create({
      data: {
        userId: user.id,
        email,
        codeHash,
        expiresAt,
        ip,
        userAgent: req.headers.get("user-agent") || null
      }
    })
  ]);

  const transportProvider = resolveMailTransportProvider();
  console.info("[mail] transport", { provider: transportProvider, nodeEnv: process.env.NODE_ENV });
  const sendStartedAt = Date.now();
  try {
    const result = await withTimeout(
      sendMail({
        to: user.email,
        subject: "Código OTP LabTest",
        text: `Tu código es ${code}. Expira en ${settings.otpTtlMinutes || 10} minutos.`,
        html: `<p>Tu código es <strong>${code}</strong>.</p><p>Expira en ${settings.otpTtlMinutes || 10} minutos.</p>`,
        tenantId: user.tenantId || "global",
        emailType: "otp",
        moduleKey: "SOPORTE"
      }),
      MAIL_TIMEOUT_MS
    );
    const elapsedMs = Date.now() - sendStartedAt;
    console.info("[otp][mail] sent", {
      userId: user.id,
      email: maskEmail(user.email),
      elapsedMs,
      provider: result.provider || transportProvider,
      status: "sent"
    });
    console.info("[otp][send] ok", {
      userId: user.id,
      email: maskEmail(email),
      ip: maskIp(ip),
      elapsedMs,
      provider: result.provider || transportProvider
    });
  } catch (err: any) {
    const elapsedMs = Date.now() - sendStartedAt;
    const provider = transportProvider;
    const status = err?.code === "MAIL_TIMEOUT" ? "timeout" : "failed";
    console.warn("[otp][mail] failed", {
      userId: user.id,
      email: maskEmail(user.email),
      elapsedMs,
      provider,
      status
    });
    if (err?.code === "MAIL_TIMEOUT") {
      return NextResponse.json({ ok: false, error: "Timeout enviando OTP", code: "MAIL_TIMEOUT" }, { status: 504 });
    }
    console.error("[otp][mail]", err);
    return NextResponse.json({ ok: false, error: "No se pudo enviar OTP", code: "MAIL_FAIL" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: { expiresAt } });
}
