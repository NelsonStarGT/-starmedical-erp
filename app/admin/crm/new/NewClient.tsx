"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import {
  CRM_COMMUNICATION_OPTIONS,
  CRM_PIPELINE_TYPES,
  CRM_SERVICE_OPTIONS,
  formatNextAction
} from "@/lib/crmConfig";
import { toDateTimeLocalValue, toISOStringFromLocal } from "@/lib/date";

type Account = {
  id: string;
  name: string;
  nit?: string | null;
  address?: string | null;
};

type Contact = {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
};

export default function CrmNewDealPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Cargando CRM...</div>}>
      <CrmNewDealPageContent />
    </Suspense>
  );
}

function CrmNewDealPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type") || "b2b";
  const initialType = typeParam.toLowerCase() === "b2c" ? "B2C" : "B2B";
  const roleParam = searchParams.get("role");
  const userRole = (roleParam || "Administrador").trim();
  const isAdmin = userRole.toLowerCase() === "administrador";
  const { toasts, showToast, dismiss } = useToast();
  const baseHeaders = useMemo(() => ({ "x-role": userRole, "Content-Type": "application/json" }), [userRole]);
  const fetchJson = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const res = await fetch(url, { ...options, headers: { ...(options.headers || {}), ...baseHeaders } });
      const json = await res.json();
      if (!res.ok) {
        const error = new Error(json.error || "Error");
        (error as any).status = res.status;
        throw error;
      }
      return json;
    },
    [baseHeaders]
  );
  const normalizeError = useCallback(
    (err: any, fallback: string) => {
      const status = err?.status;
      const message =
        status === 403 ? "Acción solo para administrador." : status && status >= 500 ? "Error inesperado. Reintenta." : err?.message || fallback;
      showToast(message, "error");
      return message;
    },
    [showToast]
  );

  const [step, setStep] = useState(1);
  const [pipelineType, setPipelineType] = useState<"B2B" | "B2C">(initialType);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [accountContacts, setAccountContacts] = useState<Contact[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const [newAccountForm, setNewAccountForm] = useState({
    name: "",
    nit: "",
    address: "",
    contactName: "",
    email: "",
    phone: ""
  });
  const [newContactForm, setNewContactForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: ""
  });
  const [patientPhones, setPatientPhones] = useState([{ country: "+502", number: "" }]);

  const [dealForm, setDealForm] = useState({
    ownerId: "ventas",
    capturedById: "ventas",
    capturedAt: toDateTimeLocalValue(new Date()),
    nextActionType: "CALL",
    nextActionAt: toDateTimeLocalValue(new Date(Date.now() + 2 * 60 * 60 * 1000)),
    nextActionNotes: "",
    preferredChannel: "CALL",
    preferredAt: "",
    serviceTypes: [] as string[],
    servicesOtherNote: "",
    notes: ""
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setPipelineType(initialType);
  }, [initialType]);

  useEffect(() => {
    setSelectedAccount(null);
    setSelectedContact(null);
    if (pipelineType === "B2C") {
      setDealForm((prev) => ({
        ...prev,
        ownerId: "RECEPCIONISTA",
        capturedById: "QUIEN_LO_ATENDERA",
        capturedAt: toDateTimeLocalValue(new Date())
      }));
    } else {
      setDealForm((prev) => ({
        ...prev,
        ownerId: "ventas",
        capturedById: "ventas"
      }));
    }
  }, [pipelineType]);

  useEffect(() => {
    if (selectedAccount?.id) {
      fetchJson(`/api/crm/contacts?accountId=${selectedAccount.id}`)
        .then((json) => setAccountContacts(json.data || []))
        .catch(() => setAccountContacts([]));
    } else {
      setAccountContacts([]);
    }
  }, [selectedAccount, fetchJson]);

  const handleSearch = useCallback(async () => {
    setSearchLoading(true);
    setSearchError(null);
    try {
      if (pipelineType === "B2B") {
        const json = await fetchJson(`/api/crm/accounts?q=${encodeURIComponent(searchQuery)}`);
        setAccounts(json.data || []);
        setContacts([]);
      } else {
        const json = await fetchJson(`/api/crm/contacts?q=${encodeURIComponent(searchQuery)}`);
        setContacts(json.data || []);
        setAccounts([]);
      }
    } catch (err: any) {
      const message = normalizeError(err, "No se pudo buscar");
      setSearchError(message);
    } finally {
      setSearchLoading(false);
    }
  }, [pipelineType, searchQuery, fetchJson, normalizeError]);

  const addPatientPhone = () => {
    setPatientPhones((prev) => [...prev, { country: "+502", number: "" }]);
  };

  const updatePatientPhone = (idx: number, patch: Partial<{ country: string; number: string }>) => {
    setPatientPhones((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, ...patch, number: patch.number !== undefined ? patch.number : p.number } : p))
    );
  };

  const removePatientPhone = (idx: number) => {
    setPatientPhones((prev) => prev.filter((_, i) => i !== idx));
  };

  const serviceOptions = useMemo(() => {
    return pipelineType === "B2B" ? CRM_SERVICE_OPTIONS.B2B : CRM_SERVICE_OPTIONS.B2C;
  }, [pipelineType]);

  const canContinueFromStep2 = useMemo(() => {
    if (pipelineType === "B2B") {
      const hasNew = newAccountForm.name.trim() && newAccountForm.contactName.trim();
      return (!!selectedAccount && !!selectedContact) || !!hasNew || (!!selectedAccount && newAccountForm.contactName.trim());
    }
    const hasNew = newContactForm.firstName.trim();
    return !!selectedContact || !!hasNew;
  }, [pipelineType, selectedAccount, selectedContact, newAccountForm, newContactForm]);

  const handleCreateDeal = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      let accountId = selectedAccount?.id || null;
      let contactId = selectedContact?.id || null;

      if (pipelineType === "B2B" && !accountId) {
        if (!newAccountForm.name.trim()) throw new Error("Nombre de empresa requerido");
        const accountRes = await fetchJson("/api/crm/accounts", {
          method: "POST",
          body: JSON.stringify({
            name: newAccountForm.name,
            nit: newAccountForm.nit || null,
            address: newAccountForm.address || null,
            email: newAccountForm.email || null,
            phone: newAccountForm.phone || null
          })
        });
        accountId = accountRes.data?.id || null;
      }

      if (!contactId) {
        const [firstName, ...rest] =
          pipelineType === "B2B" ? newAccountForm.contactName.trim().split(" ") : newContactForm.firstName.trim().split(" ");
        const lastName = pipelineType === "B2B" ? rest.join(" ").trim() : newContactForm.lastName.trim();
        const first = pipelineType === "B2B" ? firstName : newContactForm.firstName.trim();
        if (!first) throw new Error("Nombre de contacto requerido");
        const phoneEntries = patientPhones
          .map((p) => ({ country: p.country || "+502", number: (p.number || "").trim() }))
          .filter((p) => p.number.length > 0);
        const phoneB2c = phoneEntries[0] ? `${phoneEntries[0].country} ${phoneEntries[0].number}`.trim() : null;
        const contactPayload: any = {
          firstName: first,
          lastName: lastName || null,
          email: pipelineType === "B2B" ? newAccountForm.email || null : newContactForm.email || null,
          phone: pipelineType === "B2B" ? newAccountForm.phone || null : phoneB2c || null,
          phones: pipelineType === "B2B" ? undefined : phoneEntries,
          type: pipelineType === "B2B" ? "COMPANY_CONTACT" : "PATIENT"
        };
        if (pipelineType === "B2B" && accountId) contactPayload.accountId = accountId;
        const contactRes = await fetchJson("/api/crm/contacts", {
          method: "POST",
          body: JSON.stringify(contactPayload)
        });
        contactId = contactRes.data?.id || null;
      }

      const nextActionAt = toISOStringFromLocal(dealForm.nextActionAt);
      if (!nextActionAt) throw new Error("Selecciona fecha y hora de proxima accion");
      const nextAction = formatNextAction(dealForm.nextActionType, dealForm.nextActionNotes);
      const preferredAt = dealForm.preferredAt ? toISOStringFromLocal(dealForm.preferredAt) : null;
      if (["CALL", "VISIT", "VIDEO"].includes(dealForm.preferredChannel) && !preferredAt)
        throw new Error("Fecha y hora preferida requerida para este canal");
      if (dealForm.serviceTypes.length === 0) throw new Error("Selecciona al menos un servicio");
      if (dealForm.serviceTypes.includes("OTROS") && !dealForm.servicesOtherNote.trim())
        throw new Error("Describe el interes del cliente para Otros");

      const payload: any = {
        pipelineType,
        stage: pipelineType === "B2C" ? "COTIZACION" : "NUEVO",
        accountId,
        contactId,
        ownerId: pipelineType === "B2C" ? "RECEPCIONISTA" : dealForm.ownerId || "ventas",
        capturedById: pipelineType === "B2C" ? "QUIEN_LO_ATENDERA" : dealForm.capturedById || "ventas",
        capturedAt: dealForm.capturedAt ? toISOStringFromLocal(dealForm.capturedAt) : undefined,
        nextAction,
        nextActionAt,
        preferredChannel: dealForm.preferredChannel,
        preferredAt: preferredAt,
        servicesOtherNote: dealForm.servicesOtherNote || null,
        notes: dealForm.notes || ""
      };
      if (dealForm.serviceTypes.length) payload.serviceTypes = dealForm.serviceTypes;

      const dealRes = await fetchJson("/api/crm/deals", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      const dealId = dealRes.data.id;
      router.push(`/admin/crm/deal/${dealId}?type=${pipelineType.toLowerCase()}#cotizaciones`);
    } catch (err: any) {
      const message = normalizeError(err, "No se pudo crear la negociacion");
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3rem] text-slate-400">CRM - Nueva negociacion</p>
        <h1 className="text-2xl font-semibold text-slate-900">
          {pipelineType === "B2C" ? "Wizard Pacientes (B2C)" : "Wizard Empresas (B2B)"}
        </h1>
        <p className="text-sm text-slate-500">Este monto se calcula automáticamente desde cotizaciones aprobadas.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[1, 2, 3].map((value) => (
          <span
            key={value}
            className={cn(
              "rounded-full border px-4 py-2 text-xs font-semibold",
              step === value ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-500"
            )}
          >
            Paso {value}
          </span>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Tipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
              {(["B2B", "B2C"] as const).map((type) => (
                <button
                  key={type}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-semibold transition",
                    pipelineType === type ? "bg-slate-900 text-white shadow-soft" : "text-slate-600 hover:text-slate-900"
                  )}
                  onClick={() => setPipelineType(type)}
                >
                  {type === "B2B" ? CRM_PIPELINE_TYPES.b2b.label : CRM_PIPELINE_TYPES.b2c.label}
                </button>
              ))}
            </div>
            <div>
              <button
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-soft hover:bg-slate-800"
                onClick={() => setStep(2)}
              >
                Continuar
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>{pipelineType === "B2C" ? "Paciente" : "Empresa y contacto"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <input
                className="min-w-[220px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder={pipelineType === "B2B" ? "Buscar por NIT o razon social" : "Buscar por nombre o telefono"}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <button
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={handleSearch}
                disabled={searchLoading || !searchQuery.trim()}
              >
                {searchLoading ? "Buscando..." : "Buscar"}
              </button>
            </div>
            {searchError && <p className="text-sm text-rose-600">{searchError}</p>}

            {pipelineType === "B2B" && (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">Resultados empresas</p>
                  {accounts.length === 0 && <p className="text-xs text-slate-500">Sin resultados.</p>}
                  {accounts.map((account) => (
                    <button
                      key={account.id}
                      className={cn(
                        "w-full rounded-xl border px-3 py-2 text-left text-sm",
                        selectedAccount?.id === account.id ? "border-slate-900 bg-slate-50" : "border-slate-200"
                      )}
                      onClick={() => {
                        setSelectedAccount(account);
                        setSelectedContact(null);
                      }}
                    >
                      <p className="font-semibold text-slate-900">{account.name}</p>
                      <p className="text-xs text-slate-500">{account.nit || "Sin NIT"}</p>
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Contactos</p>
                  {selectedAccount && accountContacts.length === 0 && (
                    <p className="text-xs text-slate-500">Sin contactos registrados.</p>
                  )}
                  {accountContacts.map((contact) => (
                    <button
                      key={contact.id}
                      className={cn(
                        "w-full rounded-xl border px-3 py-2 text-left text-sm",
                        selectedContact?.id === contact.id ? "border-slate-900 bg-slate-50" : "border-slate-200"
                      )}
                      onClick={() => setSelectedContact(contact)}
                    >
                      <p className="font-semibold text-slate-900">
                        {contact.firstName} {contact.lastName || ""}
                      </p>
                      <p className="text-xs text-slate-500">{contact.email || contact.phone || "Sin contacto"}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {pipelineType === "B2C" && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">Resultados pacientes</p>
                {contacts.length === 0 && <p className="text-xs text-slate-500">Sin resultados.</p>}
                {contacts.map((contact) => (
                  <button
                    key={contact.id}
                    className={cn(
                      "w-full rounded-xl border px-3 py-2 text-left text-sm",
                      selectedContact?.id === contact.id ? "border-slate-900 bg-slate-50" : "border-slate-200"
                    )}
                    onClick={() => setSelectedContact(contact)}
                  >
                    <p className="font-semibold text-slate-900">
                      {contact.firstName} {contact.lastName || ""}
                    </p>
                    <p className="text-xs text-slate-500">{contact.email || contact.phone || "Sin contacto"}</p>
                  </button>
                ))}
              </div>
            )}

            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm font-semibold text-slate-700">Crear nuevo</p>
              {pipelineType === "B2B" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Nombre empresa"
                    value={newAccountForm.name}
                    onChange={(event) => setNewAccountForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                  <input
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="NIT"
                    value={newAccountForm.nit}
                    onChange={(event) => setNewAccountForm((prev) => ({ ...prev, nit: event.target.value }))}
                  />
                  <input
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm sm:col-span-2"
                    placeholder="Direccion"
                    value={newAccountForm.address}
                    onChange={(event) => setNewAccountForm((prev) => ({ ...prev, address: event.target.value }))}
                  />
                  <input
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Contacto principal"
                    value={newAccountForm.contactName}
                    onChange={(event) => setNewAccountForm((prev) => ({ ...prev, contactName: event.target.value }))}
                  />
                  <input
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Email"
                    value={newAccountForm.email}
                    onChange={(event) => setNewAccountForm((prev) => ({ ...prev, email: event.target.value }))}
                  />
                  <input
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Telefono"
                    value={newAccountForm.phone}
                    onChange={(event) => setNewAccountForm((prev) => ({ ...prev, phone: event.target.value }))}
                  />
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Nombre"
                    value={newContactForm.firstName}
                    onChange={(event) => setNewContactForm((prev) => ({ ...prev, firstName: event.target.value }))}
                  />
                  <input
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Apellidos"
                    value={newContactForm.lastName}
                    onChange={(event) => setNewContactForm((prev) => ({ ...prev, lastName: event.target.value }))}
                  />
                  <input
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Email"
                    value={newContactForm.email}
                    onChange={(event) => setNewContactForm((prev) => ({ ...prev, email: event.target.value }))}
                  />
                  <div className="sm:col-span-2 space-y-2">
                    <p className="text-xs font-semibold text-slate-600">Telefonos</p>
                    {patientPhones.map((phone, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          className="rounded-xl border border-slate-200 px-2 py-2 text-sm"
                          value={phone.country}
                          onChange={(e) => updatePatientPhone(idx, { country: e.target.value })}
                        >
                          <option value="+502">+502 GT</option>
                          <option value="+503">+503 SV</option>
                          <option value="+504">+504 HN</option>
                          <option value="+1">+1 US/CA</option>
                        </select>
                        <input
                          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          placeholder="Telefono"
                          value={phone.number}
                          onChange={(e) => updatePatientPhone(idx, { number: e.target.value })}
                        />
                        {patientPhones.length > 1 && (
                          <button className="text-xs text-rose-600" onClick={() => removePatientPhone(idx)}>
                            Quitar
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="text-xs font-semibold text-slate-700"
                      onClick={addPatientPhone}
                    >
                      Agregar otro numero
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-4">
              <button
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setStep(1)}
              >
                Volver
              </button>
              <button
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-soft hover:bg-slate-800 disabled:opacity-60"
                onClick={() => setStep(3)}
                disabled={!canContinueFromStep2}
              >
                Continuar
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>{pipelineType === "B2C" ? "Paso 3 · Cotizador médico" : "Paso 3 · Datos del deal"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                {pipelineType === "B2C" ? "Recepcionista" : "Owner"}
                <input
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={dealForm.ownerId}
                  onChange={(event) => setDealForm((prev) => ({ ...prev, ownerId: event.target.value }))}
                  readOnly={pipelineType === "B2C"}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                {pipelineType === "B2C" ? "Quien lo atenderá" : "Captador / Primer contacto"}
                <input
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={dealForm.capturedById}
                  onChange={(event) => setDealForm((prev) => ({ ...prev, capturedById: event.target.value }))}
                />
                {pipelineType === "B2C" && (
                  <p className="mt-1 text-[11px] text-slate-500">Solo administrador puede reasignar después de creado.</p>
                )}
              </label>
              <label className="text-sm font-medium text-slate-700">
                Fecha y hora de captura
                <input
                  type="datetime-local"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                  value={dealForm.capturedAt}
                  readOnly
                />
              </label>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-700">Servicios (selección múltiple)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {serviceOptions.map((service) => {
                  const active = dealForm.serviceTypes.includes(service.value);
                  return (
                    <button
                      key={service.value}
                      type="button"
                      onClick={() =>
                        setDealForm((prev) => ({
                          ...prev,
                          serviceTypes: active
                            ? prev.serviceTypes.filter((value) => value !== service.value)
                            : [...prev.serviceTypes, service.value]
                        }))
                      }
                      className={cn(
                        "rounded-full border px-3 py-2 text-xs font-semibold",
                        active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-700"
                      )}
                    >
                      {service.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {dealForm.serviceTypes.includes("OTROS") && (
              <label className="block text-sm font-medium text-slate-700">
                Describe interés (Otros)
                <input
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Detalla lo que solicitó el cliente"
                  value={dealForm.servicesOtherNote}
                  onChange={(event) => setDealForm((prev) => ({ ...prev, servicesOtherNote: event.target.value }))}
                />
              </label>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Preferencia de comunicación del cliente
                <select
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={dealForm.preferredChannel}
                  onChange={(event) =>
                    setDealForm((prev) => ({
                      ...prev,
                      preferredChannel: event.target.value,
                      nextActionType: event.target.value
                    }))
                  }
                >
                  {CRM_COMMUNICATION_OPTIONS.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Fecha y hora preferida del cliente
                <input
                  type="datetime-local"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={dealForm.preferredAt}
                  onChange={(event) =>
                    setDealForm((prev) => ({
                      ...prev,
                      preferredAt: event.target.value,
                      nextActionAt: event.target.value
                    }))
                  }
                  disabled={!["CALL", "VISIT", "VIDEO"].includes(dealForm.preferredChannel)}
                />
              </label>
            </div>

            <label className="text-sm font-medium text-slate-700">
              Notas de preferencia
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={dealForm.nextActionNotes}
                onChange={(event) => setDealForm((prev) => ({ ...prev, nextActionNotes: event.target.value }))}
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Notas internas
              <textarea
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                rows={3}
                value={dealForm.notes}
                onChange={(event) => setDealForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </label>

            {pipelineType === "B2C" && (
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">Cotización B2C</p>
                <p className="text-xs text-slate-600">
                  El constructor de cotizaciones por inventario se deshabilitó. Guarda el deal y sube el PDF de la cotización directamente desde
                  la vista del deal en la sección de cotizaciones.
                </p>
              </div>
            )}

            {saveError && <p className="text-sm text-rose-600">{saveError}</p>}

            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setStep(2)}
              >
                Volver
              </button>
              <button
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-soft hover:bg-slate-800 disabled:opacity-60"
                onClick={handleCreateDeal}
                disabled={saving}
              >
                Guardar
              </button>
            </div>
          </CardContent>
        </Card>
      )}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
