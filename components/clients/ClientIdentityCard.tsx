import { cn } from "@/lib/utils";

function normalize(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export default function ClientIdentityCard({
  displayName,
  firstName,
  middleName,
  lastName,
  secondLastName,
  dpi,
  nit,
  email,
  phone,
  className
}: {
  displayName?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  secondLastName?: string | null;
  dpi?: string | null;
  nit?: string | null;
  email?: string | null;
  phone?: string | null;
  className?: string;
}) {
  const nombres = normalize([normalize(firstName), normalize(middleName)].filter(Boolean).join(" ")) ?? normalize(displayName);
  const apellidos = normalize([normalize(lastName), normalize(secondLastName)].filter(Boolean).join(" "));
  const normalizedDpi = normalize(dpi);
  const normalizedNit = normalize(nit);
  const normalizedEmail = normalize(email);
  const normalizedPhone = normalize(phone);

  const rows = [
    { label: "Nombre", value: nombres },
    { label: "Apellidos", value: apellidos },
    { label: "Identificación (DPI)", value: normalizedDpi },
    { label: "NIT", value: normalizedNit },
    { label: "Correo electrónico", value: normalizedEmail },
    { label: "Teléfono", value: normalizedPhone }
  ].filter((row) => Boolean(row.value));

  return (
    <div className={cn("rounded-xl border border-[#dce7f5] bg-[#f8fafc] p-4", className)}>
      {rows.length ? (
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className="space-y-1">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{row.label}:</dt>
              <dd className="break-words font-medium text-slate-800">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-slate-600">Sin datos de identidad registrados.</p>
      )}
    </div>
  );
}
