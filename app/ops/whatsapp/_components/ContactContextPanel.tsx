'use client';

import { useMemo, useState } from "react";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  FilePlus,
  NotebookTabs,
  Phone,
  Shield,
  Tag,
  XCircle,
  Clock3
} from "lucide-react";
import TagChip from "./TagChip";
import { useWhatsApp } from "./WhatsAppProvider";
import type { ConsentStatus } from "../types";

const consentStyles: Record<ConsentStatus, { label: string; className: string }> = {
  granted: { label: "Consentimiento otorgado", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pending: { label: "Consentimiento pendiente", className: "bg-amber-50 text-amber-700 border-amber-200" },
  denied: { label: "Consentimiento denegado", className: "bg-rose-50 text-rose-700 border-rose-200" }
};

export default function ContactContextPanel() {
  const {
    selectedConversation,
    isLoading,
    updateContactNotes,
    addContactLabel,
    removeContactLabel
  } = useWhatsApp();
  const [newLabel, setNewLabel] = useState("");

  const badges = useMemo(() => {
    if (!selectedConversation) return [];
    const { contact } = selectedConversation;
    return [
      contact.flags.isVip && "Paciente VIP",
      contact.flags.hasMembership && "Membresía Activa",
      contact.companyName ? `Empresa: ${contact.companyName}` : null,
      contact.type === "empresa" && "Cuenta empresa",
      contact.type === "lead" && "Lead / Prospecto"
    ].filter(Boolean) as string[];
  }, [selectedConversation]);

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="h-5 w-40 rounded-full bg-slate-100 animate-pulse" />
        <div className="h-10 w-full rounded-2xl bg-slate-100 animate-pulse" />
        <div className="h-24 w-full rounded-2xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  if (!selectedConversation) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center h-full min-h-[320px]">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-[#2e75ba]">Selecciona una conversación</p>
          <p className="text-sm text-slate-500">Aquí verás el contexto del contacto seleccionado.</p>
        </div>
      </div>
    );
  }

  const { contact } = selectedConversation;
  const consentStyle = consentStyles[contact.consent];

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col h-full min-h-[320px]">
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-sm font-semibold text-[#2e75ba]">Contacto</p>
        <p className="text-xs text-slate-500">Contexto clínico/administrativo y acciones rápidas.</p>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-full bg-[#4aa59c]/15 text-[#2e75ba] flex items-center justify-center font-semibold">
            {contact.name
              .split(" ")
              .slice(0, 2)
              .map((word) => word[0])
              .join("")}
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-slate-900">{contact.name}</p>
            <p className="text-sm text-slate-600 flex items-center gap-2">
              <Phone className="h-4 w-4 text-[#4aa59c]" />
              {contact.phone}
            </p>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2 py-0.5">
                {contact.type === "paciente" ? "Paciente" : contact.type === "empresa" ? "Empresa" : "Lead"}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${consentStyle.className}`}>
                {consentStyle.label}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {badges.map((badge) => (
            <TagChip key={badge} label={badge} />
          ))}
          {!badges.length && <p className="text-xs text-slate-500">Sin etiquetas especiales.</p>}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Shield className="h-4 w-4 text-[#2e75ba]" />
            Membresía / Seguro
          </div>
          <p className="text-sm text-slate-700">
            {contact.membership ?? "Sin membresía registrada"} · {contact.insurance ?? "Seguro no cargado"}
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock3 className="h-4 w-4" />
            Última actualización mock: 10 mayo 2024
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#4aa59c] px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-[#4aa59c33] hover:scale-[1.01] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c]"
          >
            <CalendarClock className="h-4 w-4" />
            Crear Cita
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl border border-[#2e75ba40] bg-[#F8FAFC] px-3 py-2 text-sm font-semibold text-[#2e75ba] hover:bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c]"
          >
            <NotebookTabs className="h-4 w-4" />
            Abrir Expediente
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl border border-[#2e75ba40] bg-[#F8FAFC] px-3 py-2 text-sm font-semibold text-[#2e75ba] hover:bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c]"
          >
            <FilePlus className="h-4 w-4" />
            Registrar Orden
          </button>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-[#2e75ba]" />
            <p className="text-sm font-semibold text-slate-900">Etiquetas locales</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {contact.labels.map((label) => (
              <span
                key={`${contact.id}-${label}`}
                className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700"
              >
                {label}
                <button
                  type="button"
                  onClick={() => removeContactLabel(contact.id, label)}
                  className="h-5 w-5 inline-flex items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-[#F8FAFC]"
                  aria-label={`Remover etiqueta ${label}`}
                >
                  <XCircle className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            {contact.labels.length === 0 && <p className="text-xs text-slate-500">Sin etiquetas locales.</p>}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addContactLabel(contact.id, newLabel);
                  setNewLabel("");
                }
              }}
              placeholder="Agregar etiqueta (Enter)"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#2e75ba]" />
            <p className="text-sm font-semibold text-slate-900">Notas internas</p>
          </div>
          <textarea
            value={contact.notes ?? ""}
            onChange={(event) => updateContactNotes(contact.id, event.target.value)}
            rows={4}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
            placeholder="Registrar hallazgos clínicos o acuerdos comerciales."
          />
        </div>
      </div>
    </div>
  );
}
