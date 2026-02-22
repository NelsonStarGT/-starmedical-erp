"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type ModuleTab = {
  label: string;
  href: string;
  matchPrefix?: string;
};

type Props = {
  tabs: ModuleTab[];
  variant?: string;
};

export default function ModuleTabs({ tabs }: Props) {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || (tab.matchPrefix ? pathname.startsWith(tab.matchPrefix) : pathname.startsWith(tab.href));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold transition",
              isActive ? "border-brand-primary bg-brand-primary text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
