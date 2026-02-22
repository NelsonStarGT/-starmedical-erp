"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const adminHeaders = { "x-role": "Administrador" };

type TabKey = "dashboard" | "operacion" | "bancos" | "catalogos" | "asientos" | "reportes";

type LegalEntity = {
  id: string;
  name: string;
  comercialName?: string | null;
  nit?: string | null;
  isActive: boolean;
};

type Party = {
  id: string;
  name: string;
  type: string;
  nit?: string | null;
  email?: string | null;
  phone?: string | null;
};

type FinanceCategory = {
  id: string;
  name: string;
  flowType: string;
  slug: string;
  subcategories?: FinanceSubcategory[];
};

type FinanceSubcategory = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
};

type FinancialAccount = {
  id: string;
  legalEntityId: string;
  name: string;
  type: string;
  currency: string;
  bankName?: string | null;
  accountNumber?: string | null;
  isActive: boolean;
  balance?: number;
};

type FinancialTransaction = {
  id: string;
  financialAccountId: string;
  amount: number;
  type: string;
  date: string;
  description: string;
  reference?: string | null;
};

type UploadedAttachment = {
  fileUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

type Receivable = {
  id: string;
  partyId: string;
  party?: Party;
  legalEntityId: string;
  date: string;
  dueDate?: string | null;
  creditTerm: string;
  amount: number;
  paidAmount: number;
  status: string;
  reference?: string | null;
};

type Payable = {
  id: string;
  partyId: string;
  party?: Party;
  legalEntityId: string;
  date: string;
  dueDate?: string | null;
  amount: number;
  paidAmount: number;
  status: string;
  reference?: string | null;
};

type DashboardSummary = {
  cashBalance: number;
  receivableOpen: number;
  payableOpen: number;
  draftsCount: number;
  incomeMonth: number;
  expenseMonth: number;
};

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
};

type JournalEntryLine = {
  accountId: string;
  debit: number;
  credit: number;
  memo?: string;
};

type JournalEntry = {
  id: string;
  legalEntityId?: string | null;
  date: string;
  reference?: string | null;
  description?: string | null;
  status: string;
  totalDebit: number;
  totalCredit: number;
  lines?: JournalEntryLine[];
};

const creditTerms = [
  { value: "CASH", label: "Contado" },
  { value: "DAYS_15", label: "15 días" },
  { value: "DAYS_30", label: "30 días" },
  { value: "DAYS_45", label: "45 días" },
  { value: "DAYS_60", label: "60 días" },
  { value: "DAYS_90", label: "90 días" },
  { value: "OTHER", label: "Otro" }
];

const paymentMethods = [
  { value: "CASH", label: "Efectivo" },
  { value: "POS", label: "POS" },
  { value: "TRANSFER", label: "Transferencia" },
  { value: "CHECK", label: "Cheque" },
  { value: "OTHER", label: "Otro" }
];

