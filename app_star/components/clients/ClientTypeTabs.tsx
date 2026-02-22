import Link from "next/link";
import { Building2, Landmark, Shield, UserRound, type LucideIcon } from "lucide-react";
import { buildClientListHref, type HrefQuery } from "@/lib/clients/list/href";
import { cn } from "@/lib/utils";

type Kind = "PERSON" | "COMPANY" | "INSURER" | "INSTITUTION";

const TYPE_TABS: Array<{ kind: Kind; label: string; href: string; icon: LucideIcon }> = [
  { kind: "PERSON", label: "Personas", href: "/admin/clientes/personas", icon: UserRound },
  { kind: "COMPANY", label: "Empresas", href: "/admin/clientes/empresas", icon: Building2 },
  { kind: "INSURER", label: "Aseguradoras", href: "/admin/clientes/aseguradoras", icon: Shield },
  { kind: "INSTITUTION", label: "Instituciones", href: "/admin/clientes/instituciones", icon: Landmark }
];

export default function ClientTypeTabs({ activeKind, currentQuery }: { activeKind: Kind; currentQuery: HrefQuery }) {
  return (
    <div className="flex flex-wrap gap-2">
      {TYPE_TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.kind}
            href={buildClientListHref(tab.href, currentQuery)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
              activeKind === tab.kind
                ? "border-[#2e75ba] bg-[#2e75ba] text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
            )}
          >
            <Icon size={14} />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
