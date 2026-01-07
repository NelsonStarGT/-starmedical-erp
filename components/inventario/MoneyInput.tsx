"use client";

import { ChangeEvent } from "react";
import { cn } from "@/lib/utils";

type MoneyInputProps = {
  label?: string;
  value?: number;
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: number | undefined) => void;
};

export function MoneyInput({ label, value, placeholder = "Q0.00", disabled, onChange }: MoneyInputProps) {
  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") {
      onChange(undefined);
      return;
    }
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) onChange(parsed);
  };

  return (
    <label className="flex flex-col gap-1 text-sm text-slate-700">
      {label && <span className="text-[12px] font-semibold text-slate-500">{label}</span>}
      <div className={cn("flex items-center gap-2 rounded-xl border border-[#E5E5E7] bg-white px-3 py-2 shadow-inner transition focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/15", disabled && "bg-slate-50 text-slate-400")}>
        <span className="text-slate-500 text-xs">Q</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={value ?? ""}
          onChange={handle}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
        />
      </div>
    </label>
  );
}
