"use client";

import { FormEvent, useState } from "react";

type AppointmentTypeOption = {
  id: string;
  name: string;
  durationMin: number;
};

type BranchOption = {
  id: string;
  name: string;
};

export function PortalAppointmentRequestForm({
  appointmentTypes,
  branches
}: {
  appointmentTypes: AppointmentTypeOption[];
  branches: BranchOption[];
}) {
  const [typeId, setTypeId] = useState(appointmentTypes[0]?.id ?? "");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [preferredDate1, setPreferredDate1] = useState("");
  const [preferredDate2, setPreferredDate2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/portal/api/appointments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typeId,
          branchId,
          reason,
          preferredDate1,
          preferredDate2: preferredDate2 || null
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(payload?.error || "No se pudo enviar la solicitud de cita."));
      }
      setSuccessMessage("Solicitud enviada. Recepción confirmará tu cita en breve.");
      setReason("");
      setPreferredDate1("");
      setPreferredDate2("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la solicitud de cita.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-[#d2e2f6] bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Tipo de cita
          <select
            value={typeId}
            onChange={(event) => setTypeId(event.target.value)}
            className="mt-1 w-full rounded-xl border border-[#d7e6f8] bg-white px-3 py-2 text-sm text-slate-900"
            required
          >
            {appointmentTypes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.durationMin} min)
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Sede
          <select
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
            className="mt-1 w-full rounded-xl border border-[#d7e6f8] bg-white px-3 py-2 text-sm text-slate-900"
            required
          >
            {branches.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Motivo de cita
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          required
          rows={4}
          className="mt-1 w-full rounded-xl border border-[#d7e6f8] bg-white px-3 py-2 text-sm text-slate-900"
          placeholder="Describe brevemente tu motivo de consulta."
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Preferencia 1 (obligatoria)
          <input
            type="datetime-local"
            value={preferredDate1}
            onChange={(event) => setPreferredDate1(event.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-[#d7e6f8] bg-white px-3 py-2 text-sm text-slate-900"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Preferencia 2 (opcional)
          <input
            type="datetime-local"
            value={preferredDate2}
            onChange={(event) => setPreferredDate2(event.target.value)}
            className="mt-1 w-full rounded-xl border border-[#d7e6f8] bg-white px-3 py-2 text-sm text-slate-900"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center rounded-xl bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3b8f86] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Enviando..." : "Solicitar cita"}
      </button>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {successMessage && (
        <p className="rounded-xl border border-[#cde7e4] bg-[#eff8f7] px-3 py-2 text-sm text-[#1f6f68]">{successMessage}</p>
      )}
    </form>
  );
}
