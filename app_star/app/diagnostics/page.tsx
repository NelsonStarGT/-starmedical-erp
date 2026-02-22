import Link from "next/link";
import { ArrowRightIcon, BeakerIcon, ClipboardIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { listOrders, listCatalogItems } from "@/lib/server/diagnostics.service";

export const runtime = "nodejs";

export default async function DiagnosticsDashboardPage() {
  const [orders, catalog] = await Promise.all([listOrders(), listCatalogItems()]);

  const labItems = orders.flatMap((o) => o.items.filter((i) => i.kind === "LAB"));
  const imagingItems = orders.flatMap((o) => o.items.filter((i) => i.kind === "IMAGING"));
  const xrItems = imagingItems.filter((i) => i.catalogItem.modality === "XR");
  const usItems = imagingItems.filter((i) => i.catalogItem.modality === "US");

  const pendingPayment = orders.filter((o) => o.adminStatus === "PENDING_PAYMENT").length;
  const pendingExecution = orders.filter((o) => o.adminStatus === "PAID").length;
  const inExecution = orders.filter((o) => o.adminStatus === "SENT_TO_EXECUTION").length;
  const completedToday = orders.filter((o) => {
    if (o.adminStatus !== "COMPLETED") return false;
    const updated = new Date(o.updatedAt);
    const now = new Date();
    return updated.toDateString() === now.toDateString();
  }).length;

  const adminStatusCounts = [
    { label: "Borrador", value: orders.filter((o) => o.adminStatus === "DRAFT").length },
    { label: "Pendiente pago", value: pendingPayment },
    { label: "Autorización seguro", value: orders.filter((o) => o.adminStatus === "INSURANCE_AUTH").length },
    { label: "Pagada", value: orders.filter((o) => o.adminStatus === "PAID").length },
    { label: "En ejecución", value: inExecution },
    { label: "Completada", value: orders.filter((o) => o.adminStatus === "COMPLETED").length },
    { label: "Cancelada", value: orders.filter((o) => o.adminStatus === "CANCELLED").length }
  ];

  const areaCards = [
    {
      label: "Laboratorio",
      value: labItems.length,
      href: "/diagnostics/lab/worklist",
      tone: "text-[#1f6f68]",
      bg: "bg-[#e5f5f2]",
      icon: <BeakerIcon className="h-6 w-6" />
    },
    {
      label: "Rayos X",
      value: xrItems.length,
      href: "/diagnostics/imaging/xray/worklist",
      tone: "text-[#2e75ba]",
      bg: "bg-[#e8f1ff]",
      icon: <PhotoIcon className="h-6 w-6" />
    },
    {
      label: "Ultrasonidos",
      value: usItems.length,
      href: "/diagnostics/imaging/us/worklist",
      tone: "text-[#2e75ba]",
      bg: "bg-[#e8f1ff]",
      icon: <PhotoIcon className="h-6 w-6" />
    }
  ];

  const statusCards = [
    {
      label: "Pendiente pago",
      value: pendingPayment,
      href: "/diagnostics/orders",
      tone: "text-amber-700",
      bg: "bg-amber-50",
      icon: <ClipboardIcon className="h-6 w-6" />
    },
    {
      label: "Pendiente ejecución",
      value: pendingExecution,
      href: "/diagnostics/orders",
      tone: "text-[#2e75ba]",
      bg: "bg-[#e9f1fb]",
      icon: <ClipboardIcon className="h-6 w-6" />
    },
    {
      label: "En ejecución",
      value: inExecution,
      href: "/diagnostics/orders",
      tone: "text-[#2e75ba]",
      bg: "bg-[#e8f1ff]",
      icon: <ArrowRightIcon className="h-6 w-6" />
    },
    {
      label: "Completadas hoy",
      value: completedToday,
      href: "/diagnostics/orders",
      tone: "text-emerald-700",
      bg: "bg-emerald-50",
      icon: <ArrowRightIcon className="h-6 w-6" />
    }
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-md shadow-[#d7e6f8]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Dashboard</p>
            <h2 className="text-2xl font-semibold text-[#163d66] font-[var(--font-dx-heading)]">
              Panel administrativo de diagnóstico
            </h2>
            <p className="text-sm text-slate-600">Ingreso, pagos y envío a ejecución con seguimiento por área.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/diagnostics/orders"
              className="inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f8f87]"
            >
              Ir a Órdenes
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <Link
              href="/labtest/orders"
              className="inline-flex items-center gap-2 rounded-full border border-[#dce7f5] bg-white px-4 py-2 text-sm font-semibold text-[#2e75ba] shadow-sm hover:bg-[#e8f1ff]"
            >
              Abrir LabTest
              <BeakerIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {areaCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`group flex items-center justify-between rounded-2xl border border-[#dce7f5] p-5 shadow-sm transition hover:shadow-md ${card.bg}`}
          >
            <div>
              <p className="text-sm text-slate-600">{card.label}</p>
              <p className={`text-3xl font-semibold ${card.tone}`}>{card.value}</p>
            </div>
            <div className="rounded-full bg-white/70 p-2 text-[#2e75ba] shadow-sm group-hover:scale-105">
              {card.icon}
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {statusCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`group flex items-center justify-between rounded-2xl border border-[#dce7f5] p-5 shadow-sm transition hover:shadow-md ${card.bg}`}
          >
            <div>
              <p className="text-sm text-slate-600">{card.label}</p>
              <p className={`text-3xl font-semibold ${card.tone}`}>{card.value}</p>
            </div>
            <div className="rounded-full bg-white/70 p-2 text-[#2e75ba] shadow-sm group-hover:scale-105">
              {card.icon}
            </div>
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#e5edf8] pb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Estados administrativos</p>
            <h3 className="text-lg font-semibold text-[#163d66] font-[var(--font-dx-heading)]">Órdenes por adminStatus</h3>
          </div>
          <Link href="/diagnostics/orders" className="text-sm font-semibold text-[#2e75ba] hover:underline">
            Ver órdenes
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {adminStatusCounts.map((item) => (
            <div key={item.label} className="rounded-full border border-[#e5edf8] bg-[#f8fafc] px-3 py-1 text-xs font-semibold text-[#2e75ba]">
              {item.label}: {item.value}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#e5edf8] pb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Catálogo completo</p>
            <h3 className="text-lg font-semibold text-[#163d66] font-[var(--font-dx-heading)]">LAB + XR + US</h3>
          </div>
          <Link href="/diagnostics/catalog" className="text-sm font-semibold text-[#2e75ba] hover:underline">
            Ver catálogo
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[#e5edf8] bg-[#f8fafc] p-3 text-sm">
            <p className="text-slate-500">Total items</p>
            <p className="text-xl font-semibold text-[#163d66]">{catalog.length}</p>
          </div>
          <div className="rounded-xl border border-[#e5edf8] bg-[#e5f5f2] p-3 text-sm text-[#1f6f68]">
            <p>Laboratorio</p>
            <p className="text-xl font-semibold">{catalog.filter((c) => c.kind === "LAB").length}</p>
          </div>
          <div className="rounded-xl border border-[#e5edf8] bg-[#e8f1ff] p-3 text-sm text-[#2e75ba]">
            <p>Imagen (XR/US)</p>
            <p className="text-xl font-semibold">{catalog.filter((c) => c.kind === "IMAGING").length}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
