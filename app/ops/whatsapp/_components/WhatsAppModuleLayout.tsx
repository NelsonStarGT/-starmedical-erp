'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Poppins } from "next/font/google";
import {
  BarChart3,
  Bell,
  Bot,
  ChevronDown,
  Inbox,
  Megaphone,
  MessageCirclePlus,
  Network,
  Plug,
  Search,
  Upload,
  UserRound,
  Users,
  Workflow
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useWhatsApp } from "./WhatsAppProvider";

const headingFont = Poppins({
  subsets: ["latin"],
  weight: ["600", "700"]
});

type TabItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const tabs: TabItem[] = [
  { label: "Bandeja de entrada", href: "/ops/whatsapp/inbox", icon: Inbox },
  { label: "Difusión", href: "/ops/whatsapp/broadcasts", icon: Megaphone },
  { label: "Chatbots", href: "/ops/whatsapp/bots", icon: Bot },
  { label: "Contactos", href: "/ops/whatsapp/contacts", icon: Users },
  { label: "Automatizaciones", href: "/ops/whatsapp/automations", icon: Workflow }
];

const moreItems: TabItem[] = [
  { label: "Métricas", href: "/ops/whatsapp/metrics", icon: BarChart3 },
  { label: "Configuración", href: "/ops/whatsapp/settings", icon: UserRound },
  { label: "Integraciones", href: "/ops/whatsapp/integrations", icon: Plug },
  { label: "Webhooks", href: "/ops/whatsapp/webhooks", icon: Network }
];

function resolveAction(pathname: string) {
  if (pathname.startsWith("/ops/whatsapp/broadcasts")) {
    return { label: "Nueva difusión", icon: Megaphone };
  }
  if (pathname.startsWith("/ops/whatsapp/bots")) {
    return { label: "Crear bot", icon: Bot };
  }
  if (pathname.startsWith("/ops/whatsapp/contacts")) {
    return { label: "Importar", icon: Upload };
  }
  if (pathname.startsWith("/ops/whatsapp/automations")) {
    return { label: "Nueva automatización", icon: Workflow };
  }
  return { label: "Nuevo chat", icon: MessageCirclePlus };
}

export default function WhatsAppModuleLayout({ children }: { children: React.ReactNode }) {
  const { globalSearch, setGlobalSearch } = useWhatsApp();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const action = useMemo(() => resolveAction(pathname), [pathname]);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-white border border-slate-200 shadow-md shadow-[#2e75ba0d] px-5 py-4 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.3rem] text-[#2e75ba] font-semibold">Servicio al cliente</p>
            <h1 className={`${headingFont.className} text-2xl font-semibold text-[#2e75ba]`}>WhatsApp Center</h1>
            <p className="text-xs text-slate-500">Top bar estilo WATI: navegación central, panel de contacto a la derecha.</p>
          </div>
          <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
            <div className="relative w-full lg:max-w-xl">
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
                placeholder="Buscar contacto, número, etiqueta…"
                className="w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] py-2.5 pl-11 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-[#4aa59c] px-3 py-2 text-sm font-semibold text-white shadow-md shadow-[#4aa59c33] transition hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c]"
              >
                {action.icon ? <action.icon className="h-5 w-5" /> : null}
                {action.label}
              </button>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c]"
                aria-label="Notificaciones"
              >
                <Bell className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c]"
                aria-label="Perfil"
              >
                <UserRound className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "bg-[#4aa59c] text-white shadow-sm"
                      : "text-slate-700 border border-slate-200 bg-[#F8FAFC] hover:bg-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              );
            })}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 bg-[#F8FAFC] hover:bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c]"
              >
                Más
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </button>
              {moreOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white shadow-lg shadow-[#2e75ba1a] z-10">
                  {moreItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold transition ${
                          isActive ? "bg-[#4aa59c]/10 text-[#2e75ba]" : "text-slate-700 hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[#e2e8f0] bg-[#F8FAFC] shadow-sm shadow-[#2e75ba0a] px-3 py-4 lg:px-6 lg:py-5">
        {children}
      </div>
    </div>
  );
}
