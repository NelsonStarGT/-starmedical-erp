"use client";

import { useState } from "react";

type Props = {
  onClose: () => void;
  onCreated: (id: string, name: string) => void;
};

async function createPatient(payload: any) {
  const res = await fetch("/api/diagnostics/patients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "No se pudo crear el paciente");
  return data.data as { id: string; firstName: string | null; lastName: string | null };
}

export function QuickCreatePatient({ onClose, onCreated }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dpi, setDpi] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName) {
      alert("Nombre requerido");
      return;
    }
    try {
      setSaving(true);
      const patient = await createPatient({ firstName, lastName, phone, email, dpi });
      onCreated(patient.id, `${patient.firstName || ""} ${patient.lastName || ""}`.trim());
      onClose();
    } catch (err: any) {
      alert(err.message || "No se pudo crear el paciente");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-[#d0e2f5] bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Paciente rápido</p>
            <h3 className="text-lg font-semibold text-[#163d66]">Crear paciente</h3>
          </div>
          <button onClick={onClose} className="text-sm text-slate-500 hover:underline">
            Cerrar
          </button>
        </div>
        <form onSubmit={handleSave} className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Nombres"
              className="w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-sm focus:border-[#4aa59c] focus:outline-none"
              required
            />
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Apellidos"
              className="w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-sm focus:border-[#4aa59c] focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Teléfono"
              className="w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-sm focus:border-[#4aa59c] focus:outline-none"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (opcional)"
              className="w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-sm focus:border-[#4aa59c] focus:outline-none"
              type="email"
            />
          </div>
          <input
            value={dpi}
            onChange={(e) => setDpi(e.target.value)}
            placeholder="DPI (opcional)"
            className="w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-sm focus:border-[#4aa59c] focus:outline-none"
          />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-[#4aa59c] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f8f87] disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Crear y usar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
