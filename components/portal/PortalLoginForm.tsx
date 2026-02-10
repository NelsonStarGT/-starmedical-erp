"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type RequestState = "idle" | "loading" | "success" | "error";

type PortalRequestResponse = {
  ok: boolean;
  message?: string;
  error?: string;
  cooldownSeconds?: number;
  devOnly?: {
    devMagicLink: string;
    devOtpCode: string;
  };
};

export function PortalLoginForm() {
  const [dpi, setDpi] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<RequestState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [devOnly, setDevOnly] = useState<{ devMagicLink: string; devOtpCode: string } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const canSubmit = useMemo(() => {
    const hasIdentity = dpi.trim().length >= 6;
    const hasDestination = email.trim().length > 0 || phone.trim().length >= 8;
    return hasIdentity && hasDestination;
  }, [dpi, email, phone]);

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setState("loading");
    setMessage(null);
    setDevOnly(null);

    try {
      const response = await fetch("/portal/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dpi: dpi.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null
        })
      });

      const payload = (await response.json().catch(() => ({}))) as PortalRequestResponse;
      if (!response.ok) {
        throw new Error(String(payload?.error || "No se pudo procesar la solicitud."));
      }

      setState("success");
      setMessage(String(payload?.message || "Si los datos coinciden, revisa tu correo para continuar."));
      setCooldown(Number(payload?.cooldownSeconds || 60));
      setDevOnly(payload.devOnly ?? null);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "No se pudo enviar el acceso temporal.");
    }
  };

  return (
    <form onSubmit={submitRequest} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          DPI
          <input
            required
            value={dpi}
            onChange={(event) => setDpi(event.target.value)}
            className="mt-1 w-full rounded-xl border border-[#d7e6f8] bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#4aadf5] focus:ring-2 focus:ring-[#4aadf5]/25"
            placeholder="1234567890101"
            autoComplete="off"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Correo electrónico
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-xl border border-[#d7e6f8] bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#4aadf5] focus:ring-2 focus:ring-[#4aadf5]/25"
            placeholder="paciente@correo.com"
            autoComplete="email"
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Teléfono (opcional)
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="mt-1 w-full rounded-xl border border-[#d7e6f8] bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#4aadf5] focus:ring-2 focus:ring-[#4aadf5]/25"
          placeholder="50255558888"
          autoComplete="tel"
        />
      </label>

      <button
        type="submit"
        disabled={state === "loading" || cooldown > 0 || !canSubmit}
        className="inline-flex w-full items-center justify-center rounded-xl bg-[#4aa59c] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3d8f87] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === "loading" ? "Enviando acceso..." : cooldown > 0 ? `Reenviar en ${cooldown}s` : "Enviar acceso temporal"}
      </button>

      <p className="text-xs text-slate-500">
        Si no puedes acceder, contacta a recepción para validar tu correo y datos de identificación.
      </p>

      {message && (
        <div
          className={
            state === "error"
              ? "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              : "rounded-xl border border-[#cde7e4] bg-[#eff8f7] px-4 py-3 text-sm text-[#1f6f68]"
          }
        >
          {message}
        </div>
      )}

      {devOnly && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Modo desarrollo</p>
          <p className="mt-1">Link mágico:</p>
          <a href={devOnly.devMagicLink} className="break-all font-medium underline" target="_blank" rel="noreferrer">
            {devOnly.devMagicLink}
          </a>
          <p className="mt-2">OTP: <strong>{devOnly.devOtpCode}</strong></p>
        </div>
      )}
    </form>
  );
}
