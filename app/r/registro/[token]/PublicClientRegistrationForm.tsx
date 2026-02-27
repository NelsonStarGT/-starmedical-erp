"use client";

import { FormEvent, useMemo, useState } from "react";
import { ClientProfileType } from "@prisma/client";
import type { PublicRegistrationFormOptions } from "@/lib/reception/clientSelfRegistration";

type InviteShape = {
  id: string;
  tenantId: string;
  clientType: ClientProfileType;
  note: string | null;
  expiresAt: Date;
};

type SubmitResult = {
  id: string;
  provisionalCode: string;
  status: string;
  clientType: ClientProfileType;
  createdAt: string;
  receiptUrl: string;
};

type Props = {
  token: string;
  invite: InviteShape;
  options: PublicRegistrationFormOptions;
};

function Field({
  label,
  children,
  required
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label} {required ? <span className="text-rose-600">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={
        "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20 " +
        (props.className ?? "")
      }
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={
        "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20 " +
        (props.className ?? "")
      }
    />
  );
}

export default function PublicClientRegistrationForm({ token, invite, options }: Props) {
  const [form, setForm] = useState<Record<string, string>>({
    firstName: "",
    lastName: "",
    idValue: "",
    nit: "",
    legalName: "",
    tradeName: "",
    publicName: "",
    contactName: "",
    institutionTypeId: options.institutionTypeOptions[0]?.id ?? "",
    institutionRegimeId: options.institutionRegimeOptions[0]?.id ?? "",
    insurerTypeId: options.insurerTypeOptions[0]?.id ?? "",
    insurerScope: options.insurerScopeOptions[0]?.id ?? "",
    insurerLinePrimaryCode: options.insurerLineOptions[0]?.id ?? "",
    phone: "",
    email: "",
    country: "",
    department: "",
    city: "",
    address: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const typeLabel = useMemo(() => {
    if (invite.clientType === ClientProfileType.PERSON) return "Persona";
    if (invite.clientType === ClientProfileType.COMPANY) return "Empresa";
    if (invite.clientType === ClientProfileType.INSTITUTION) return "Institución";
    return "Aseguradora";
  }, [invite.clientType]);

  const setField = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const buildPayload = () => {
    if (invite.clientType === ClientProfileType.PERSON) {
      return {
        firstName: form.firstName,
        lastName: form.lastName,
        idValue: form.idValue,
        phone: form.phone,
        email: form.email,
        country: form.country,
        department: form.department,
        city: form.city,
        address: form.address
      };
    }

    if (invite.clientType === ClientProfileType.COMPANY) {
      return {
        nit: form.nit,
        legalName: form.legalName,
        tradeName: form.tradeName,
        contactName: form.contactName,
        phone: form.phone,
        email: form.email,
        country: form.country,
        department: form.department,
        city: form.city,
        address: form.address
      };
    }

    if (invite.clientType === ClientProfileType.INSTITUTION) {
      return {
        nit: form.nit,
        legalName: form.legalName,
        publicName: form.publicName,
        institutionTypeId: form.institutionTypeId,
        institutionRegimeId: form.institutionRegimeId,
        phone: form.phone,
        email: form.email,
        country: form.country,
        department: form.department,
        city: form.city,
        address: form.address
      };
    }

    return {
      nit: form.nit,
      legalName: form.legalName,
      tradeName: form.tradeName,
      insurerTypeId: form.insurerTypeId,
      insurerScope: form.insurerScope,
      insurerLinePrimaryCode: form.insurerLinePrimaryCode,
      phone: form.phone,
      email: form.email,
      country: form.country,
      department: form.department,
      city: form.city,
      address: form.address
    };
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/public/client-registration/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token,
          payload: buildPayload()
        })
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.ok) {
        throw new Error(json?.error || "No se pudo completar el registro.");
      }

      setResult(json.data as SubmitResult);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Error al enviar el registro.");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <section className="space-y-4 rounded-xl border border-[#cde7e4] bg-[#eff8f7] p-5">
        <h2 className="text-xl font-semibold text-[#1f6f68]">Registro recibido</h2>
        <p className="text-sm text-slate-700">
          Tu registro ha sido capturado. Correlativo <span className="font-mono font-semibold">{result.provisionalCode}</span>. Pendiente de
          aprobación.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href={result.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f988f]"
          >
            Descargar comprobante (PDF)
          </a>
          <a
            href={result.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-[#4aa59c] bg-white px-4 py-2 text-sm font-semibold text-[#1f6f68] hover:bg-[#f3fffd]"
          >
            Imprimir
          </a>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        Completa este formulario para registrar tu perfil de <span className="font-semibold text-slate-800">{typeLabel}</span>.
      </div>

      {invite.clientType === ClientProfileType.PERSON && (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Nombre" required>
            <Input value={form.firstName} onChange={(event) => setField("firstName", event.target.value)} />
          </Field>
          <Field label="Apellido" required>
            <Input value={form.lastName} onChange={(event) => setField("lastName", event.target.value)} />
          </Field>
          <Field label="Documento identidad" required>
            <Input value={form.idValue} onChange={(event) => setField("idValue", event.target.value)} />
          </Field>
          <Field label="Teléfono" required>
            <Input value={form.phone} onChange={(event) => setField("phone", event.target.value)} />
          </Field>
          <Field label="Correo">
            <Input type="email" value={form.email} onChange={(event) => setField("email", event.target.value)} />
          </Field>
        </div>
      )}

      {invite.clientType === ClientProfileType.COMPANY && (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="NIT" required>
            <Input value={form.nit} onChange={(event) => setField("nit", event.target.value)} />
          </Field>
          <Field label="Razón social" required>
            <Input value={form.legalName} onChange={(event) => setField("legalName", event.target.value)} />
          </Field>
          <Field label="Nombre comercial" required>
            <Input value={form.tradeName} onChange={(event) => setField("tradeName", event.target.value)} />
          </Field>
          <Field label="Persona de contacto">
            <Input value={form.contactName} onChange={(event) => setField("contactName", event.target.value)} />
          </Field>
          <Field label="Teléfono" required>
            <Input value={form.phone} onChange={(event) => setField("phone", event.target.value)} />
          </Field>
          <Field label="Correo">
            <Input type="email" value={form.email} onChange={(event) => setField("email", event.target.value)} />
          </Field>
        </div>
      )}

      {invite.clientType === ClientProfileType.INSTITUTION && (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Nombre legal" required>
            <Input value={form.legalName} onChange={(event) => setField("legalName", event.target.value)} />
          </Field>
          <Field label="Nombre público" required>
            <Input value={form.publicName} onChange={(event) => setField("publicName", event.target.value)} />
          </Field>
          <Field label="NIT">
            <Input value={form.nit} onChange={(event) => setField("nit", event.target.value)} />
          </Field>
          <Field label="Tipo de institución" required>
            <Select value={form.institutionTypeId} onChange={(event) => setField("institutionTypeId", event.target.value)}>
              {options.institutionTypeOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Régimen institucional">
            <Select value={form.institutionRegimeId} onChange={(event) => setField("institutionRegimeId", event.target.value)}>
              {options.institutionRegimeOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Teléfono" required>
            <Input value={form.phone} onChange={(event) => setField("phone", event.target.value)} />
          </Field>
          <Field label="Correo">
            <Input type="email" value={form.email} onChange={(event) => setField("email", event.target.value)} />
          </Field>
        </div>
      )}

      {invite.clientType === ClientProfileType.INSURER && (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="NIT" required>
            <Input value={form.nit} onChange={(event) => setField("nit", event.target.value)} />
          </Field>
          <Field label="Nombre legal" required>
            <Input value={form.legalName} onChange={(event) => setField("legalName", event.target.value)} />
          </Field>
          <Field label="Nombre comercial">
            <Input value={form.tradeName} onChange={(event) => setField("tradeName", event.target.value)} />
          </Field>
          <Field label="Tipo de aseguradora" required>
            <Select value={form.insurerTypeId} onChange={(event) => setField("insurerTypeId", event.target.value)}>
              {options.insurerTypeOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Alcance">
            <Select value={form.insurerScope} onChange={(event) => setField("insurerScope", event.target.value)}>
              {options.insurerScopeOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ramo principal" required>
            <Select value={form.insurerLinePrimaryCode} onChange={(event) => setField("insurerLinePrimaryCode", event.target.value)}>
              {options.insurerLineOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Teléfono" required>
            <Input value={form.phone} onChange={(event) => setField("phone", event.target.value)} />
          </Field>
          <Field label="Correo">
            <Input type="email" value={form.email} onChange={(event) => setField("email", event.target.value)} />
          </Field>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="País" required>
          <Input value={form.country} onChange={(event) => setField("country", event.target.value)} />
        </Field>
        <Field label="Departamento" required>
          <Input value={form.department} onChange={(event) => setField("department", event.target.value)} />
        </Field>
        <Field label="Municipio" required>
          <Input value={form.city} onChange={(event) => setField("city", event.target.value)} />
        </Field>
        <Field label="Dirección" required>
          <Input value={form.address} onChange={(event) => setField("address", event.target.value)} />
        </Field>
      </div>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="h-11 rounded-xl bg-[#4aa59c] px-6 text-sm font-semibold text-white shadow-sm hover:bg-[#3f988f] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Enviando..." : "Enviar registro"}
        </button>
      </div>
    </form>
  );
}
