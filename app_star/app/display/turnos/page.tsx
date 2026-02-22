import Link from "next/link";
import { Sora } from "next/font/google";
import { prisma } from "@/lib/prisma";

const sora = Sora({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

const BRAND = {
  header: "#2e75ba",
  highlight: "#4aa59c",
  accent: "#4aadf5",
  background: "#F8FAFC"
};

export const dynamic = "force-dynamic";

export default async function TurnosIndexPage() {
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" }
  });

  return (
    <div
      className={`${sora.className} min-h-screen`}
      style={{
        background: `radial-gradient(circle at top, ${BRAND.accent}14, transparent 45%), ${BRAND.background}`
      }}
    >
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-10">
        <header className="rounded-2xl border border-slate-100 bg-white/90 px-6 py-6 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Pantalla pública</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Selecciona una sede</h1>
          <p className="mt-2 text-sm text-slate-500">
            Elige la sede para mostrar los turnos en pantalla completa.
          </p>
        </header>

        <section className="grid gap-4">
          {branches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-8 text-center text-sm text-slate-500">
              No hay sedes activas configuradas.
            </div>
          ) : (
            branches.map((branch) => (
              <Link
                key={branch.id}
                href={`/display/turnos/${branch.id}`}
                className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-6 py-5 shadow-[0_10px_22px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-slate-200"
              >
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {branch.code ?? "Sede"}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">{branch.name}</h2>
                </div>
                <span
                  className="rounded-full px-4 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: BRAND.header }}
                >
                  Ver turnos
                </span>
              </Link>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
