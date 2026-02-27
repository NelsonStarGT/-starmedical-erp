"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, ShieldCheck } from "lucide-react";
import SearchClientBar, { type SearchClientBarItem } from "@/components/recepcion/SearchClientBar";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;

function buildTicketCode() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const random = Math.floor(Math.random() * 900 + 100);
  return `ADM-${date}-${random}`;
}

export default function AdmissionsWizardV1({ canWrite }: { canWrite: boolean }) {
  const [step, setStep] = useState<Step>(1);
  const [selectedClient, setSelectedClient] = useState<SearchClientBarItem | null>(null);
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [insurer, setInsurer] = useState("");
  const [notes, setNotes] = useState("");
  const [ticket, setTicket] = useState<string | null>(null);

  const canAdvanceFromStep1 = Boolean(selectedClient);
  const canAdvanceFromStep2 = Boolean(selectedClient && contactPhone.trim().length > 0);

  const helper = useMemo(() => {
    if (!canWrite) return "Sin permisos de escritura: flujo en modo solo lectura.";
    if (step === 1) return "Paso 1: busca el cliente o créalo desde Clientes.";
    if (step === 2) return "Paso 2: confirma contacto, aseguradora y notas de recepción.";
    return "Paso 3: admisión confirmada (ticket UI).";
  }, [canWrite, step]);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Check-in</p>
            <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: '"Montserrat", "Poppins", var(--font-heading)' }}>
              Admisión guiada (3 pasos)
            </h2>
            <p className="text-sm text-slate-600">Sin persistencia en v1. Se genera comprobante visual al finalizar.</p>
          </div>

          <div className="inline-flex rounded-xl border border-slate-200 bg-[#F8FAFC] p-1">
            {[1, 2, 3].map((index) => (
              <span
                key={index}
                className={cn(
                  "rounded-lg px-3 py-1 text-xs font-semibold",
                  step === index ? "bg-[#4aa59c] text-white" : "text-slate-500"
                )}
              >
                Paso {index}
              </span>
            ))}
          </div>
        </div>

        <p className="mt-2 text-xs text-slate-500">{helper}</p>
      </section>

      {step === 1 ? (
        <section className="space-y-3">
          <SearchClientBar
            title="Paso 1 · Buscar cliente"
            description="Selecciona cliente existente para continuar con la admisión."
            navigateOnSelect={false}
            onSelect={(item) => {
              setSelectedClient(item);
              setContactPhone(item.phone || "");
              setContactEmail(item.email || "");
            }}
          />

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {selectedClient ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">Cliente seleccionado: {selectedClient.displayName}</p>
                <p className="text-xs text-slate-600">{selectedClient.typeLabel} · {selectedClient.clientCode || "Sin correlativo"}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Aún no has seleccionado cliente.</p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/admin/clientes/personas/nuevo"
                className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
              >
                Crear persona
              </Link>
              <Link
                href="/admin/clientes/empresas/nuevo"
                className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
              >
                Crear empresa
              </Link>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!canAdvanceFromStep1 || !canWrite}
                className={cn(
                  "inline-flex h-10 items-center rounded-xl bg-[#4aa59c] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#3f988f]",
                  (!canAdvanceFromStep1 || !canWrite) && "cursor-not-allowed opacity-60 hover:bg-[#4aa59c]"
                )}
              >
                Continuar
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-xs font-semibold text-slate-500">
              Teléfono de contacto
              <input
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
                placeholder="Ej. +502 5488-1122"
              />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-500">
              Email
              <input
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
                placeholder="persona@dominio.com"
              />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-500">
              Aseguradora / convenio
              <input
                value={insurer}
                onChange={(event) => setInsurer(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
                placeholder="Particular / nombre aseguradora"
              />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-500 md:col-span-2">
              Notas de recepción
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="min-h-[90px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
                placeholder="Ej. paciente con documentación pendiente"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
            >
              Regresar
            </button>
            <button
              type="button"
              disabled={!canAdvanceFromStep2 || !canWrite}
              onClick={() => {
                setTicket(buildTicketCode());
                setStep(3);
              }}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-xl bg-[#4aa59c] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#3f988f]",
                (!canAdvanceFromStep2 || !canWrite) && "cursor-not-allowed opacity-60 hover:bg-[#4aa59c]"
              )}
            >
              <ClipboardCheck size={15} />
              Confirmar admisión
            </button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="rounded-xl border border-[#dce7f5] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[#4aa59c]">
            <CheckCircle2 size={20} />
            <p className="text-base font-semibold">Admisión creada</p>
          </div>

          <div className="mt-3 rounded-xl border border-slate-200 bg-[#F8FAFC] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Comprobante visual</p>
            <p className="mt-2 text-sm text-slate-700">Ticket: <span className="font-mono font-semibold">{ticket || "ADM-PENDING"}</span></p>
            <p className="text-sm text-slate-700">Cliente: <span className="font-semibold">{selectedClient?.displayName || "N/A"}</span></p>
            <p className="text-sm text-slate-700">Aseguradora: {insurer || "Particular"}</p>
            <p className="text-sm text-slate-700">Contacto: {contactPhone || "N/A"} {contactEmail ? `· ${contactEmail}` : ""}</p>
            <p className="mt-2 text-xs text-slate-500">Este comprobante es UI-only (sin PDF en v1).</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setSelectedClient(null);
                setTicket(null);
                setNotes("");
                setContactPhone("");
                setContactEmail("");
                setInsurer("");
              }}
              className="inline-flex h-10 items-center rounded-xl bg-[#4aa59c] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#3f988f]"
            >
              Nueva admisión
            </button>
            <Link
              href="/admin/recepcion/cola"
              className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
            >
              Ver cola
            </Link>
            <button
              type="button"
              onClick={() => alert("Impresión/PDF se habilitará en v2.")}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
            >
              <ShieldCheck size={14} />
              Imprimir comprobante
            </button>
          </div>
        </section>
      ) : null}

      {!canWrite ? <p className="text-xs text-amber-700">Tu rol no puede confirmar admisiones (solo vista).</p> : null}
    </div>
  );
}
