import { Suspense } from "react";
import { PortalVerifyForm } from "@/components/portal/PortalVerifyForm";

export const runtime = "nodejs";

export default function PortalVerifyPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-10">
      <section className="w-full max-w-xl rounded-3xl border border-[#d2e2f6] bg-white/95 p-8 shadow-md backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">StarMedical</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Validar acceso temporal</h1>
        <p className="mt-2 text-sm text-slate-600">
          Puedes entrar con enlace mágico o con código OTP. El acceso vence a los 10 minutos.
        </p>
        <div className="mt-6">
          <Suspense fallback={<p className="text-sm text-slate-500">Cargando verificación...</p>}>
            <PortalVerifyForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
