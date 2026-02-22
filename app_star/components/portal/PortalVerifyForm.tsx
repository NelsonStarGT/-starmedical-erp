"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type VerifyState = "idle" | "loading" | "error";

export function PortalVerifyForm() {
  const searchParams = useSearchParams();
  const token = String(searchParams.get("token") || "").trim();
  const phoneQuery = String(searchParams.get("phone") || "").trim();
  const processedTokenRef = useRef<string | null>(null);

  const [phone, setPhone] = useState(phoneQuery);
  const [code, setCode] = useState("");
  const [state, setState] = useState<VerifyState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const verifyAccess = async (payload: { token?: string; destination?: string; phone?: string; code?: string }) => {
    setState("loading");
    setMessage(null);

    try {
      const response = await fetch("/portal/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(json?.error || "No se pudo validar el acceso temporal."));
      }

      window.location.href = String(json?.redirectTo || "/portal/app");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "No se pudo validar el acceso temporal.");
    }
  };

  useEffect(() => {
    if (!token) return;
    if (processedTokenRef.current === token) return;
    processedTokenRef.current = token;
    void verifyAccess({ token });
  }, [token]);

  useEffect(() => {
    if (token) return;
    if (!phoneQuery) return;
    setPhone((current) => (current.trim() ? current : phoneQuery));
  }, [phoneQuery, token]);

  const submitOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!phone.trim() || !/^\d{6}$/.test(code.trim())) {
      setState("error");
      setMessage("Ingresa tu teléfono y un código de 6 dígitos.");
      return;
    }

    await verifyAccess({
      phone: phone.trim(),
      code: code.trim()
    });
  };

  return (
    <div className="space-y-4">
      {token ? (
        <div className="rounded-xl border border-[#d7e6f8] bg-[#f8fbff] px-4 py-3 text-sm text-slate-700">
          Verificando enlace mágico...
        </div>
      ) : (
        <form onSubmit={submitOtp} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Teléfono
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[#d7e6f8] bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#4aadf5] focus:ring-2 focus:ring-[#4aadf5]/25"
              placeholder="50255558888"
              autoComplete="tel"
              required
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Código OTP
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[#d7e6f8] bg-white px-4 py-3 text-center text-lg tracking-[0.35em] text-slate-900 shadow-sm outline-none transition focus:border-[#4aadf5] focus:ring-2 focus:ring-[#4aadf5]/25"
              placeholder="000000"
              maxLength={6}
              autoComplete="one-time-code"
              required
            />
          </label>

          <button
            type="submit"
            disabled={state === "loading"}
            className="inline-flex w-full items-center justify-center rounded-xl bg-[#4aa59c] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3d8f87] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state === "loading" ? "Validando..." : "Verificar código"}
          </button>
        </form>
      )}

      <Link href="/portal" className="inline-flex text-sm font-semibold text-[#2e75ba] hover:text-[#245f96]">
        Volver al inicio del portal
      </Link>

      {message && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      )}
    </div>
  );
}
