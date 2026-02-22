"use client";

import { ClientProfileType } from "@prisma/client";
import { ClientProfileLookup, type ClientProfileLookupItem } from "@/components/clients/ClientProfileLookup";

export default function ContactLinker({
  value,
  onChange,
  disabled
}: {
  value: ClientProfileLookupItem | null;
  onChange: (item: ClientProfileLookupItem | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <ClientProfileLookup
        label="Vincular persona existente"
        types={[ClientProfileType.PERSON]}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder="Busca por nombre o DPI"
      />
      <p className="text-xs text-slate-500">
        Se guardará la relación con el perfil de persona para trazabilidad y reportería.
      </p>
    </div>
  );
}
