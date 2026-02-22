'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, LogOut, Settings, UserRound } from "lucide-react";
import { useWhatsApp } from "../whatsapp/_components/WhatsAppProvider";

const navItems = [
  { label: "Bandeja de Entrada", href: "/ops/whatsapp/inbox" },
  { label: "Difusión", href: "/ops/whatsapp/broadcasts" },
  { label: "Chatbots", href: "/ops/whatsapp/bots" },
  { label: "Contactos", href: "/ops/whatsapp/contacts" },
  { label: "Automatizaciones", href: "/ops/whatsapp/automations" },
  { label: "Métricas", href: "/ops/whatsapp/metrics" },
  { label: "Integraciones", href: "/ops/whatsapp/integrations" },
  { label: "Webhooks", href: "/ops/whatsapp/webhooks" },
  { label: "Configuración", href: "/ops/whatsapp/settings" }
];

export default function OpsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWhatsApp = pathname.startsWith("/ops/whatsapp");
  const {
    workspaces,
    numbers,
    activeWorkspaceId,
    setActiveWorkspaceId,
    activeNumberId,
    setActiveNumberId
  } = useWhatsApp();
  const availableNumbers = numbers.filter((num) => num.workspaceId === activeWorkspaceId);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-screen-2xl px-4 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-[#4aa59c]/15 text-[#2e75ba] flex items-center justify-center font-bold">
              OPS
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.3rem] text-[#2e75ba] font-semibold">Operations Hub</p>
              <p className="text-base font-semibold text-slate-900">Comunicación y canales</p>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-2 lg:flex-row lg:items-center lg:justify-end lg:gap-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Workspace</span>
                <div className="relative">
                  <select
                    value={activeWorkspaceId ?? ""}
                    onChange={(event) => setActiveWorkspaceId(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-sm font-semibold text-slate-800 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
                  >
                    {workspaces.map((ws) => (
                      <option key={ws.id} value={ws.id}>
                        {ws.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Número</span>
                <div className="relative">
                  <select
                    value={activeNumberId ?? ""}
                    onChange={(event) => setActiveNumberId(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-sm font-semibold text-slate-800 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
                  >
                    {availableNumbers.map((num) => (
                      <option key={num.id} value={num.id}>
                        {num.label} ({num.e164})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 text-xs font-semibold">
                Conectado
              </span>
              <Link
                href="/ops/whatsapp/settings"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c]"
                aria-label="Configuración"
              >
                <Settings className="h-5 w-5" />
              </Link>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c]"
                aria-label="Notificaciones"
              >
                <Bell className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c]"
              >
                <UserRound className="h-5 w-5" />
                Perfil
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
              <button
                type="button"
                className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c]"
              >
                <LogOut className="h-5 w-5" />
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-screen-2xl px-4 py-6">
        {isWhatsApp ? (
          <main className="space-y-4">{children}</main>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <aside className="rounded-2xl bg-white border border-slate-200 shadow-sm p-3">
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition ${
                        isActive
                          ? "bg-[#4aa59c] text-white shadow-sm"
                          : "text-slate-700 hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </aside>
            <main className="space-y-4">{children}</main>
          </div>
        )}
      </div>
    </div>
  );
}
