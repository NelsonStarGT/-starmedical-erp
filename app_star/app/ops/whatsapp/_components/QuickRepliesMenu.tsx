'use client';

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import type { QuickReply } from "../types";

type QuickRepliesMenuProps = {
  replies: QuickReply[];
  onSelect: (reply: QuickReply) => void;
};

export default function QuickRepliesMenu({ replies, onSelect }: QuickRepliesMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c]"
      >
        <Sparkles className="h-4 w-4 text-[#4aa59c]" />
        Respuestas rápidas
        <ChevronDown className="h-4 w-4 text-slate-500" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-slate-200 bg-white shadow-lg shadow-[#0b1f3a14]">
          <ul className="max-h-64 overflow-y-auto py-2">
            {replies.map((reply) => (
              <li key={reply.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(reply);
                    setOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:bg-[#F8FAFC]"
                >
                  <p className="font-semibold text-[#2e75ba]">{reply.label}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{reply.text}</p>
                </button>
              </li>
            ))}
            {replies.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-500">Sin plantillas aún.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
