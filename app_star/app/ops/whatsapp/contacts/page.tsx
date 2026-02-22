'use client';

import { useEffect, useState } from "react";
import { useWhatsApp } from "../_components/WhatsAppProvider";
import type { Contact } from "../types";
import { fetchContactsFromErp, mapErpContactToWhatsAppContact } from "@/service/contactsGateway";

export default function OpsWhatsAppContactsPage() {
  const { contacts: whatsappContacts } = useWhatsApp();
  const [rows, setRows] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const erpContacts = await fetchContactsFromErp();
        const mapped = erpContacts.map(mapErpContactToWhatsAppContact);
        if (!active) return;
        const merged: Record<string, Contact> = {};
        [...whatsappContacts, ...mapped].forEach((contact) => {
          merged[contact.id] = contact;
        });
        setRows(Object.values(merged));
      } catch (error) {
        console.warn("contactsGateway mock error", error);
        if (active) setRows(whatsappContacts);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [whatsappContacts]);

  const updateNotes = (id: string, value: string) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, notes: value } : row)));
  };

  const addLabel = (id: string, label: string) => {
    const normalized = label.trim();
    if (!normalized) return;
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? row.labels.includes(normalized)
            ? row
            : { ...row, labels: [...row.labels, normalized] }
          : row
      )
    );
  };

  const removeLabel = (id: string, label: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, labels: row.labels.filter((item) => item !== label) } : row
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
        <p className="text-sm font-semibold text-[#2e75ba]">Contactos (solo lectura ERP + etiquetas locales)</p>
        <p className="text-xs text-slate-500">
          No se editan datos sensibles aquí. Puedes agregar etiquetas y notas locales mientras llega la integración real.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-[1.2fr_0.8fr_1fr_1fr] gap-3 bg-[#F8FAFC] px-4 py-2 text-xs font-semibold text-slate-600">
          <span>Nombre</span>
          <span>Tipo / Consentimiento</span>
          <span>Etiquetas (locales)</span>
          <span>Notas internas</span>
        </div>
        <div className="divide-y divide-slate-100">
          {loading
            ? Array.from({ length: 4 }).map((_, idx) => (
                <div key={`contact-skeleton-${idx}`} className="px-4 py-3 grid grid-cols-[1.2fr_0.8fr_1fr_1fr] gap-3">
                  <div className="h-4 bg-slate-100 rounded-full animate-pulse" />
                  <div className="h-4 bg-slate-100 rounded-full animate-pulse" />
                  <div className="h-4 bg-slate-100 rounded-full animate-pulse" />
                  <div className="h-4 bg-slate-100 rounded-full animate-pulse" />
                </div>
              ))
            : rows.map((contact) => (
                <div
                  key={contact.id}
                  className="px-4 py-3 grid grid-cols-[1.2fr_0.8fr_1fr_1fr] gap-3 items-start"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">{contact.name}</p>
                    <p className="text-xs text-slate-500">{contact.phone}</p>
                    <p className="text-xs text-slate-500">{contact.companyName ?? "Sin empresa"}</p>
                  </div>
                  <div className="space-y-1 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2 py-0.5 font-semibold text-slate-700">
                      {contact.type === "paciente" ? "Paciente" : contact.type === "empresa" ? "Empresa" : "Lead"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${
                        contact.consent === "granted"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : contact.consent === "pending"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {contact.consent === "granted"
                        ? "Consentimiento otorgado"
                        : contact.consent === "pending"
                          ? "Consentimiento pendiente"
                          : "Consentimiento denegado"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {contact.labels.map((label) => (
                        <span
                          key={`${contact.id}-${label}`}
                          className="inline-flex items-center gap-2 rounded-full bg-[#F8FAFC] border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700"
                        >
                          {label}
                          <button
                            type="button"
                            onClick={() => removeLabel(contact.id, label)}
                            className="h-5 w-5 inline-flex items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-white"
                            aria-label={`Quitar ${label}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {contact.labels.length === 0 && <span className="text-xs text-slate-500">Sin etiquetas</span>}
                    </div>
                    <input
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addLabel(contact.id, event.currentTarget.value);
                          event.currentTarget.value = "";
                        }
                      }}
                      placeholder="Agregar etiqueta (Enter)"
                      className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
                    />
                  </div>
                  <div>
                    <textarea
                      value={contact.notes ?? ""}
                      onChange={(event) => updateNotes(contact.id, event.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
                      placeholder="Notas locales (no se sincronizan con ERP)."
                    />
                  </div>
                </div>
              ))}

          {!loading && rows.length === 0 && (
            <div className="px-4 py-6 text-sm text-slate-500">No hay contactos cargados.</div>
          )}
        </div>
      </div>
    </div>
  );
}
