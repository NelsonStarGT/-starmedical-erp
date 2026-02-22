"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, MapPin, PlusCircle, Shield } from "lucide-react";
import { actionCreateInsurerClient } from "@/app/admin/clientes/actions";
import PhoneInput from "@/components/ui/PhoneInput";
import { cn } from "@/lib/utils";

type FormState = {
  name: string;
  nit: string;
  address: string;
  city: string;
  department: string;
  country: string;
  phone: string;
  phoneCountryIso2: string;
  email: string;
};

export default function InsurerCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    name: "",
    nit: "",
    address: "",
    city: "",
    department: "",
    country: "Guatemala",
    phone: "",
    phoneCountryIso2: "",
    email: ""
  });

  const canSubmit = useMemo(() => Boolean(form.name.trim()), [form.name]);

  const submit = () => {
    if (!canSubmit) return;
    startTransition(async () => {
      try {
        const result = await actionCreateInsurerClient({
          name: form.name,
          nit: form.nit,
          address: form.address,
          city: form.city,
          department: form.department,
          country: form.country,
          phone: form.phone,
          phoneCountryIso2: form.phoneCountryIso2 || undefined,
          email: form.email
        });
        router.push(`/admin/clientes/${result.id}`);
      } catch (err) {
        setError((err as Error)?.message || "No se pudo crear la aseguradora.");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#2e75ba]">Crear cliente</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
          Aseguradora
        </h2>
        <p className="text-sm text-slate-600">
          Tipo independiente. Crear rápido con datos mínimos y completa convenios, contactos y docs en el perfil.
        </p>
      </div>

      <section className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm space-y-5">
        <div className="rounded-xl border border-[#4aadf5]/40 bg-[#4aadf5]/10 px-4 py-3 text-sm text-slate-700">
          <p className="font-semibold text-[#2e75ba]">Crear rápido, completar después.</p>
          <p className="mt-1">
            Convenios, contactos y documentos se gestionan desde el perfil. Catálogos globales disponibles en{" "}
            <Link href="/admin/clientes/configuracion" className="font-semibold text-[#2e75ba] hover:text-[#4aadf5]">
              Configuración de Clientes
            </Link>
            .
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="relative md:col-span-2">
            <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Nombre de aseguradora *"
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
            />
          </div>

          <input
            value={form.nit}
            onChange={(e) => setForm((prev) => ({ ...prev, nit: e.target.value }))}
            placeholder="NIT (opcional)"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
          />

          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Email (opcional)"
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
            />
          </div>

          <PhoneInput
            value={form.phone}
            preferredCountryText={form.country}
            label="Teléfono (opcional)"
            onChange={(phone, meta) =>
              setForm((prev) => ({
                ...prev,
                phone,
                phoneCountryIso2: meta.selectedIso2 ?? prev.phoneCountryIso2
              }))
            }
          />

          <div className="md:col-span-2">
            <p className="mb-2 text-xs font-semibold text-slate-500 flex items-center gap-2">
              <MapPin size={14} className="text-diagnostics-secondary" />
              Dirección y ubicación (opcional)
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Dirección"
                className="md:col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
              />
              <input
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                placeholder="Ciudad"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
              />
              <input
                value={form.department}
                onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
                placeholder="Departamento"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
              />
              <input
                value={form.country}
                onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                placeholder="País"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit || isPending}
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#4aa59c] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4aadf5]",
            (!canSubmit || isPending) && "cursor-not-allowed opacity-60 hover:bg-[#4aa59c]"
          )}
        >
          <PlusCircle size={16} />
          Crear aseguradora
        </button>

        {error && <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      </section>
    </div>
  );
}
