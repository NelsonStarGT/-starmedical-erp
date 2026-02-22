"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { buildClientListHref, type HrefQuery } from "@/lib/clients/list/href";

export default function DebouncedSearchInput({
  basePath,
  initialValue,
  query,
  placeholder,
  delayMs = 350,
  disabled
}: {
  basePath: string;
  initialValue: string;
  query: HrefQuery;
  placeholder: string;
  delayMs?: number;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (value === initialValue) return;

    const timeout = setTimeout(() => {
      const href = buildClientListHref(basePath, {
        ...query,
        q: value || undefined,
        error: undefined,
        page: undefined
      });
      router.replace(href, { scroll: false });
    }, delayMs);

    return () => clearTimeout(timeout);
  }, [basePath, delayMs, initialValue, query, router, value]);

  return (
    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
      <Search size={16} className="text-slate-400" />
      <input
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-[240px] bg-transparent text-sm text-slate-700 outline-none"
      />
    </div>
  );
}
