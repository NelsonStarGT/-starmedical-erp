"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default function ChangeOwnPasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    try {
      setPending(true);
      setMessage(null);
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const details = Array.isArray(payload?.details?.password) ? ` ${payload.details.password.join(" ")}` : "";
        throw new Error(String(payload?.error || "No se pudo cambiar el password.") + details);
      }
      setCurrentPassword("");
      setNewPassword("");
      setMessage({
        tone: "success",
        text: "Password actualizado. La sesión actual fue cerrada y debes iniciar sesión nuevamente."
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "No se pudo cambiar el password."
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cambiar mi contraseña</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {message ? (
          <div
            className={`rounded-xl border px-3 py-2 text-sm ${
              message.tone === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {message.text}
          </div>
        ) : null}
        <input
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          placeholder="Password actual"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="Nuevo password"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={!currentPassword.trim() || !newPassword.trim() || pending}
          onClick={handleSubmit}
          className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Actualizando..." : "Actualizar password"}
        </button>
      </CardContent>
    </Card>
  );
}
