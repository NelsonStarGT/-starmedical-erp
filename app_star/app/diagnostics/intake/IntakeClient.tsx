"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import type { DiagnosticCatalogItem } from "@/lib/diagnostics/types";

const steps = ["Paciente", "Signos vitales", "Orden clínica", "Resumen"] as const;

type Patient = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  dpi: string | null;
  sex?: string | null;
  birthDate?: string | null;
  address?: string | null;
};

type VitalSigns = {
  weight?: string;
  height?: string;
  bloodPressure?: string;
  temperature?: string;
  heartRate?: string;
  oxygenSaturation?: string;
};

type Props = {
  catalog: DiagnosticCatalogItem[];
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", credentials: "include", ...init });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Error en solicitud");
  return data;
}

export default function IntakeClient({ catalog }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createWarnings, setCreateWarnings] = useState<Patient[]>([]);
  const [newPatient, setNewPatient] = useState({
    firstName: "",
    lastName: "",
    sex: "M",
    birthDate: "",
    phone: "",
    email: "",
    address: "",
    dpi: ""
  });
  const [duplicateCandidates, setDuplicateCandidates] = useState<Patient[]>([]);
  const [vitalSigns, setVitalSigns] = useState<VitalSigns>({});
  const [receptionNotes, setReceptionNotes] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [priority, setPriority] = useState<"ROUTINE" | "URGENT" | "STAT">("ROUTINE");
  const [catalogTab, setCatalogTab] = useState<"LAB" | "XR" | "US">("LAB");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const canGoNext = useMemo(() => {
    if (stepIndex === 0) return Boolean(selectedPatient);
    if (stepIndex === 2) return selectedItems.size > 0;
    return true;
  }, [stepIndex, selectedPatient, selectedItems]);

  const selectedItemsList = useMemo(() => {
    return catalog.filter((item) => selectedItems.has(item.id));
  }, [catalog, selectedItems]);

  const totalEstimate = useMemo(() => {
    return selectedItemsList.reduce((sum, item) => sum + (item.price || 0), 0);
  }, [selectedItemsList]);

  useEffect(() => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    const timeout = setTimeout(() => {
      fetchJson<{ data: Patient[] }>(`/api/diagnostics/intake/search-patient?q=${encodeURIComponent(query)}`)
        .then((res) => {
          if (!cancelled) setSearchResults(res.data || []);
        })
        .catch(() => {
          if (!cancelled) setSearchResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearchLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  useEffect(() => {
    if (!showCreate) return;
    const probe = newPatient.dpi || newPatient.phone || newPatient.email || `${newPatient.firstName} ${newPatient.lastName}`.trim();
    if (!probe || probe.length < 2) {
      setDuplicateCandidates([]);
      return;
    }
    let cancelled = false;
    const timeout = setTimeout(() => {
      fetchJson<{ data: Patient[] }>(`/api/diagnostics/intake/search-patient?q=${encodeURIComponent(probe)}`)
        .then((res) => {
          if (!cancelled) setDuplicateCandidates(res.data || []);
        })
        .catch(() => {
          if (!cancelled) setDuplicateCandidates([]);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [showCreate, newPatient]);

  const catalogLab = catalog.filter((c) => c.kind === "LAB");
  const catalogXR = catalog.filter((c) => c.kind === "IMAGING" && c.modality === "XR");
  const catalogUS = catalog.filter((c) => c.kind === "IMAGING" && c.modality === "US");

  const itemsForTab = catalogTab === "LAB" ? catalogLab : catalogTab === "XR" ? catalogXR : catalogUS;

  const handleCreatePatient = async () => {
    setCreateError(null);
    setCreateWarnings([]);
    try {
      const res = await fetchJson<{ data: Patient; warnings?: Patient[] }>("/api/diagnostics/intake/create-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: newPatient.firstName,
          lastName: newPatient.lastName,
          sex: newPatient.sex || undefined,
          birthDate: newPatient.birthDate || undefined,
          phone: newPatient.phone || undefined,
          email: newPatient.email || undefined,
          address: newPatient.address || undefined,
          dpi: newPatient.dpi || undefined
        })
      });
      setSelectedPatient(res.data);
      setShowCreate(false);
      setQuery("");
      setSearchResults([]);
      if (res.warnings?.length) setCreateWarnings(res.warnings);
    } catch (err: any) {
      setCreateError(err.message || "No se pudo crear el paciente");
    }
  };

  const handleSaveOrder = async () => {
    if (!selectedPatient) return;
    setOrderError(null);
    setSavingOrder(true);
    try {
      const payload = {
        patientId: selectedPatient.id,
        items: selectedItemsList.map((item) => ({
          catalogItemId: item.id,
          kind: item.kind
        })),
        priority,
        orderNotes: orderNotes || undefined,
        vitalSigns,
        receptionNotes: receptionNotes || undefined
      };
      const res = await fetchJson<{ data: { orderId: string } }>("/api/diagnostics/intake/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setCreatedOrderId(res.data.orderId);
    } catch (err: any) {
      setOrderError(err.message || "No se pudo crear la orden");
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Ingreso</p>
            <h2 className="text-2xl font-semibold text-[#163d66] font-[var(--font-dx-heading)]">Admisión administrativa</h2>
            <p className="text-sm text-slate-600">
              Registra paciente, signos vitales iniciales y crea la orden administrativa antes de enviar a ejecución.
            </p>
          </div>
          <Link
            href="/diagnostics/orders"
            className="inline-flex items-center gap-2 rounded-full border border-[#dce7f5] bg-white px-4 py-2 text-sm font-semibold text-[#2e75ba] shadow-sm hover:bg-[#e8f1ff]"
          >
            Ver Órdenes
          </Link>
        </div>
      </section>

      <div className="rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {steps.map((label, idx) => (
            <button
              key={label}
              type="button"
              onClick={() => setStepIndex(idx)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                stepIndex === idx ? "bg-[#2e75ba] text-white" : "bg-[#eef3fb] text-[#2e75ba] hover:bg-[#d8e6fb]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {stepIndex === 0 && (
        <section className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#163d66] font-[var(--font-dx-heading)]">Paciente</h3>
          <p className="mt-1 text-sm text-slate-600">Busca por nombre, DPI, teléfono o correo. Selecciona o crea un paciente.</p>

          <div className="mt-4 grid gap-6 lg:grid-cols-[2fr,1fr]">
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-xl border border-[#dce7f5] bg-[#f8fafc] px-3 py-2">
                <MagnifyingGlassIcon className="h-5 w-5 text-[#2e75ba]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar paciente (nombre, teléfono, DPI, correo)"
                  className="w-full bg-transparent text-sm outline-none"
                />
                {searchLoading && <span className="text-xs text-slate-500">Buscando...</span>}
              </div>

              <div className="rounded-xl border border-[#e5edf8] bg-white">
                {searchResults.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => {
                      setSelectedPatient(patient);
                      setQuery("");
                      setSearchResults([]);
                    }}
                    className="flex w-full items-center justify-between border-b border-[#f1f5f9] px-4 py-3 text-left text-sm hover:bg-[#f8fafc]"
                  >
                    <div>
                      <p className="font-semibold text-[#163d66]">
                        {`${patient.firstName || ""} ${patient.lastName || ""}`.trim() || "Paciente"}
                      </p>
                      <p className="text-xs text-slate-500">{patient.phone || patient.email || patient.dpi || patient.id}</p>
                    </div>
                    <span className="rounded-full bg-[#e8f1ff] px-3 py-1 text-xs font-semibold text-[#2e75ba]">Seleccionar</span>
                  </button>
                ))}
                {!searchResults.length && query && !searchLoading && (
                  <div className="px-4 py-4 text-xs text-slate-500">Sin coincidencias</div>
                )}
              </div>

              {selectedPatient && (
                <div className="rounded-xl border border-[#dce7f5] bg-[#f8fafc] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Seleccionado</p>
                      <p className="text-base font-semibold text-[#163d66]">
                        {`${selectedPatient.firstName || ""} ${selectedPatient.lastName || ""}`.trim() || "Paciente"}
                      </p>
                      <p className="text-xs text-slate-500">{selectedPatient.phone || selectedPatient.email || selectedPatient.dpi || selectedPatient.id}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPatient(null)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cambiar
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#dce7f5] bg-[#f8fafc] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Nuevo paciente</p>
                  <p className="text-sm text-slate-600">Crea un registro rápido si no existe.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreate((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-[#3f8f87]"
                >
                  <UserPlusIcon className="h-4 w-4" />
                  {showCreate ? "Ocultar" : "Crear"}
                </button>
              </div>

              {showCreate && (
                <div className="mt-4 space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={newPatient.firstName}
                      onChange={(e) => setNewPatient((prev) => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Nombre"
                      className="w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-sm"
                    />
                    <input
                      value={newPatient.lastName}
                      onChange={(e) => setNewPatient((prev) => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Apellido"
                      className="w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      value={newPatient.sex}
                      onChange={(e) => setNewPatient((prev) => ({ ...prev, sex: e.target.value }))}
                      className="w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-sm"
                    >
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                    </select>
                    <input
                      value={newPatient.birthDate}
                      onChange={(e) => setNewPatient((prev) => ({ ...prev, birthDate: e.target.value }))}
                      type="date"
                      className="w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={newPatient.phone}
                      onChange={(e) => setNewPatient((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="Teléfono"
                      className="w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-sm"
                    />
                    <input
                      value={newPatient.email}
                      onChange={(e) => setNewPatient((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="Correo"
                      className="w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-sm"
                      type="email"
                    />
                  </div>
                  <input
                    value={newPatient.address}
                    onChange={(e) => setNewPatient((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Dirección (opcional)"
                    className="w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-sm"
                  />
                  <input
                    value={newPatient.dpi}
                    onChange={(e) => setNewPatient((prev) => ({ ...prev, dpi: e.target.value }))}
                    placeholder="DPI (opcional)"
                    className="w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-sm"
                  />

                  {duplicateCandidates.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      <div className="flex items-center gap-2 font-semibold">
                        <ExclamationTriangleIcon className="h-4 w-4" />
                        Posibles duplicados encontrados
                      </div>
                      <ul className="mt-2 space-y-1 text-[11px]">
                        {duplicateCandidates.slice(0, 3).map((candidate) => (
                          <li key={candidate.id}>
                            {candidate.firstName} {candidate.lastName} · {candidate.phone || candidate.email || candidate.dpi}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {createError && <p className="text-xs text-rose-600">{createError}</p>}
                  {createWarnings.length > 0 && (
                    <p className="text-xs text-amber-700">Se detectaron pacientes similares. Verifica antes de continuar.</p>
                  )}

                  <button
                    type="button"
                    onClick={handleCreatePatient}
                    className="w-full rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f8f87]"
                  >
                    Guardar paciente
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {stepIndex === 1 && (
        <section className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#163d66] font-[var(--font-dx-heading)]">Signos vitales (ingreso)</h3>
          <p className="mt-1 text-sm text-slate-600">Captura opcional. Estos datos se guardan en la orden, no en el historial clínico.</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <input
              value={vitalSigns.weight || ""}
              onChange={(e) => setVitalSigns((prev) => ({ ...prev, weight: e.target.value }))}
              placeholder="Peso"
              className="rounded-lg border border-[#dce7f5] px-3 py-2 text-sm"
            />
            <input
              value={vitalSigns.height || ""}
              onChange={(e) => setVitalSigns((prev) => ({ ...prev, height: e.target.value }))}
              placeholder="Estatura"
              className="rounded-lg border border-[#dce7f5] px-3 py-2 text-sm"
            />
            <input
              value={vitalSigns.bloodPressure || ""}
              onChange={(e) => setVitalSigns((prev) => ({ ...prev, bloodPressure: e.target.value }))}
              placeholder="Presión arterial"
              className="rounded-lg border border-[#dce7f5] px-3 py-2 text-sm"
            />
            <input
              value={vitalSigns.temperature || ""}
              onChange={(e) => setVitalSigns((prev) => ({ ...prev, temperature: e.target.value }))}
              placeholder="Temperatura"
              className="rounded-lg border border-[#dce7f5] px-3 py-2 text-sm"
            />
            <input
              value={vitalSigns.heartRate || ""}
              onChange={(e) => setVitalSigns((prev) => ({ ...prev, heartRate: e.target.value }))}
              placeholder="Frecuencia cardíaca"
              className="rounded-lg border border-[#dce7f5] px-3 py-2 text-sm"
            />
            <input
              value={vitalSigns.oxygenSaturation || ""}
              onChange={(e) => setVitalSigns((prev) => ({ ...prev, oxygenSaturation: e.target.value }))}
              placeholder="Saturación O2"
              className="rounded-lg border border-[#dce7f5] px-3 py-2 text-sm"
            />
          </div>

          <textarea
            value={receptionNotes}
            onChange={(e) => setReceptionNotes(e.target.value)}
            placeholder="Notas de enfermeria / ingreso"
            className="mt-4 w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-sm"
            rows={4}
          />
        </section>
      )}

      {stepIndex === 2 && (
        <section className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#163d66] font-[var(--font-dx-heading)]">Orden clínica</h3>
          <p className="mt-1 text-sm text-slate-600">Selecciona pruebas o estudios y define la prioridad administrativa.</p>

          <div className="mt-4 grid gap-6 lg:grid-cols-[2fr,1fr]">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {([
                  { id: "LAB", label: "LAB" },
                  { id: "XR", label: "Rayos X" },
                  { id: "US", label: "Ultrasonidos" }
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCatalogTab(tab.id)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold ${
                      catalogTab === tab.id ? "bg-[#2e75ba] text-white" : "bg-[#eef3fb] text-[#2e75ba] hover:bg-[#d8e6fb]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-[#e5edf8] bg-white">
                {itemsForTab.map((item) => (
                  <label key={item.id} className="flex items-center justify-between border-b border-[#f1f5f9] px-4 py-3 text-sm">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => {
                          setSelectedItems((prev) => {
                            const next = new Set(prev);
                            if (next.has(item.id)) next.delete(item.id);
                            else next.add(item.id);
                            return next;
                          });
                        }}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-semibold text-[#163d66]">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.code} · {item.kind}</p>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-[#2e75ba]">Q {item.price?.toFixed(2) || "0.00"}</div>
                  </label>
                ))}
                {!itemsForTab.length && (
                  <div className="px-4 py-4 text-xs text-slate-500">No hay items para esta categoría.</div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-[#dce7f5] bg-[#f8fafc] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Resumen</p>
                <p className="mt-2 text-sm text-slate-600">Items seleccionados: {selectedItems.size}</p>
                <p className="text-lg font-semibold text-[#163d66]">Total estimado: Q {totalEstimate.toFixed(2)}</p>
              </div>

              <div className="rounded-xl border border-[#dce7f5] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Prioridad</p>
                <div className="mt-3 flex flex-col gap-2 text-sm">
                  {["ROUTINE", "URGENT", "STAT"].map((level) => (
                    <label key={level} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="priority"
                        value={level}
                        checked={priority === level}
                        onChange={() => setPriority(level as "ROUTINE" | "URGENT" | "STAT")}
                      />
                      <span className={level === "STAT" ? "text-rose-600 font-semibold" : "text-slate-700"}>
                        {level === "ROUTINE" ? "Rutina" : level === "URGENT" ? "Urgente" : "STAT"}
                      </span>
                    </label>
                  ))}
                </div>
                {priority === "STAT" && (
                  <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
                    Atención: prioridad STAT requiere atención inmediata.
                  </div>
                )}
              </div>

              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Notas clínicas / administrativas"
                className="w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-sm"
                rows={4}
              />
            </div>
          </div>
        </section>
      )}

      {stepIndex === 3 && (
        <section className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[#163d66] font-[var(--font-dx-heading)]">Resumen</h3>
              <p className="mt-1 text-sm text-slate-600">Confirma la información antes de guardar el borrador.</p>
            </div>
            {createdOrderId && (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <CheckCircleIcon className="h-4 w-4" />
                Orden creada
              </span>
            )}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-[#e5edf8] bg-[#f8fafc] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Paciente</p>
              <p className="mt-2 text-base font-semibold text-[#163d66]">
                {selectedPatient ? `${selectedPatient.firstName || ""} ${selectedPatient.lastName || ""}`.trim() : "—"}
              </p>
              <p className="text-xs text-slate-500">{selectedPatient?.phone || selectedPatient?.email || selectedPatient?.dpi || ""}</p>
            </div>

            <div className="rounded-xl border border-[#e5edf8] bg-[#f8fafc] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Signos vitales</p>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                {Object.entries(vitalSigns).map(([key, value]) =>
                  value ? (
                    <div key={key}>
                      {key}: {value}
                    </div>
                  ) : null
                )}
                {!Object.values(vitalSigns).some(Boolean) && <div>Sin registro</div>}
              </div>
              {receptionNotes && <p className="mt-2 text-xs text-slate-500">Notas: {receptionNotes}</p>}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-[#e5edf8] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Items seleccionados</p>
            <div className="mt-3 space-y-2 text-sm">
              {selectedItemsList.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <span>{item.name}</span>
                  <span className="font-semibold text-[#2e75ba]">Q {item.price?.toFixed(2) || "0.00"}</span>
                </div>
              ))}
              {!selectedItemsList.length && <p className="text-xs text-slate-500">Sin items</p>}
            </div>
            <div className="mt-3 border-t border-[#e5edf8] pt-3 text-sm font-semibold text-[#163d66]">
              Total estimado: Q {totalEstimate.toFixed(2)}
            </div>
            {orderNotes && <p className="mt-2 text-xs text-slate-500">Notas: {orderNotes}</p>}
          </div>

          {orderError && <p className="mt-4 text-sm text-rose-600">{orderError}</p>}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={savingOrder || Boolean(createdOrderId)}
              onClick={handleSaveOrder}
              className="inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f8f87] disabled:opacity-60"
            >
              Guardar como borrador
            </button>
            <Link
              href={createdOrderId ? `/diagnostics/orders?highlight=${createdOrderId}` : "/diagnostics/orders"}
              className="inline-flex items-center gap-2 rounded-full border border-[#dce7f5] bg-white px-5 py-2 text-sm font-semibold text-[#2e75ba] shadow-sm hover:bg-[#e8f1ff]"
            >
              Ir a Órdenes
            </Link>
          </div>
        </section>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStepIndex((prev) => Math.max(prev - 1, 0))}
          disabled={stepIndex === 0}
          className="inline-flex items-center gap-2 rounded-full border border-[#dce7f5] bg-white px-4 py-2 text-sm font-semibold text-[#2e75ba] shadow-sm hover:bg-[#e8f1ff] disabled:opacity-50"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Atrás
        </button>
        <button
          type="button"
          onClick={() => setStepIndex((prev) => Math.min(prev + 1, steps.length - 1))}
          disabled={!canGoNext || stepIndex === steps.length - 1}
          className="inline-flex items-center gap-2 rounded-full bg-[#2e75ba] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#245f95] disabled:opacity-60"
        >
          Continuar
          <ArrowRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
