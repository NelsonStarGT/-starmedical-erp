"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { QRCodeCanvas } from "qrcode.react";
import { useIdentityConfig } from "@/hooks/useIdentityConfig";
import { initialsFromIdentity } from "@/lib/identity";

type MembershipPrint = {
  id: string;
  code: string;
  ownerName: string;
  planName: string;
  planType?: string;
  status: string;
  nextRenewAt: string | null;
};

const API_BASE = "/api/memberships";

async function safeFetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await res.text();
    throw new Error(`Non-JSON response (${res.status}) from ${url}: ${text.slice(0, 120)}`);
  }
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || `Error ${res.status} on ${url}`);
  return json;
}

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" }) : "—");

export default function MembresiasImpresionPage() {
  const { identity } = useIdentityConfig();
  const [items, setItems] = useState<MembershipPrint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printId, setPrintId] = useState<string | null>(null);
  const [printedIds, setPrintedIds] = useState<string[]>([]);
  const [reprintIds, setReprintIds] = useState<string[]>([]);
  const identityName = identity?.name || "StarMedical ERP";
  const identityLogoUrl = identity?.logoUrl || "";
  const identityInitials = initialsFromIdentity(identityName);

  useEffect(() => {
    let active = true;
    safeFetchJson(`${API_BASE}/contracts`)
      .then((json) => {
        if (!active) return;
        const mapped = (json.data.items || []).map((c: any) => ({
          id: c.id,
          code: c.code,
          ownerName: c.ownerName,
          planName: c.planName,
          planType: c.planType,
          status: c.status,
          nextRenewAt: c.nextRenewAt
        }));
        setItems(mapped);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message);
        setItems([]);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get("code");
    if (codeParam) {
      const match = items.find((item) => item.code === codeParam);
      if (match) setPrintId(match.id);
    }
  }, [items]);

  const pendingList = useMemo(() => items.filter((i) => !printedIds.includes(i.id)), [items, printedIds]);
  const printedList = useMemo(() => items.filter((i) => printedIds.includes(i.id)), [items, printedIds]);
  const reprintList = useMemo(() => items.filter((i) => reprintIds.includes(i.id)), [items, reprintIds]);

  const selected = items.find((i) => i.id === printId) || pendingList[0] || printedList[0] || reprintList[0];

  const statusLabel = (item: MembershipPrint) => {
    if (reprintIds.includes(item.id)) return "Reimpresión";
    if (printedIds.includes(item.id)) return "Impresa";
    return "Pendiente";
  };

  const handlePrint = (itemId: string, mode: "print" | "reprint") => {
    setPrintId(itemId);
    if (mode === "print") {
      setPrintedIds((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]));
    } else {
      setReprintIds((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]));
      setPrintedIds((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]));
    }
    setTimeout(() => window.print(), 50);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Impresión de carnets</h1>
          <p className="text-sm text-slate-600">Pendientes, impresos y reimpresiones con vista previa lista para imprimir.</p>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => window.print()}
          >
            Imprimir pantalla
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Cargando membresías para impresión…</p>}
      {error && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{error}</p>}

      {!loading && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Cola de impresión</CardTitle>
              <div className="text-xs text-slate-500 mt-1 flex gap-3">
                <span>Pendientes: {pendingList.length}</span>
                <span>Impresos: {printedList.length}</span>
                <span>Reimpresiones: {reprintList.length}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
              <ListSection
                title="Pendientes de impresión"
                emptyMessage="Sin registros pendientes."
                items={pendingList}
                statusLabel={statusLabel}
                onSelect={setPrintId}
                onPrint={(id) => handlePrint(id, "print")}
                onReprint={(id) => handlePrint(id, "reprint")}
              />
              <ListSection
                title="Impresos"
                emptyMessage="Aún no se marcan carnets como impresos."
                items={printedList}
                statusLabel={statusLabel}
                onSelect={setPrintId}
                onPrint={(id) => handlePrint(id, "print")}
                onReprint={(id) => handlePrint(id, "reprint")}
              />
              <ListSection
                title="Reimpresiones"
                emptyMessage="No hay reimpresiones registradas."
                items={reprintList}
                statusLabel={statusLabel}
                onSelect={setPrintId}
                onPrint={(id) => handlePrint(id, "print")}
                onReprint={(id) => handlePrint(id, "reprint")}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vista previa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selected ? (
                <div className="flex flex-col items-center gap-3">
                  <MembershipCard item={selected} brandName={identityName} brandLogoUrl={identityLogoUrl} brandInitials={identityInitials} />
                  <p className="text-xs text-slate-500">Estado de impresión: {statusLabel(selected)}</p>
                  <div className="w-full flex flex-col gap-2">
                    <button
                      className="w-full rounded-xl border border-brand-primary/30 bg-brand-primary/10 px-4 py-2 text-sm font-semibold text-brand-navy hover:bg-brand-primary/15"
                      onClick={() => handlePrint(selected.id, "print")}
                    >
                      Imprimir carnet
                    </button>
                    <button
                      className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => handlePrint(selected.id, "reprint")}
                    >
                      Reimprimir carnet
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Selecciona una membresía para ver la tarjeta.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function ListSection({
  title,
  emptyMessage,
  items,
  statusLabel,
  onSelect,
  onPrint,
  onReprint
}: {
  title: string;
  emptyMessage: string;
  items: MembershipPrint[];
  statusLabel: (item: MembershipPrint) => string;
  onSelect: (id: string) => void;
  onPrint: (id: string) => void;
  onReprint: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <Badge variant="info">{items.length}</Badge>
      </div>
      {items.length === 0 && <p className="text-xs text-slate-500">{emptyMessage}</p>}
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50"
        >
          <div className="cursor-pointer" onClick={() => onSelect(item.id)}>
            <p className="text-sm font-semibold text-slate-900">{item.ownerName}</p>
            <p className="text-xs text-slate-500">
              {item.planName} · {item.planType || "Plan"}
            </p>
            <p className="text-xs text-slate-500">Renueva: {formatDate(item.nextRenewAt)}</p>
            <p className="text-[11px] text-slate-500">Estado de impresión: {statusLabel(item)}</p>
          </div>
          <div className="flex gap-2 text-xs">
            <button
              className="rounded-lg border border-brand-primary/30 bg-brand-primary/10 px-3 py-1 font-semibold text-brand-navy hover:bg-brand-primary/15"
              onClick={() => onPrint(item.id)}
            >
              Imprimir
            </button>
            <button
              className="rounded-lg border border-slate-200 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => onReprint(item.id)}
            >
              Reimprimir
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function MembershipCard({
  item,
  brandName,
  brandLogoUrl,
  brandInitials
}: {
  item: MembershipPrint;
  brandName: string;
  brandLogoUrl?: string | null;
  brandInitials: string;
}) {
  const url = `/m/${item.code}`;
  return (
    <div className="w-[320px] h-[200px] rounded-2xl border border-slate-200 shadow-soft bg-gradient-to-br from-[#4aa59c] via-[#4aadf5] to-[#2e75ba] p-4 text-white print:w-[320px] print:h-[200px]">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          {brandLogoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={brandLogoUrl} alt={brandName} className="h-10 w-10 rounded-lg border border-white/30 bg-white/10 object-contain" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-white/10 border border-white/20 text-white flex items-center justify-center font-semibold shadow-inner">
              {brandInitials}
            </div>
          )}
          <div>
            <p className="text-[11px] uppercase tracking-[0.2rem] opacity-80">{brandName}</p>
            <h3 className="text-lg font-semibold">Membresía</h3>
            <p className="text-sm font-semibold mt-1">{item.ownerName}</p>
            <p className="text-xs opacity-80">{item.planName}</p>
          </div>
        </div>
        <QRCodeCanvas value={url} size={72} bgColor="transparent" fgColor="#ffffff" />
      </div>
      <div className="mt-6 text-xs space-y-1">
        <p>
          Código: <span className="font-semibold">{item.code}</span>
        </p>
        <p>
          Estado: <span className="font-semibold">{item.status}</span>
        </p>
        <p>
          Vigencia: <span className="font-semibold">{formatDate(item.nextRenewAt)}</span>
        </p>
        <p>
          URL: <span className="font-semibold">{url}</span>
        </p>
      </div>
      <div className="mt-4 text-[10px] opacity-80">QR incluye perfil, beneficios y entidad (empresa/colegio) con grupo A/AB/ABC.</div>
    </div>
  );
}
