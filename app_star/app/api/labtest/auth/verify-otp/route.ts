import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getLabRoleForUser } from "@/lib/labtest/access";
import { getLabTestSettings } from "@/lib/labtest/settings";

const OTP_LOCK_WINDOW_MS = 10 * 60_000;

function getLockMinutes(failedCount: number) {
  if (failedCount >= 15) return 60;
  if (failedCount >= 10) return 15;
  if (failedCount >= 5) return 5;
  return 0;
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const user = auth.user!;

  const role = await getLabRoleForUser(user.id, user.branchId);
  const upperRoles = (user.roles || []).map((r) => String(r).toUpperCase());
  const isSuperAdmin = upperRoles.includes("SUPER_ADMIN");
  if (!role && !isSuperAdmin) {
    console.info("[otp][verify] denied", { userId: user.id, reason: "LAB_ACCESS_REQUIRED" });
    return NextResponse.json({ ok: false, error: "Sin acceso LabTest", code: "LAB_ACCESS_REQUIRED" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const normalizedCode = String(body?.code ?? "").replace(/\s+/g, "");
  if (!normalizedCode || normalizedCode.length !== 6 || !/^[0-9]{6}$/.test(normalizedCode)) {
    console.info("[otp][verify] invalid", { userId: user.id, reason: "OTP_INVALID_FORMAT" });
    return NextResponse.json({ ok: false, error: "Código inválido", code: "OTP_INVALID" }, { status: 400 });
  }

  const settings = await getLabTestSettings();

  const now = new Date();
  const windowAgo = new Date(now.getTime() - OTP_LOCK_WINDOW_MS);
  const failedAttempts = await prisma.labOtpAttempt.findMany({
    where: { userId: user.id, success: false, createdAt: { gt: windowAgo } },
    orderBy: { createdAt: "desc" }
  });
  const failedCount = failedAttempts.length;
  const lastFailedAt = failedAttempts[0]?.createdAt || null;
  const lockMinutes = getLockMinutes(failedCount);
  if (lockMinutes > 0 && lastFailedAt) {
    const lockUntil = new Date(lastFailedAt.getTime() + lockMinutes * 60_000);
    if (lockUntil > now) {
      const nextCount = failedCount + 1;
      const nextLockMinutes = getLockMinutes(nextCount);
      const remainingMinutes = Math.max(1, Math.ceil((lockUntil.getTime() - now.getTime()) / 60_000));
      console.info("[otp][verify] locked", { userId: user.id, reason: "OTP_LOCKED", remainingMinutes });
      return NextResponse.json(
        { ok: false, error: `Demasiados intentos. Intenta nuevamente en ${remainingMinutes} minutos.`, code: "OTP_LOCKED" },
        { status: 429 }
      );
    }
  }
  const challenge = await prisma.labOtpChallenge.findFirst({
    where: { userId: user.id, consumedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" }
  });
  if (!challenge) {
    console.info("[otp][verify] failed", { userId: user.id, reason: "OTP_EXPIRED" });
    return NextResponse.json({ ok: false, error: "OTP expirado", code: "OTP_EXPIRED" }, { status: 400 });
  }

  const hash = crypto.createHash("sha256").update(normalizedCode).digest("hex");
  if (hash !== challenge.codeHash) {
    await prisma.labOtpAttempt.create({ data: { userId: user.id, success: false } });
    const nextCount = failedCount + 1;
    const nextLockMinutes = getLockMinutes(nextCount);
    if (nextLockMinutes > 0) {
      const remainingMinutes = Math.max(1, nextLockMinutes);
      console.info("[otp][verify] locked", { userId: user.id, reason: "OTP_LOCKED", remainingMinutes });
      return NextResponse.json(
        { ok: false, error: `Demasiados intentos. Intenta nuevamente en ${remainingMinutes} minutos.`, code: "OTP_LOCKED" },
        { status: 429 }
      );
    }
    console.info("[otp][verify] failed", { userId: user.id, reason: "OTP_INVALID" });
    return NextResponse.json({ ok: false, error: "Código incorrecto", code: "OTP_INVALID" }, { status: 400 });
  }

  await prisma.labOtpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: now } });
  await prisma.labOtpAttempt.create({ data: { userId: user.id, success: true } });
  console.info("[otp][verify] ok", { userId: user.id, verifiedAt: now.toISOString() });

  const idleMinutes = settings.idleTimeoutMinutes && settings.idleTimeoutMinutes > 0 ? settings.idleTimeoutMinutes : 12 * 60;
  const res = NextResponse.json({ ok: true, data: { verifiedAt: now } });
  res.cookies.set({
    name: "labtest-verified",
    value: now.toISOString(),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: idleMinutes * 60
  });
  res.cookies.set({
    name: "labtest-last",
    value: Date.now().toString(),
    httpOnly: true,
    sameSite: "lax",
    path: "/"
  });
  return res;
}
