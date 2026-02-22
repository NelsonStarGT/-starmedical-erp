import { LabTestPriority } from "@prisma/client";
import { ArrowRightIcon, BeakerIcon, ClockIcon, MessageCircleIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isMissingLabTableError } from "@/lib/labtest/dbGuard";
import { cookies } from "next/headers";
import { getSessionUserFromCookies } from "@/lib/auth";

export const runtime = "nodejs";

export default async function LabTestDashboardPage() {
  // Fallback friendly if migrations/generate aún no se han corrido.
  const labRepo = (prisma as any).labTestOrder;
  const hasLab = labRepo && typeof labRepo.count === "function";
  const user = await getSessionUserFromCookies(cookies());
  const branchFilter = user?.branchId ? { branchId: user.branchId } : {};

  let labReady = hasLab;
  let pending = 0,
    queued = 0,
    inProcess = 0,
    released = 0,
    urgent = 0;

  if (hasLab) {
    try {
      const counts = await Promise.all([
        labRepo.count({ where: { ...branchFilter, status: { in: ["REQUESTED", "REQUIREMENTS_PENDING", "READY_FOR_COLLECTION"] } } }),
        labRepo.count({ where: { ...branchFilter, status: "QUEUED" } }),
        labRepo.count({ where: { ...branchFilter, status: "IN_PROCESS" } }),
        labRepo.count({ where: { ...branchFilter, status: { in: ["RELEASED", "SENT"] } } }),
        labRepo.count({ where: { ...branchFilter, priority: { in: ["URGENT", "STAT"] as LabTestPriority[] } } })
      ]);
      [pending, queued, inProcess, released, urgent] = counts as number[];
    } catch (err: any) {
      if (isMissingLabTableError(err)) {
        labReady = false;
      } else {
        throw err;
      }
    }
  }

  const cards = [
    { label: "Ingresos pendientes", value: pending, href: "/labtest/orders", icon: BeakerIcon, tone: "text-[#2e75ba]", bg: "bg-[#e8f1ff]" },
    { label: "En cola", value: queued, href: "/labtest/samples", icon: ClockIcon, tone: "text-[#1f6f68]", bg: "bg-[#e5f5f2]" },
    { label: "En proceso", value: inProcess, href: "/labtest/workbench", icon: ShieldCheckIcon, tone: "text-[#2e75ba]", bg: "bg-[#f8fafc]" },
    { label: "Liberados / enviados", value: released, href: "/labtest/results", icon: ArrowRightIcon, tone: "text-emerald-700", bg: "bg-emerald-50" }
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">LabTest operativo</p>
            <h2 className="text-2xl font-semibold text-[#163d66]">Estado general</h2>
            <p className="text-sm text-slate-600">Manual-first: captura, validación, liberación y envío.</p>
            {!labReady && (
              <p className="mt-1 text-xs font-semibold text-amber-700">
                Activa LabTest corriendo migración/generate (npx prisma migrate dev && npx prisma generate).
              </p>
            )}
          </div>
          <Link
            href="/labtest/orders"
            className="inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f8f87]"
          >
            Ir a bandeja
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          {cards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className={`group rounded-2xl border border-[#e5edf8] p-4 shadow-sm transition hover:shadow-md ${card.bg}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">{card.label}</p>
                  <p className={`text-3xl font-semibold ${card.tone}`}>{card.value}</p>
                </div>
                <card.icon className="h-7 w-7 text-[#2e75ba]" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Urgentes / STAT</p>
              <h3 className="text-xl font-semibold text-[#163d66]">Órdenes críticas</h3>
            </div>
            <span className="rounded-full bg-[#4aadf5] px-3 py-1 text-xs font-semibold text-white shadow-sm">{urgent}</span>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Prioriza la cola urgente desde Workbench. Las prioridades afectan SLA en Settings.
          </p>
          <Link href="/labtest/workbench" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#2e75ba]">
            Abrir Workbench <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
        <div className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Comunicación</p>
              <h3 className="text-xl font-semibold text-[#163d66]">Envío manual</h3>
            </div>
            <MessageCircleIcon className="h-6 w-6 text-[#4aa59c]" />
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Enviar resultados por WhatsApp o Email desde la bandeja de resultados. Se registra en el log de mensajes.
          </p>
          <Link href="/labtest/results" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#2e75ba]">
            Ver resultados <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
