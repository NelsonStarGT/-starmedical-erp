"use client";

import { useEffect, useState } from "react";

type Patient = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  dpi: string | null;
  phone: string | null;
  email: string | null;
};

type Props = {
  value: string;
  onChange: (patientId: string, patient?: Patient | null) => void;
};

async function fetchPatients(q: string) {
  const res = await fetch(`/api/diagnostics/patients?q=${encodeURIComponent(q)}`, { cache: "no-store", credentials: "include" });
  if (!res.ok) throw new Error("No se pudo buscar pacientes");
  const data = await res.json();
  return data.data as Patient[];
}

export function QuickPatientSearch({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchPatients(query)
      .then((items) => {
        if (!cancelled) setResults(items || []);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar paciente (nombre, teléfono, DPI)"
          className="w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-sm focus:border-[#4aa59c] focus:outline-none"
        />
        {loading && <span className="text-xs text-slate-500">Buscando...</span>}
      </div>
      <div className="max-h-40 overflow-auto rounded-lg border border-[#e5edf8] bg-white">
        {results.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              onChange(p.id, p);
              setResults([]);
              setQuery(`${p.firstName || ""} ${p.lastName || ""}`.trim());
            }}
            className="flex w-full items-start gap-2 border-b border-[#f1f5f9] px-3 py-2 text-left text-sm hover:bg-[#f8fafc]"
          >
            <div className="font-semibold text-[#163d66]">{`${p.firstName || ""} ${p.lastName || ""}`.trim() || "Paciente"}</div>
            <div className="text-xs text-slate-500">{p.phone || p.dpi || p.email || p.id}</div>
          </button>
        ))}
        {!results.length && !loading && query && (
          <div className="px-3 py-2 text-xs text-slate-500">Sin coincidencias</div>
        )}
      </div>
    </div>
  );
}
