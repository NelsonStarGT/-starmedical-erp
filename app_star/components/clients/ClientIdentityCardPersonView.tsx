function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function joinNames(...values: Array<string | null | undefined>) {
  const normalized = values.map((value) => clean(value)).filter(Boolean);
  return normalized.length ? normalized.join(" ") : null;
}

export default function ClientIdentityCardPersonView({
  firstName,
  middleName,
  lastName,
  secondLastName,
  dpi,
  nit,
  email,
  phone,
  address,
  city,
  department,
  country
}: {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  secondLastName?: string | null;
  dpi?: string | null;
  nit?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  department?: string | null;
  country?: string | null;
}) {
  const nombre = joinNames(firstName, middleName) ?? "No registrado";
  const apellidos = joinNames(lastName, secondLastName) ?? "No registrado";
  const identificacion = clean(dpi) ?? "No registrado";
  const nitValue = clean(nit) ?? "No registrado";
  const correo = clean(email) ?? "No registrado";
  const telefono = clean(phone) ?? "No registrado";
  const direccion = joinNames(address, city, department, country) ?? "No registrada";

  const rows = [
    { label: "Nombre:", value: nombre },
    { label: "Apellidos:", value: apellidos },
    { label: "Identificación (DPI):", value: identificacion },
    { label: "NIT:", value: nitValue },
    { label: "Correo electrónico:", value: correo },
    { label: "Teléfono:", value: telefono },
    { label: "Dirección:", value: direccion }
  ];

  return (
    <div className="rounded-xl border border-[#dce7f5] bg-[#f8fafc] p-4">
      <dl className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-1 text-sm md:grid-cols-[210px_1fr] md:items-start">
            <dt className="font-semibold text-slate-600">{row.label}</dt>
            <dd className="break-words font-medium text-slate-900">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
