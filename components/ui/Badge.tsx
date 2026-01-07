import React from "react";
import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  variant?: "success" | "neutral" | "warning" | "info";
  className?: string;
};

export function Badge({ children, variant = "neutral", className }: BadgeProps) {
  const styles = {
    success: "bg-green-100 text-green-700",
    neutral: "bg-slate-100 text-slate-700",
    warning: "bg-amber-100 text-amber-700",
    info: "bg-brand-primary/10 text-brand-primary"
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", styles[variant], className)}>
      {children}
    </span>
  );
}
