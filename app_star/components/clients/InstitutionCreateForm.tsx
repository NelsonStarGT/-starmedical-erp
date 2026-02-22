"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Landmark, Mail, MapPin, PlusCircle, Tags } from "lucide-react";
import { ClientCatalogType } from "@prisma/client";
import { actionCreateClientCatalogItem, actionCreateInstitutionClient } from "@/app/admin/clientes/actions";
import PhoneInput from "@/components/ui/PhoneInput";
import { cn } from "@/lib/utils";

type InstitutionTypeOption = { id: string; name: string };

type FormState = {
  name: string;
  institutionTypeId: string;
  nit: string;
  address: string;
  city: string;
  department: string;
  country: string;
  phone: string;
  phoneCountryIso2: string;
  email: string;
};

export default function InstitutionCreateForm({ initialTypes }: { initialTypes: InstitutionTypeOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [types, setTypes] = useState<InstitutionTypeOption[]>(() => initialTypes);
  const [newTypeName, setNewTypeName] = useState("");
  const [form, setForm] = useState<FormState>({
    name: "",
    institutionTypeId: initialTypes[0]?.id ?? "",
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
      form.name.trim() &&
        form.institutionTypeId.trim() &&
        form.address.trim() &&
        form.city.trim() &&
        form.department.trim()
    );
  }, [form]);

  const createType = () => {
    const name = newTypeName.trim();
    if (!name) return;
    startTransition(async () => {
      try {
        const result = await actionCreateClientCatalogItem({ type: ClientCatalogType.INSTITUTION_TYPE, name });
        const next = { id: result.id, name };
        setTypes((prev) => [next, ...prev]);
        setForm((prev) => ({ ...prev, institutionTypeId: result.id }));
        setNewTypeName("");
        setError(null);
      } catch (err) {
        setError((err as Error)?.message || "No se pudo crear el tipo.");
      }
    });
  };

  const submit = () => {
    if (!canSubmit) return;
    startTransition(async () => {
      try {
        const result = await actionCreateInstitutionClient({
          name: form.name,
          institutionTypeId: form.institutionTypeId,
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
        setError((err as Error)?.message || "No se pudo crear la institución.");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#2e75ba]">Crear cliente</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
          Institución
        </h2>
        <p className="text-sm text-slate-600">
          Institución ≠ empresa en UX. Crea rápido con datos mínimos y completa el resto en el perfil.
        </p>
      </div>

      <section className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm space-y-5">
        {types.length === 0 && (
          <div className="rounded-xl border border-[#4aadf5]/40 bg-[#4aadf5]/10 px-4 py-3 text-sm text-slate-700">
            <p className="font-semibold text-[#2e75ba]">No hay tipos de institución configurados.</p>
            <p className="mt-1">
              Puedes crear uno rápido abajo o administrarlos en{" "}
              <Link href="/admin/clientes/configuracion" className="font-semibold text-[#2e75ba] hover:text-[#4aadf5]">
                Configuración de Clientes
              </Link>
              .
            </p>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="relative md:col-span-2">
            <Landmark size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Nombre de la institución *"
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 flex items-center gap-2">
              <Tags size={14} className="text-diagnostics-secondary" />
              Tipo de institución *
            </p>
            <select
              value={form.institutionTypeId}
              onChange={(e) => setForm((prev) => ({ ...prev, institutionTypeId: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
            >
              <option value="" disabled>
                {types.length ? "Selecciona un tipo…" : "No hay tipos configurados"}
              </option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <input
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="Agregar tipo (ej. Colegio, ONG)…"
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
              />
              <button
                type="button"
                onClick={createType}
                disabled={!newTypeName.trim() || isPending}
                className={cn(
                  "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]",
                  (!newTypeName.trim() || isPending) && "cursor-not-allowed opacity-60"
                )}
              >
                Crear
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500">NIT (si aplica)</p>
            <input
              value={form.nit}
              onChange={(e) => setForm((prev) => ({ ...prev, nit: e.target.value }))}
              placeholder="NIT"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
            />
          </div>

          <div className="md:col-span-2">
            <p className="mb-2 text-xs font-semibold text-slate-500 flex items-center gap-2">
              <MapPin size={14} className="text-diagnostics-secondary" />
              Dirección y ubicación
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Dirección *"
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
          Crear institución
        </button>

        {error && <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      </section>
    </div>
  );
}
