"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavLink = { label: string; href: string };

export default function LabTestNavTabs({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-[#dce7f5]">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4aa59c]",
              active
                ? "border-[#2e75ba] bg-[#2e75ba] text-white shadow-sm"
                : "border-[#dce7f5] bg-white text-[#2e75ba] hover:bg-[#e8f1ff]"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