const accountTypes = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default function FinanzasPage() {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [legalEntities, setLegalEntities] = useState<LegalEntity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<string>("");

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);

  const [entityForm, setEntityForm] = useState({
    name: "",
    comercialName: "",
    nit: "",
    fiscalAddress: "",
    phone: "",
    email: ""
  });
  const [partyForm, setPartyForm] = useState({ type: "CLIENT", name: "", nit: "" });
  const [categoryForm, setCategoryForm] = useState({ flowType: "INCOME", name: "", slug: "" });
  const [subcategoryForm, setSubcategoryForm] = useState({ categoryId: "", name: "", slug: "" });
  const [financialForm, setFinancialForm] = useState({
    name: "",
    type: "CASH",
    bankName: "",
    accountNumber: "",
    currency: "GTQ"
  });
  const [receivableForm, setReceivableForm] = useState({
    partyId: "",
    creditTerm: "CASH",
    date: new Date().toISOString().slice(0, 10),
    dueDate: "",
    amount: 0,
    reference: "",
    categoryId: "",
    subcategoryId: "",
    attachments: [] as UploadedAttachment[]
  });
  const [payableForm, setPayableForm] = useState({
    partyId: "",
    date: new Date().toISOString().slice(0, 10),
    dueDate: "",
    amount: 0,
    reference: "",
    categoryId: "",
    subcategoryId: "",
    attachments: [] as UploadedAttachment[]
  });
  const [paymentForm, setPaymentForm] = useState({
    type: "AR",
    receivableId: "",
    payableId: "",
    financialAccountId: "",
    method: "CASH",
    date: new Date().toISOString().slice(0, 10),
    amount: 0,
    reference: "",
    attachments: [] as UploadedAttachment[]
  });
  const [entryForm, setEntryForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    reference: "",
    description: "",
    lines: [] as JournalEntryLine[]
  });

  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setBusy = (key: string, val: boolean) => setLoading((p) => ({ ...p, [key]: val }));

  const categoryOptions = useMemo(() => {
    const income = categories.filter((c) => c.flowType === "INCOME");
    const expense = categories.filter((c) => c.flowType === "EXPENSE");
    return { income, expense };
  }, [categories]);

  const outstandingReceivables = useMemo(
    () => receivables.filter((r) => ["OPEN", "PARTIAL"].includes(r.status)),
    [receivables]
  );
  const outstandingPayables = useMemo(
    () => payables.filter((p) => ["OPEN", "PARTIAL"].includes(p.status)),
    [payables]
  );

  useEffect(() => {
    loadLegalEntities();
    loadParties();
    loadCategories();
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedEntity && legalEntities[0]) {
      setSelectedEntity(legalEntities[0].id);
      return;
    }
    if (selectedEntity) {
      loadSummary(selectedEntity);
      loadFinancialAccounts(selectedEntity);
      loadReceivables(selectedEntity);
      loadPayables(selectedEntity);
      loadTransactions(selectedEntity);
      loadEntries(selectedEntity);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntity, legalEntities]);

  async function fetchJson(url: string, options: RequestInit = {}) {
    const res = await fetch(url, { ...options, headers: { ...(options.headers || {}), ...adminHeaders } });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error");
    return json;
  }

  async function uploadFile(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/finanzas/attachments", {
      method: "POST",
      headers: adminHeaders as Record<string, string>,
      body: fd
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "No se pudo subir archivo");
    return json.data as UploadedAttachment;
  }

  async function loadLegalEntities() {
    try {
      const json = await fetchJson("/api/finanzas/legal-entities");
      setLegalEntities(json.data || []);
      if (!selectedEntity && json.data?.[0]?.id) setSelectedEntity(json.data[0].id);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadParties() {
    try {
      const json = await fetchJson("/api/finanzas/parties");
      setParties(json.data || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadCategories() {
    try {
      const json = await fetchJson("/api/finanzas/categories");
      setCategories(json.data || []);
      if (json.data?.[0]?.id && !subcategoryForm.categoryId) {
        setSubcategoryForm((prev) => ({ ...prev, categoryId: json.data[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function loadSummary(legalEntityId: string) {
    try {
      const json = await fetchJson(`/api/finanzas/summary?legalEntityId=${legalEntityId}`);
      setSummary(json.data);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadFinancialAccounts(legalEntityId: string) {
    try {
      const json = await fetchJson(`/api/finanzas/financial-accounts?legalEntityId=${legalEntityId}`);
      setFinancialAccounts(json.data || []);
      if (!paymentForm.financialAccountId && json.data?.[0]?.id) {
        setPaymentForm((prev) => ({ ...prev, financialAccountId: json.data[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function loadTransactions(legalEntityId: string) {
    try {
      const json = await fetchJson(`/api/finanzas/transactions?legalEntityId=${legalEntityId}`);
      setTransactions(json.data || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadReceivables(legalEntityId: string) {
    try {
      const json = await fetchJson(`/api/finanzas/receivables?legalEntityId=${legalEntityId}`);
      setReceivables(json.data || []);
      if (json.data?.[0]?.id && !paymentForm.receivableId) {
        setPaymentForm((prev) => ({ ...prev, receivableId: json.data[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function loadPayables(legalEntityId: string) {
    try {
      const json = await fetchJson(`/api/finanzas/payables?legalEntityId=${legalEntityId}`);
      setPayables(json.data || []);
      if (json.data?.[0]?.id && !paymentForm.payableId) {
        setPaymentForm((prev) => ({ ...prev, payableId: json.data[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function loadAccounts() {
    try {
      const json = await fetchJson("/api/finanzas/accounts");
      setAccounts(json.data || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadEntries(legalEntityId: string) {
    try {
      const json = await fetchJson(`/api/finanzas/journal-entries?legalEntityId=${legalEntityId}`);
      setJournalEntries(json.data || []);
    } catch (err) {
      console.error(err);
    }
  }

  function resetMessages() {
    setMessage(null);
    setError(null);
  }

  async function handleSaveLegalEntity() {
    resetMessages();
    setBusy("entity", true);
    try {
      await fetchJson("/api/finanzas/legal-entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entityForm)
      });
      setEntityForm({ name: "", comercialName: "", nit: "", fiscalAddress: "", phone: "", email: "" });
      setMessage("Empresa creada");
      await loadLegalEntities();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy("entity", false);
    }
  }

  async function handleSaveParty() {
    resetMessages();
    setBusy("party", true);
    try {
      await fetchJson("/api/finanzas/parties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partyForm)
      });
      setPartyForm({ type: partyForm.type, name: "", nit: "" });
      setMessage("Tercero creado");
      await loadParties();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy("party", false);
    }
  }

  async function handleSaveCategory() {
    resetMessages();
    setBusy("category", true);
    try {
      const payload = { ...categoryForm, slug: categoryForm.slug || slugify(categoryForm.name) };
      await fetchJson("/api/finanzas/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setCategoryForm({ flowType: categoryForm.flowType, name: "", slug: "" });
      setMessage("Categoría guardada");
      await loadCategories();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy("category", false);
    }
  }

  async function handleSaveSubcategory() {
    resetMessages();
    setBusy("subcategory", true);
    try {
      const payload = { ...subcategoryForm, slug: subcategoryForm.slug || slugify(subcategoryForm.name) };
      await fetchJson("/api/finanzas/subcategories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setSubcategoryForm((prev) => ({ ...prev, name: "", slug: "" }));
      setMessage("Subcategoría guardada");
      await loadCategories();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy("subcategory", false);
    }
  }

  async function handleFinancialAccount() {
    resetMessages();
    setBusy("finAccount", true);
    try {
      const payload = { ...financialForm, legalEntityId: selectedEntity };
      await fetchJson("/api/finanzas/financial-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setFinancialForm((prev) => ({ ...prev, name: "", bankName: "", accountNumber: "" }));
      setMessage("Cuenta financiera guardada");
      await loadFinancialAccounts(selectedEntity);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy("finAccount", false);
    }
  }

  async function handleReceivable() {
    resetMessages();
    setBusy("receivable", true);
    try {
      const payload = { ...receivableForm, legalEntityId: selectedEntity };
      await fetchJson("/api/finanzas/receivables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, amount: Number(payload.amount) })
      });
      setReceivableForm({
        partyId: "",
        creditTerm: receivableForm.creditTerm,
        date: new Date().toISOString().slice(0, 10),
        dueDate: "",
        amount: 0,
        reference: "",
        categoryId: "",
        subcategoryId: "",
        attachments: []
      });
      setMessage("CxC creada");
      await Promise.all([loadReceivables(selectedEntity), loadSummary(selectedEntity)]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy("receivable", false);
    }
  }

  async function handlePayable() {
    resetMessages();
    setBusy("payable", true);
    try {
      const payload = { ...payableForm, legalEntityId: selectedEntity };
      await fetchJson("/api/finanzas/payables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, amount: Number(payload.amount) })
      });
      setPayableForm({
        partyId: "",
        date: new Date().toISOString().slice(0, 10),
        dueDate: "",
        amount: 0,
        reference: "",
        categoryId: "",
        subcategoryId: "",
        attachments: []
      });
      setMessage("CxP creada");
      await Promise.all([loadPayables(selectedEntity), loadSummary(selectedEntity)]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy("payable", false);
    }
  }

  async function handlePayment() {
    resetMessages();
    setBusy("payment", true);
    try {
      const payload = {
        ...paymentForm,
        legalEntityId: selectedEntity,
        amount: Number(paymentForm.amount),
        receivableId: paymentForm.type === "AR" ? paymentForm.receivableId : undefined,
        payableId: paymentForm.type === "AP" ? paymentForm.payableId : undefined
      };
      await fetchJson("/api/finanzas/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setPaymentForm((prev) => ({ ...prev, amount: 0, reference: "", attachments: [] }));
      setMessage("Pago aplicado");
      await Promise.all([
        loadReceivables(selectedEntity),
        loadPayables(selectedEntity),
        loadTransactions(selectedEntity),
        loadFinancialAccounts(selectedEntity),
        loadSummary(selectedEntity)
      ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy("payment", false);
    }
  }

  function addEntryLine() {
    const firstAccount = accounts[0]?.id || "";
    setEntryForm((prev) => ({
      ...prev,
      lines: [...prev.lines, { accountId: firstAccount, debit: 0, credit: 0 }]
    }));
  }

  function updateLine(idx: number, patch: Partial<JournalEntryLine>) {
    setEntryForm((prev) => {
      const next = [...prev.lines];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, lines: next };
    });
  }

  function removeLine(idx: number) {
    setEntryForm((prev) => ({ ...prev, lines: prev.lines.filter((_, i) => i !== idx) }));
  }

  const totalDebit = entryForm.lines.reduce((acc, l) => acc + Number(l.debit || 0), 0);
  const totalCredit = entryForm.lines.reduce((acc, l) => acc + Number(l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && entryForm.lines.length >= 2;

  async function handleSaveEntry() {
    resetMessages();
    setBusy("entry", true);
    try {
      if (!entryForm.lines.length) throw new Error("Agrega líneas");
      const payload = { ...entryForm, legalEntityId: selectedEntity };
      await fetchJson("/api/finanzas/journal-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setEntryForm({
        date: new Date().toISOString().slice(0, 10),
        reference: "",
        description: "",
        lines: []
      });
      setMessage("Asiento guardado");
      await loadEntries(selectedEntity);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy("entry", false);
    }
  }

  async function handlePostEntry(id: string) {
    resetMessages();
    setBusy(`post-${id}`, true);
    try {
      await fetchJson(`/api/finanzas/journal-entries/${id}/post`, { method: "POST" });
      setMessage("Asiento posteado");
      await loadEntries(selectedEntity);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(`post-${id}`, false);
    }
  }

  async function handleReverseEntry(id: string) {
    resetMessages();
    setBusy(`reverse-${id}`, true);
    try {
      await fetchJson(`/api/finanzas/journal-entries/${id}/reverse`, { method: "POST" });
      setMessage("Asiento reversado");
      await loadEntries(selectedEntity);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(`reverse-${id}`, false);
    }
  }

  async function handleAttachmentUpload(files: FileList | null, target: "receivable" | "payable" | "payment") {
    if (!files || files.length === 0) return;
    setBusy(`upload-${target}`, true);
    try {
      const uploads: UploadedAttachment[] = [];
      for (const file of Array.from(files)) {
        const data = await uploadFile(file);
        uploads.push(data);
      }
      if (target === "receivable") {
        setReceivableForm((prev) => ({ ...prev, attachments: [...prev.attachments, ...uploads] }));
      } else if (target === "payable") {
        setPayableForm((prev) => ({ ...prev, attachments: [...prev.attachments, ...uploads] }));
      } else {
        setPaymentForm((prev) => ({ ...prev, attachments: [...prev.attachments, ...uploads] }));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(`upload-${target}`, false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl p-6 lg:p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl border border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3rem] text-slate-300">StarMedical · ERP</p>
            <h1 className="text-3xl font-semibold">Finanzas operativas</h1>
            <p className="text-sm text-slate-200">
              Multi-empresa, CxC/CxP con adjuntos, pagos parciales, bancos y asientos validados.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="rounded-full bg-white text-slate-900 px-4 py-2 text-sm font-semibold shadow-soft"
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
            >
              {legalEntities.map((le) => (
                <option key={le.id} value={le.id}>
                  {le.comercialName || le.name}
                </option>
              ))}
            </select>
            {(["dashboard", "operacion", "bancos", "catalogos", "asientos", "reportes"] as TabKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold border transition backdrop-blur",
                  tab === key
                    ? "bg-white text-slate-900 border-white shadow-soft"
                    : "bg-white/10 text-white border-white/20 hover:bg-white/15"
                )}
              >
                {
                  {
                    dashboard: "Dashboard",
                    operacion: "Operación",
                    bancos: "Bancos/Caja",
                    catalogos: "Catálogos",
                    asientos: "Asientos",
                    reportes: "Reportes"
                  }[key]
                }
              </button>
            ))}
          </div>
        </div>
      </div>

      {(message || error) && (
        <div
          className={cn(
            "rounded-2xl px-4 py-3 border text-sm",
            error ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"
          )}
        >
          {error || message}
        </div>
      )}

      {tab === "dashboard" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>KPIs rápidos</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Kpi label="Saldo bancos/caja" value={summary?.cashBalance ?? 0} prefix="Q" />
              <Kpi label="CxC abiertas" value={summary?.receivableOpen ?? 0} prefix="Q" />
              <Kpi label="CxP abiertas" value={summary?.payableOpen ?? 0} prefix="Q" negative />
              <Kpi label="Asientos borrador" value={summary?.draftsCount ?? 0} />
              <Kpi label="Ingresos (mes)" value={summary?.incomeMonth ?? 0} prefix="Q" />
              <Kpi label="Gastos (mes)" value={summary?.expenseMonth ?? 0} prefix="Q" negative />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Últimos movimientos financieros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {transactions.slice(0, 6).map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{t.description}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(t.date).toLocaleDateString()} · {t.reference || t.type}
                    </p>
                  </div>
                  <span className={cn("text-sm font-semibold", t.type === "IN" ? "text-emerald-600" : "text-rose-600")}>
                    {t.type === "IN" ? "+" : "-"}Q{t.amount.toFixed(2)}
                  </span>
                </div>
              ))}
              {!transactions.length && <p className="text-sm text-slate-500">Sin movimientos.</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "operacion" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Cuentas por cobrar</CardTitle>
              <p className="text-sm text-slate-500">Crédito real con vencimiento y adjuntos.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2">Cliente</th>
                      <th className="px-3 py-2">Monto</th>
                      <th className="px-3 py-2">Pagado</th>
                      <th className="px-3 py-2">Vence</th>
                      <th className="px-3 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receivables.map((r) => (
                      <tr key={r.id}>
                        <td className="px-3 py-2 text-sm text-slate-800">{r.party?.name || r.partyId}</td>
                        <td className="px-3 py-2 text-sm font-semibold">Q{r.amount.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm text-slate-700">Q{r.paidAmount.toFixed(2)}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">
                          {r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600">{r.status}</td>
                      </tr>
                    ))}
                    {!receivables.length && (
                      <tr>
                        <td className="px-3 py-2 text-sm text-slate-500" colSpan={5}>
                          Sin CxC.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={receivableForm.partyId}
                  onChange={(e) => setReceivableForm({ ...receivableForm, partyId: e.target.value })}
                >
                  <option value="">Cliente/aseguradora</option>
                  {parties
                    .filter((p) => ["CLIENT", "INSURER"].includes(p.type))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={receivableForm.creditTerm}
                  onChange={(e) => setReceivableForm({ ...receivableForm, creditTerm: e.target.value })}
                >
                  {creditTerms.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={receivableForm.date}
                  onChange={(e) => setReceivableForm({ ...receivableForm, date: e.target.value })}
                />
                <input
                  type="date"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={receivableForm.dueDate}
                  onChange={(e) => setReceivableForm({ ...receivableForm, dueDate: e.target.value })}
                />
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Monto"
                  value={receivableForm.amount}
                  onChange={(e) => setReceivableForm({ ...receivableForm, amount: Number(e.target.value) })}
                />
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Referencia"
                  value={receivableForm.reference}
                  onChange={(e) => setReceivableForm({ ...receivableForm, reference: e.target.value })}
                />
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={receivableForm.categoryId}
                  onChange={(e) => setReceivableForm({ ...receivableForm, categoryId: e.target.value })}
                >
                  <option value="">Categoría ingreso</option>
                  {categoryOptions.income.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={receivableForm.subcategoryId}
                  onChange={(e) => setReceivableForm({ ...receivableForm, subcategoryId: e.target.value })}
                >
                  <option value="">Subcategoría</option>
                  {categories
                    .filter((c) => c.id === receivableForm.categoryId)
                    .flatMap((c) => c.subcategories || [])
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
                <div className="md:col-span-2 flex flex-wrap items-center gap-2">
                  <label className="text-xs text-slate-500">Adjuntos</label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => handleAttachmentUpload(e.target.files, "receivable")}
                    className="text-xs"
                    multiple
                  />
                  {receivableForm.attachments.length > 0 && (
                    <p className="text-xs text-slate-500">
                      {receivableForm.attachments.length} archivo(s) listo(s)
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleReceivable}
                disabled={loading.receivable}
                className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-70"
              >
                {loading.receivable ? "Guardando..." : "Guardar CxC"}
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cuentas por pagar</CardTitle>
              <p className="text-sm text-slate-500">Proveedores/profesionales con soporte obligatorio.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2">Proveedor</th>
                      <th className="px-3 py-2">Monto</th>
                      <th className="px-3 py-2">Pagado</th>
                      <th className="px-3 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payables.map((p) => (
                      <tr key={p.id}>
                        <td className="px-3 py-2 text-sm text-slate-800">{p.party?.name || p.partyId}</td>
                        <td className="px-3 py-2 text-sm font-semibold">Q{p.amount.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm text-slate-700">Q{p.paidAmount.toFixed(2)}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{p.status}</td>
                      </tr>
                    ))}
                    {!payables.length && (
                      <tr>
                        <td className="px-3 py-2 text-sm text-slate-500" colSpan={4}>
                          Sin CxP.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={payableForm.partyId}
                  onChange={(e) => setPayableForm({ ...payableForm, partyId: e.target.value })}
                >
                  <option value="">Proveedor/profesional</option>
                  {parties
                    .filter((p) => ["PROVIDER", "PROFESSIONAL"].includes(p.type))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
                <input
                  type="date"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={payableForm.date}
                  onChange={(e) => setPayableForm({ ...payableForm, date: e.target.value })}
                />
                <input
                  type="date"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={payableForm.dueDate}
                  onChange={(e) => setPayableForm({ ...payableForm, dueDate: e.target.value })}
                />
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Monto"
                  value={payableForm.amount}
                  onChange={(e) => setPayableForm({ ...payableForm, amount: Number(e.target.value) })}
                />
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Referencia"
                  value={payableForm.reference}
                  onChange={(e) => setPayableForm({ ...payableForm, reference: e.target.value })}
                />
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={payableForm.categoryId}
                  onChange={(e) => setPayableForm({ ...payableForm, categoryId: e.target.value })}
                >
                  <option value="">Categoría gasto</option>
                  {categoryOptions.expense.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={payableForm.subcategoryId}
                  onChange={(e) => setPayableForm({ ...payableForm, subcategoryId: e.target.value })}
                >
                  <option value="">Subcategoría</option>
                  {categories
                    .filter((c) => c.id === payableForm.categoryId)
                    .flatMap((c) => c.subcategories || [])
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
                <div className="md:col-span-2 flex flex-wrap items-center gap-2">
                  <label className="text-xs text-slate-500">Adjuntos (factura/recibo)</label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => handleAttachmentUpload(e.target.files, "payable")}
                    className="text-xs"
                    multiple
                  />
                  {payableForm.attachments.length > 0 && (
                    <p className="text-xs text-slate-500">{payableForm.attachments.length} archivo(s)</p>
                  )}
                </div>
              </div>
              <button
                onClick={handlePayable}
                disabled={loading.payable}
                className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-70"
              >
                {loading.payable ? "Guardando..." : "Guardar CxP"}
              </button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Aplicar pago parcial/total</CardTitle>
              <p className="text-sm text-slate-500">Controla método, cuenta financiera y adjunta comprobante.</p>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Tipo</label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={paymentForm.type}
                  onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value })}
                >
                  <option value="AR">CxC</option>
                  <option value="AP">CxP</option>
                </select>
                {paymentForm.type === "AR" ? (
                  <select
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={paymentForm.receivableId}
                    onChange={(e) => setPaymentForm({ ...paymentForm, receivableId: e.target.value })}
                  >
                    <option value="">Selecciona CxC</option>
                    {outstandingReceivables.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.reference || r.id} · Pendiente Q{(r.amount - r.paidAmount).toFixed(2)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={paymentForm.payableId}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payableId: e.target.value })}
                  >
                    <option value="">Selecciona CxP</option>
                    {outstandingPayables.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.reference || p.id} · Pendiente Q{(p.amount - p.paidAmount).toFixed(2)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Cuenta financiera</label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={paymentForm.financialAccountId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, financialAccountId: e.target.value })}
                >
                  {financialAccounts.map((fa) => (
                    <option key={fa.id} value={fa.id}>
                      {fa.name}
                    </option>
                  ))}
                </select>
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                >
                  {paymentMethods.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <input
                  type="date"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={paymentForm.date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                />
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Monto"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                />
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Referencia"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                />
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    multiple
                    onChange={(e) => handleAttachmentUpload(e.target.files, "payment")}
                  />
                  {paymentForm.attachments.length > 0 && <span>{paymentForm.attachments.length} adjunto(s)</span>}
                </div>
                <button
                  onClick={handlePayment}
                  disabled={loading.payment}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-70"
                >
                  {loading.payment ? "Aplicando..." : "Aplicar pago"}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "bancos" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Cuenta financiera</CardTitle>
              <p className="text-sm text-slate-500">Asigna banco/POS por empresa.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Nombre"
                value={financialForm.name}
                onChange={(e) => setFinancialForm({ ...financialForm, name: e.target.value })}
              />
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={financialForm.type}
                onChange={(e) => setFinancialForm({ ...financialForm, type: e.target.value })}
              >
                <option value="CASH">Caja</option>
                <option value="BANK">Banco</option>
                <option value="POS">POS</option>
              </select>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Banco"
                value={financialForm.bankName}
                onChange={(e) => setFinancialForm({ ...financialForm, bankName: e.target.value })}
              />
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Cuenta"
                value={financialForm.accountNumber}
                onChange={(e) => setFinancialForm({ ...financialForm, accountNumber: e.target.value })}
              />
              <button
                onClick={handleFinancialAccount}
                disabled={loading.finAccount}
                className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-70"
              >
                {loading.finAccount ? "Guardando..." : "Guardar cuenta"}
              </button>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Bancos/Caja</CardTitle>
              <p className="text-sm text-slate-500">Saldo por cuenta, con moneda GTQ.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2">Cuenta</th>
                      <th className="px-3 py-2">Tipo</th>
                      <th className="px-3 py-2">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {financialAccounts.map((fa) => (
                      <tr key={fa.id}>
                        <td className="px-3 py-2 text-sm text-slate-800">{fa.name}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{fa.type}</td>
                        <td className="px-3 py-2 text-sm font-semibold">Q{(fa.balance || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "catalogos" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Empresas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Nombre legal"
                value={entityForm.name}
                onChange={(e) => setEntityForm({ ...entityForm, name: e.target.value })}
              />
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Nombre comercial"
                value={entityForm.comercialName}
                onChange={(e) => setEntityForm({ ...entityForm, comercialName: e.target.value })}
              />
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="NIT"
                value={entityForm.nit}
                onChange={(e) => setEntityForm({ ...entityForm, nit: e.target.value })}
              />
              <button
                onClick={handleSaveLegalEntity}
                disabled={loading.entity}
                className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-70"
              >
                {loading.entity ? "Guardando..." : "Guardar empresa"}
              </button>
              <ul className="text-sm text-slate-600 space-y-1">
                {legalEntities.map((le) => (
                  <li key={le.id}>
                    {le.comercialName || le.name} · {le.nit || "NIT pendiente"}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Terceros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={partyForm.type}
                onChange={(e) => setPartyForm({ ...partyForm, type: e.target.value })}
              >
                <option value="CLIENT">Cliente</option>
                <option value="PROVIDER">Proveedor</option>
                <option value="PROFESSIONAL">Profesional</option>
                <option value="INSURER">Aseguradora</option>
                <option value="OTHER">Otro</option>
              </select>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Nombre"
                value={partyForm.name}
                onChange={(e) => setPartyForm({ ...partyForm, name: e.target.value })}
              />
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="NIT"
                value={partyForm.nit}
                onChange={(e) => setPartyForm({ ...partyForm, nit: e.target.value })}
              />
              <button
                onClick={handleSaveParty}
                disabled={loading.party}
                className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-70"
              >
                {loading.party ? "Guardando..." : "Guardar tercero"}
              </button>
              <div className="max-h-40 overflow-y-auto text-sm text-slate-600 space-y-1">
                {parties.slice(0, 10).map((p) => (
                  <p key={p.id}>
                    {p.name} · {p.type}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Categorías</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={categoryForm.flowType}
                    onChange={(e) => setCategoryForm({ ...categoryForm, flowType: e.target.value })}
                  >
                    <option value="INCOME">Ingreso</option>
                    <option value="EXPENSE">Gasto</option>
                  </select>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Nombre"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  />
                </div>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Slug (opcional)"
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                />
                <button
                  onClick={handleSaveCategory}
                  disabled={loading.category}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-70"
                >
                  {loading.category ? "Guardando..." : "Guardar categoría"}
                </button>
              </div>

              <div className="space-y-2 border-t pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={subcategoryForm.categoryId}
                    onChange={(e) => setSubcategoryForm({ ...subcategoryForm, categoryId: e.target.value })}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Subcategoría"
                    value={subcategoryForm.name}
                    onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name: e.target.value })}
                  />
                </div>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Slug (opcional)"
                  value={subcategoryForm.slug}
                  onChange={(e) => setSubcategoryForm({ ...subcategoryForm, slug: e.target.value })}
                />
                <button
                  onClick={handleSaveSubcategory}
                  disabled={loading.subcategory}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-70"
                >
                  {loading.subcategory ? "Guardando..." : "Guardar subcategoría"}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "asientos" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Asientos contables</CardTitle>
              <p className="text-sm text-slate-500">Valida Debe=Haber, posteo y reversa.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2">Ref</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2">Total</th>
                      <th className="px-3 py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {journalEntries.map((e) => (
                      <tr key={e.id}>
                        <td className="px-3 py-2 text-sm text-slate-800">{new Date(e.date).toLocaleDateString()}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{e.reference || "—"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{e.status}</td>
                        <td className="px-3 py-2 text-sm font-semibold">Q{e.totalDebit.toFixed(2)}</td>
                        <td className="px-3 py-2 space-x-2">
                          {e.status === "DRAFT" && (
                            <button
                              className="text-xs font-semibold text-emerald-700"
                              onClick={() => handlePostEntry(e.id)}
                              disabled={loading[`post-${e.id}`]}
                            >
                              Postear
                            </button>
                          )}
                          {e.status === "POSTED" && (
                            <button
                              className="text-xs font-semibold text-rose-700"
                              onClick={() => handleReverseEntry(e.id)}
                              disabled={loading[`reverse-${e.id}`]}
                            >
                              Reversar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!journalEntries.length && (
                      <tr>
                        <td className="px-3 py-2 text-sm text-slate-500" colSpan={5}>
                          Sin asientos.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Nuevo asiento</CardTitle>
              <p className="text-sm text-slate-500">Requiere al menos 2 líneas balanceadas.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <input
                type="date"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={entryForm.date}
                onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })}
              />
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Referencia"
                value={entryForm.reference}
                onChange={(e) => setEntryForm({ ...entryForm, reference: e.target.value })}
              />
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Descripción"
                value={entryForm.description}
                onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
              />
              <div className="space-y-2">
                {entryForm.lines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2">
                    <select
                      className="col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={line.accountId}
                      onChange={(e) => updateLine(idx, { accountId: e.target.value })}
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} · {a.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      placeholder="Debe"
                      value={line.debit}
                      onChange={(e) => updateLine(idx, { debit: Number(e.target.value) })}
                    />
                    <input
                      type="number"
                      step="0.01"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      placeholder="Haber"
                      value={line.credit}
                      onChange={(e) => updateLine(idx, { credit: Number(e.target.value) })}
                    />
                    <button
                      className="col-span-4 text-right text-xs text-rose-600"
                      onClick={() => removeLine(idx)}
                    >
                      Quitar
                    </button>
                  </div>
                ))}
                <button
                  onClick={addEntryLine}
                  className="w-full rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm"
                >
                  Agregar línea
                </button>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Debe: Q{totalDebit.toFixed(2)}</span>
                <span>Haber: Q{totalCredit.toFixed(2)}</span>
              </div>
              {!isBalanced && entryForm.lines.length > 0 && (
                <p className="text-xs text-rose-600">Debe=Haber para postear.</p>
              )}
              <button
                onClick={handleSaveEntry}
                disabled={loading.entry || !entryForm.lines.length}
                className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-70"
              >
                {loading.entry ? "Guardando..." : "Guardar borrador"}
              </button>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "reportes" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Estado de resultados simple</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-600">Ingresos (mes)</p>
                <p className="text-2xl font-semibold text-emerald-700">Q{(summary?.incomeMonth ?? 0).toFixed(2)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-600">Gastos (mes)</p>
                <p className="text-2xl font-semibold text-rose-700">Q{(summary?.expenseMonth ?? 0).toFixed(2)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-600">Resultado</p>
                <p className="text-2xl font-semibold text-slate-900">
                  Q{((summary?.incomeMonth ?? 0) - (summary?.expenseMonth ?? 0)).toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Libro mayor rápido</CardTitle>
              <p className="text-sm text-slate-500">Suma neta por cuenta (asientos posteados).</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {accounts.slice(0, 8).map((acc) => {
                const lines =
                  journalEntries
                    .filter((e) => e.status === "POSTED")
                    .flatMap((e) => (e.lines || []).map((l) => ({ ...l, entry: e })))
                    .filter((l) => l.accountId === acc.id) || [];
                const balance = lines.reduce((sum, l) => sum + (Number(l.debit) - Number(l.credit)), 0);
                return (
                  <div key={acc.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800">
                        {acc.code} · {acc.name}
                      </p>
                      <p className="text-sm font-semibold text-slate-900">Q{balance.toFixed(2)}</p>
                    </div>
                    <p className="text-xs text-slate-500">{lines.length} movimientos</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, prefix, negative }: { label: string; value: number; prefix?: string; negative?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-200">{label}</p>
      <p className="text-2xl font-semibold">
        <span className={negative ? "text-rose-200" : "text-emerald-200"}>
          {prefix || ""}
          {value?.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </p>
    </div>
  );
}
