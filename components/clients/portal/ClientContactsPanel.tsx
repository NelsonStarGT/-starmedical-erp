"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ClientContactRelationType } from "@prisma/client";
import { Link2, Mail, Phone, PlusCircle, User, UserCheck2 } from "lucide-react";
import { actionAddClientContact } from "@/app/admin/clientes/actions";
import ContactLinker from "@/components/clients/ContactLinker";
import type { ClientProfileLookupItem } from "@/components/clients/ClientProfileLookup";
import { cn } from "@/lib/utils";

type ContactRow = {
  id: string;
  name: string;
  relationType: ClientContactRelationType;
  role: string | null;
  email: string | null;
  phone: string | null;
  isEmergencyContact: boolean;
  isPrimary: boolean;
  linkedPersonClientId: string | null;
  linkedPersonLabel: string | null;
};

type ContactMode = "manual" | "linked";

const RELATION_LABELS: Record<ClientContactRelationType, string> = {
  FAMILY: "Familiar",
  WORK: "Trabajo",
  FRIEND: "Amigo",
  OTHER: "Otro"
};

const CONTACT_RELATION_VALUES = {
  FAMILY: "FAMILY",
  WORK: "WORK",
  FRIEND: "FRIEND",
  OTHER: "OTHER"
} as const;

export default function ClientContactsPanel({ clientId, contacts }: { clientId: string; contacts: ContactRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ContactMode>("manual");
  const [linkedPerson, setLinkedPerson] = useState<ClientProfileLookupItem | null>(null);
  const [form, setForm] = useState(() => ({
    name: "",
    relationType: CONTACT_RELATION_VALUES.OTHER as ClientContactRelationType,
    role: "",
    email: "",
    phone: "",
    isEmergencyContact: false,
    isPrimary: false
  }));

  const canSubmit = useMemo(() => {
    if (mode === "linked") return Boolean(linkedPerson?.id);
    return Boolean(form.name.trim());
  }, [form.name, linkedPerson?.id, mode]);

  const submit = () => {
    if (!canSubmit) return;
    startTransition(async () => {
      try {
        await actionAddClientContact({
          clientId,
          name: mode === "manual" ? form.name : undefined,
          relationType: form.relationType,
          role: form.role,
          email: form.email,
          phone: form.phone,
          linkedPersonClientId: mode === "linked" ? linkedPerson?.id : undefined,
          isEmergencyContact: form.isEmergencyContact,
          isPrimary: form.isPrimary
        });
        setForm({
          name: "",
          relationType: CONTACT_RELATION_VALUES.OTHER,
          role: "",
          email: "",
          phone: "",
          isEmergencyContact: false,
          isPrimary: false
        });
        setLinkedPerson(null);
        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo agregar el contacto.");
      }
    });
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Contactos</p>

        {contacts.length ? (
          <div className="mt-4 space-y-2">
            {contacts.map((contact) => (
              <div key={contact.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <User size={16} className="text-diagnostics-secondary" />
                    {contact.name}
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      {RELATION_LABELS[contact.relationType]}
                    </span>
                    {contact.role ? <span className="text-slate-500 font-medium">· {contact.role}</span> : null}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {contact.isEmergencyContact && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                        Emergencia
                      </span>
                    )}
                    {contact.isPrimary && (
                      <span className="rounded-full border border-diagnostics-secondary/30 bg-diagnostics-background px-3 py-1 text-xs font-semibold text-diagnostics-corporate">
                        Principal
                      </span>
                    )}
                  </div>
                </div>

                {contact.linkedPersonClientId && contact.linkedPersonLabel ? (
                  <p className="mt-2 inline-flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                    <Link2 size={13} />
                    Vinculado: {contact.linkedPersonLabel}
                  </p>
                ) : null}

                <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-700">
                  <span className="inline-flex items-center gap-2">
                    <Phone size={14} className="text-slate-400" />
                    {contact.phone ?? "—"}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Mail size={14} className="text-slate-400" />
                    {contact.email ?? "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-slate-200 bg-diagnostics-background px-4 py-3 text-sm text-slate-700">
            No hay contactos guardados todavía.
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Agregar contacto</p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("manual")}
            disabled={isPending}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              mode === "manual"
                ? "border-[#4aa59c] bg-[#4aa59c]/10 text-[#2e75ba]"
                : "border-slate-200 bg-white text-slate-600 hover:border-[#4aadf5] hover:text-[#2e75ba]",
              isPending && "cursor-not-allowed opacity-60"
            )}
          >
            <UserCheck2 size={14} />
            Contacto manual
          </button>
          <button
            type="button"
            onClick={() => setMode("linked")}
            disabled={isPending}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              mode === "linked"
                ? "border-[#4aa59c] bg-[#4aa59c]/10 text-[#2e75ba]"
                : "border-slate-200 bg-white text-slate-600 hover:border-[#4aadf5] hover:text-[#2e75ba]",
              isPending && "cursor-not-allowed opacity-60"
            )}
          >
            <Link2 size={14} />
            Vincular persona existente
          </button>
        </div>

        {mode === "linked" ? (
          <ContactLinker value={linkedPerson} onChange={setLinkedPerson} disabled={isPending} />
        ) : (
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Nombre *"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
          />
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <select
            value={form.relationType}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                relationType: event.target.value as ClientContactRelationType
              }))
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
          >
            <option value={CONTACT_RELATION_VALUES.FAMILY}>Familiar</option>
            <option value={CONTACT_RELATION_VALUES.WORK}>Trabajo</option>
            <option value={CONTACT_RELATION_VALUES.FRIEND}>Amigo</option>
            <option value={CONTACT_RELATION_VALUES.OTHER}>Otro</option>
          </select>

          <input
            value={form.role}
            onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
            placeholder="Rol / parentesco (opcional)"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
          />

          <input
            value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            placeholder="Teléfono (opcional)"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
          />

          <input
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="Correo (opcional)"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
          />

          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.isEmergencyContact}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  isEmergencyContact: event.target.checked
                }))
              }
            />
            Contacto de emergencia
          </label>

          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.isPrimary}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  isPrimary: event.target.checked
                }))
              }
            />
            Marcar como principal
          </label>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit || isPending}
          className={cn(
            "inline-flex items-center gap-2 rounded-full bg-diagnostics-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-diagnostics-primary/90",
            (!canSubmit || isPending) && "cursor-not-allowed opacity-60 hover:bg-diagnostics-primary"
          )}
        >
          <PlusCircle size={16} />
          Agregar contacto
        </button>

        {error && <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      </section>
    </div>
  );
}
