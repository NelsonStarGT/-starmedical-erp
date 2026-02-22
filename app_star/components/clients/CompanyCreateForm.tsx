"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Mail, MapPin, PlusCircle } from "lucide-react";
import { actionCreateCompanyClient } from "@/app/admin/clientes/actions";
import PhoneInput from "@/components/ui/PhoneInput";
import { cn } from "@/lib/utils";

type FormState = {
  legalName: string;
  tradeName: string;
  nit: string;
  address: string;
  city: string;
  department: string;
  country: string;
  phone: string;
  phoneCountryIso2: string;
  email: string;
};

export default function CompanyCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    legalName: "",
    tradeName: "",
    nit: "",
    address: "",
    city: "",
    department: "",
    country: "Guatemala",
    phone: "",
    phoneCountryIso2: "",
    email: ""
  });

  const canSubmit = useMemo(() => {
    return Boolean(
      form.legalName.trim() &&
        form.tradeName.trim() &&
        form.nit.trim() &&
        form.address.trim() &&
        form.city.trim() &&
        form.department.trim()
    );
  }, [form]);

  const submit = () => {
    if (!canSubmit) return;
    startTransition(async () => {
      try {
        const result = await actionCreateCompanyClient({
          legalName: form.legalName,
          tradeName: form.tradeName,
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
        setError((err as Error)?.message || "No se pudo crear la empresa.");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-diagnostics-corporate">Crear cliente</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
          Empresa
        </h2>
        <p className="text-sm text-slate-600">Crear rápido con datos mínimos. Completa contratos, contactos y docs en el perfil.</p>
      </div>

      <section className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
            <div className="relative">
              <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={form.legalName}
                onChange={(e) => setForm((prev) => ({ ...prev, legalName: e.target.value }))}
                placeholder="Razón social *"
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
              />
            </div>
            <input
              value={form.tradeName}
              onChange={(e) => setForm((prev) => ({ ...prev, tradeName: e.target.value }))}
              placeholder="Nombre comercial *"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
            />
          </div>

          <input
            value={form.nit}
            onChange={(e) => setForm((prev) => ({ ...prev, nit: e.target.value }))}
            placeholder="NIT *"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
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
              Dirección y ubicación
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Dirección de empresa *"
                className="md:col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
              />
              <input
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                placeholder="Ciudad *"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
              />
              <input
                value={form.department}
                onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
                placeholder="Departamento *"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
              />
              <input
                value={form.country}
                onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                placeholder="País (opcional)"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
              />
            </div>
          </div>
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || isPending}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-full bg-diagnostics-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-diagnostics-primary/90",
              (!canSubmit || isPending) && "cursor-not-allowed opacity-60 hover:bg-diagnostics-primary"
            )}
          >
            <PlusCircle size={16} />
            Crear empresa
          </button>
        </div>

        {error && <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      </section>
    </div>
  );
}
