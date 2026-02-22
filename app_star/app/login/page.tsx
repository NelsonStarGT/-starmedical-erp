'use client';

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LockClosedIcon } from "@heroicons/react/24/outline";
import { AUTH_COOKIE_NAME } from "@/lib/constants";

const hasSession = () =>
  typeof document !== "undefined" &&
  document.cookie.split(";").some((cookie) => cookie.trim().startsWith(`${AUTH_COOKIE_NAME}=`));

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hasSession()) {
      router.replace("/admin");
    }
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem(
          "star-erp-user",
          JSON.stringify({ email: data.email, name: data.name || data.email })
        );
        router.push("/admin");
      } else if (response.status === 401) {
        setError("Credenciales incorrectas. Verifica tu correo y contraseña.");
      } else {
        setError("No se pudo iniciar sesión. Intenta nuevamente.");
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(1000px_at_10%_20%,rgba(12,116,255,0.25),transparent),radial-gradient(900px_at_80%_0%,rgba(44,211,255,0.2),transparent),linear-gradient(180deg,#0b1f3a,#0c2446)] flex items-center justify-center px-4">
      <div className="glass-card max-w-md w-full rounded-2xl p-8 border border-white/20 bg-white/90 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-2xl bg-brand-primary text-white flex items-center justify-center font-semibold shadow-lg shadow-brand-primary/40">
            SM
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.25rem] text-slate-500">StarMedical</p>
            <h1 className="text-2xl font-semibold text-brand-navy">ERP</h1>
          </div>
        </div>

        <div className="mb-8">
          <p className="text-sm text-slate-500">Iniciar sesión</p>
          <h2 className="text-3xl font-semibold text-brand-navy">Bienvenido de nuevo</h2>
          <p className="text-sm text-slate-500 mt-2">
            Accede al panel administrativo para gestionar usuarios y clientes.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="email">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
              placeholder="nelsonlopezallen@gmail.com"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-3 text-white font-semibold shadow-lg shadow-brand-primary/30 transition hover:-translate-y-[1px] hover:shadow-brand-primary/40 disabled:opacity-60 disabled:shadow-none"
          >
            <LockClosedIcon className="h-5 w-5" />
            {loading ? "Validando..." : "Ingresar"}
          </button>
        </form>

        <p className="mt-6 text-xs text-slate-500">
          Uso exclusivo para pruebas de desarrollo. No utilizar estas credenciales en producción.
        </p>
      </div>
    </div>
  );
}
