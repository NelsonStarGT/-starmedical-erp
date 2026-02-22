import { PortalLoginForm } from "@/components/portal/PortalLoginForm";

export const runtime = "nodejs";

export default function PortalLandingPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-10">
      <section className="w-full max-w-2xl rounded-3xl border border-[#d2e2f6] bg-white/95 p-8 shadow-md backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">StarMedical</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Portal Paciente</h1>
        <p className="mt-2 text-sm text-slate-600">
          Ingresa tu DPI y teléfono para recibir un acceso temporal válido por 10 minutos. El correo es opcional.
        </p>
        <div className="mt-6">
          <PortalLoginForm />
        </div>
      </section>
    </main>
  );
}
