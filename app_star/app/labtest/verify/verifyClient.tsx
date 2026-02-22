"use client";

import { useState } from "react";
import { safeFetchJson } from "@/lib/http/safeFetchJson";

export default function VerifyClient({ showMailpitNotice = false }: { showMailpitNotice?: boolean }) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await safeFetchJson("/api/labtest/auth/send-otp", { method: "POST" });
      setMessage("Código enviado a tu correo");
    } catch (err: any) {
      setMessage(err.message || "No se pudo enviar código");
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await safeFetchJson("/api/labtest/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
      setMessage("Verificado. Redirigiendo...");
      window.location.href = "/labtest";
    } catch (err: any) {
      setMessage(err.message || "Código inválido o expirado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Verificación LabTest</p>
      <h1 className="text-2xl font-semibold text-[#163d66]">Autenticación adicional</h1>
      <p className="text-sm text-slate-600">Te enviamos un código a tu correo. Ingresa el código para continuar.</p>
      <div className="space-y-2">
        <button
          onClick={sendCode}
          disabled={loading}
          className="w-full rounded-full border border-[#dce7f5] bg-white px-4 py-2 text-sm font-semibold text-[#2e75ba] hover:bg-[#e8f1ff]"
        >
          {loading ? "Enviando..." : "Enviar código"}
        </button>
        {showMailpitNotice && (
          <p className="text-center text-xs text-slate-500">
            Modo desarrollo: revisa el código en Mailpit (http://localhost:8025).
          </p>
        )}
        <input
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-center tracking-[0.4em] text-lg"
          placeholder="••••••"
        />
        <button
          onClick={verify}
          disabled={loading || code.length < 4}
          className="w-full rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f8f87]"
        >
          Verificar
        </button>
      </div>
      {message && <div className="rounded-xl border border-[#dce7f5] bg-[#f8fafc] px-3 py-2 text-sm text-[#1f6f68]">{message}</div>}
    </div>
  );
}
