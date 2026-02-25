import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "./lib/constants";

const IS_PROD = process.env.NODE_ENV === "production";

const SECURITY_HEADERS = {
  "Content-Security-Policy": [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${IS_PROD ? "" : " 'unsafe-eval'"} blob:`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: ws: wss:",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join("; "),
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin"
} as const;

function withSecurityHeaders(response: NextResponse) {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  if (IS_PROD) {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return response;
}

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
      return withSecurityHeaders(NextResponse.redirect(redirectUrl, 308));
    }

    if (pathname === "/medical/clinica" || pathname === "/medical/clinica/") {
      redirectUrl.pathname = "/modulo-medico/dashboard";
      return withSecurityHeaders(NextResponse.redirect(redirectUrl, 308));
    }

    if (pathname === "/medical/operativo" || pathname === "/medical/operativo/") {
      redirectUrl.pathname = "/modulo-medico/operaciones";
      return withSecurityHeaders(NextResponse.redirect(redirectUrl, 308));
    }

    if (pathname.startsWith("/medical/encounter/")) {
      redirectUrl.pathname = pathname.replace("/medical/encounter/", "/modulo-medico/consultaM/");
      return withSecurityHeaders(NextResponse.redirect(redirectUrl, 308));
    }

    if (pathname === "/medical/encounter") {
      redirectUrl.pathname = "/modulo-medico/consultaM";
      return withSecurityHeaders(NextResponse.redirect(redirectUrl, 308));
    }

    redirectUrl.pathname = pathname.replace("/medical/", "/modulo-medico/");
    return withSecurityHeaders(NextResponse.redirect(redirectUrl, 308));
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
    return withSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  if (isLoginRoute && authenticated) {
    const adminUrl = new URL("/admin", request.url);
    return withSecurityHeaders(NextResponse.redirect(adminUrl));
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
      return withSecurityHeaders(res);
    }
    const res = withSecurityHeaders(NextResponse.next());
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
      const redirect = withSecurityHeaders(NextResponse.redirect(verifyUrl));
      redirect.cookies.set({ name: "labtest-verified", value: "", path: "/", maxAge: 0 });
      redirect.cookies.set({ name: "labtest-last", value: "", path: "/", maxAge: 0 });
      return redirect;
    }
    return res;
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/login",
    "/medical",
    "/medical/:path*",
    "/admin/:path*",
    "/hr/:path*",
    "/diagnostics/:path*",
    "/labtest/:path*",
    "/api/:path*"
  ]
};
