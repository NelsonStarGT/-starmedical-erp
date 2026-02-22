import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "./lib/constants";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const authenticated = Boolean(sessionCookie);
  const isMedicalRoute = pathname === "/medical" || pathname.startsWith("/medical/");
  const isLoginRoute = pathname.startsWith("/login");
  const isAdminRoute = pathname.startsWith("/admin");
  const isHrRoute = pathname.startsWith("/hr");
  const isDiagnosticsRoute = pathname.startsWith("/diagnostics");
  const isLabTestRoute = pathname.startsWith("/labtest");
  const now = Date.now();

  if (isMedicalRoute) {
    const redirectUrl = request.nextUrl.clone();
    if (pathname === "/medical" || pathname === "/medical/") {
      redirectUrl.pathname = "/modulo-medico/dashboard";
      return NextResponse.redirect(redirectUrl, 308);
    }

    if (pathname === "/medical/clinica" || pathname === "/medical/clinica/") {
      redirectUrl.pathname = "/modulo-medico/dashboard";
      return NextResponse.redirect(redirectUrl, 308);
    }

    if (pathname === "/medical/operativo" || pathname === "/medical/operativo/") {
      redirectUrl.pathname = "/modulo-medico/operaciones";
      return NextResponse.redirect(redirectUrl, 308);
    }

    if (pathname.startsWith("/medical/encounter/")) {
      redirectUrl.pathname = pathname.replace("/medical/encounter/", "/modulo-medico/consultaM/");
      return NextResponse.redirect(redirectUrl, 308);
    }

    if (pathname === "/medical/encounter") {
      redirectUrl.pathname = "/modulo-medico/consultaM";
      return NextResponse.redirect(redirectUrl, 308);
    }

    redirectUrl.pathname = pathname.replace("/medical/", "/modulo-medico/");
    return NextResponse.redirect(redirectUrl, 308);
  }

  const labSecCookie = request.cookies.get("lab-sec")?.value;
  let idleMinutes = 120;
  let requireOtp = true;
  if (labSecCookie) {
    try {
      const parsed = JSON.parse(labSecCookie);
      idleMinutes = parsed.idleTimeoutMinutes ?? idleMinutes;
      requireOtp = parsed.requireOtpForLabTest ?? requireOtp;
    } catch {
      try {
        const parsed = JSON.parse(decodeURIComponent(labSecCookie));
        idleMinutes = parsed.idleTimeoutMinutes ?? idleMinutes;
        requireOtp = parsed.requireOtpForLabTest ?? requireOtp;
      } catch {
        /* ignore */
      }
    }
  }

  if ((isAdminRoute || isHrRoute || isDiagnosticsRoute || isLabTestRoute) && !authenticated) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginRoute && authenticated) {
    const adminUrl = new URL("/admin", request.url);
    return NextResponse.redirect(adminUrl);
  }

  if (isLabTestRoute && authenticated) {
    const last = Number(request.cookies.get("labtest-last")?.value || 0);
    const verifiedRaw = request.cookies.get("labtest-verified")?.value || "";
    let verifiedOk = false;
    if (verifiedRaw) {
      const ts = Date.parse(verifiedRaw);
      if (!Number.isNaN(ts) && now - ts <= idleMinutes * 60 * 1000) {
        verifiedOk = true;
      }
    }
    if (last && now - last > idleMinutes * 60 * 1000) {
      const loginUrl = new URL("/login", request.url);
      const res = NextResponse.redirect(loginUrl);
      res.cookies.set({ name: AUTH_COOKIE_NAME, value: "", path: "/", maxAge: 0 });
      res.cookies.set({ name: "labtest-verified", value: "", path: "/", maxAge: 0 });
      res.cookies.set({ name: "labtest-last", value: "", path: "/", maxAge: 0 });
      return res;
    }
    const res = NextResponse.next();
    res.cookies.set({
      name: "labtest-last",
      value: now.toString(),
      httpOnly: true,
      sameSite: "lax",
      path: "/"
    });

    const isVerifyPath = pathname.startsWith("/labtest/verify");
    const isAuthPath = pathname.startsWith("/labtest/auth");
    if (requireOtp && !isVerifyPath && !isAuthPath && !verifiedOk) {
      const verifyUrl = new URL("/labtest/verify", request.url);
      res.cookies.set({ name: "labtest-verified", value: "", path: "/", maxAge: 0 });
      res.cookies.set({ name: "labtest-last", value: "", path: "/", maxAge: 0 });
      return NextResponse.redirect(verifyUrl);
    }
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/medical", "/medical/:path*", "/admin/:path*", "/hr/:path*", "/diagnostics/:path*", "/labtest/:path*"]
};
