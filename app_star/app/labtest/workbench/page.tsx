import Link from "next/link";
import { FlaskConicalIcon, DropletsIcon, TestTube2Icon, BiohazardIcon, StethoscopeIcon } from "lucide-react";
import { areasUI } from "@/lib/labtest/areas";

const iconMap: Record<string, any> = {
  HEMATOLOGY: FlaskConicalIcon,
  CHEMISTRY: TestTube2Icon,
  ELECTROLYTES: DropletsIcon,
  URINE: BiohazardIcon,
  STOOL: StethoscopeIcon,
  OTHER: FlaskConicalIcon
};

export default function WorkbenchSelectorPage() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {areasUI.map((area) => {
        const Icon = iconMap[area.area] || FlaskConicalIcon;
        return (
        <Link
          key={area.slug}
          href={`/labtest/workbench/${area.slug}`}
          className="group rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Workbench</p>
              <h3 className="text-xl font-semibold text-[#163d66]">{area.label}</h3>
              <p className="text-sm text-slate-600">Abrir cola de trabajo operativa</p>
            </div>
            <Icon className="h-8 w-8 text-[#2e75ba]" />
          </div>
        </Link>
        );
      })}
    </div>
  );
}
