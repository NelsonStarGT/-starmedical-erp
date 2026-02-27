"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function CompactToolbar({
  visible,
  sticky = true,
  className,
  children
}: {
  visible: boolean;
  sticky?: boolean;
  className?: string;
  children: ReactNode;
}) {
  if (!visible) return null;

  return (
    <section
      className={cn(
        "rounded-xl border border-[#dce7f5] bg-white px-3 py-2 shadow-sm",
        sticky && "sticky top-3 z-20",
        className
      )}
    >
      {children}
    </section>
  );
}
