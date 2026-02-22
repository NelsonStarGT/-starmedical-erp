"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type ReceptionAction = {
  key: string;
  label: string;
  onClick?: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function ActionButton({
  label,
  onClick,
  icon,
  disabled,
  variant = "secondary"
}: Omit<ReceptionAction, "key">) {
  const styles =
    variant === "primary"
      ? "bg-[#4aa59c] text-white hover:bg-[#3f988f] border-transparent"
      : variant === "danger"
        ? "bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-100"
        : variant === "ghost"
          ? "bg-transparent text-slate-600 hover:bg-slate-100 border-transparent"
          : "bg-white text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba] border-slate-200";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        styles
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export function ActionButtons({ actions, className }: { actions: ReceptionAction[]; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {actions.map((action) => (
        <ActionButton
          key={action.key}
          label={action.label}
          onClick={action.onClick}
          icon={action.icon}
          disabled={action.disabled}
          variant={action.variant}
        />
      ))}
    </div>
  );
}
