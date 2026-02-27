"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, PlusCircle, Upload, X } from "lucide-react";
import { actionAddClientDocument, actionAddClientNote } from "@/app/admin/clientes/actions";
import { COMPANY_DOCUMENT_ALLOWED_MIME_TYPES, validateCompanyDocumentWizardDrafts } from "@/lib/clients/companyCreate";
import { cn } from "@/lib/utils";

type UploadedAsset = {
  assetId: string;
  url: string;
  previewUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

type CompanyDocumentDraft = {
  id: string;
  title: string;
  hasExpiry: boolean;
  expiryDate: string;
  notes: string;
  asset: UploadedAsset | null;
};

const BASE_COMPANY_DOCUMENTS = [
  "Patente de comercio",
  "Patente de sociedad",
  "DPI representante legal",
  "Recibo agua/luz",
  "Escritura pública"
] as const;

const BASE_INSTITUTION_DOCUMENTS = [
  "Acta constitutiva / escritura",
  "Nombramiento / representación legal",
  "Registro / resolución",
  "DPI representante / director",
  "Recibo agua/luz",
  "SSO / sanitario (si aplica)"
] as const;

const BASE_INSURER_DOCUMENTS = [
  "Convenio firmado",
  "Tarifario / tabulador",
  "Manual de procedimientos",
  "Requisitos de autorización",
  "Otros"
] as const;

const COMPANY_DOCUMENT_MAX_SIZE_BYTES = 25 * 1024 * 1024;

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildBaseDocumentDrafts(organizationType: "company" | "institution" | "insurer"): CompanyDocumentDraft[] {
  const baseRows =
    organizationType === "institution"
      ? BASE_INSTITUTION_DOCUMENTS
      : organizationType === "insurer"
        ? BASE_INSURER_DOCUMENTS
        : BASE_COMPANY_DOCUMENTS;
  return baseRows.map((title) => ({
    id: randomId("doc"),
    title,
    hasExpiry: false,
    expiryDate: "",
    notes: "",
    asset: null
  }));
}

function revokeAssetPreview(asset: UploadedAsset | null) {
  if (!asset) return;
  if (asset.previewUrl.startsWith("blob:")) {
    URL.revokeObjectURL(asset.previewUrl);
  }
}

export default function CompanyDocumentsWizard({
  companyId,
  clientId,
  companyLabel,
  organizationType = "company"
}: {
  companyId: string;
  clientId: string;
  companyLabel: string;
  organizationType?: "company" | "institution" | "insurer";
}) {
  const router = useRouter();
  const isInstitution = organizationType === "institution";
  const isInsurer = organizationType === "insurer";
  const [documents, setDocuments] = useState<CompanyDocumentDraft[]>(() => buildBaseDocumentDrafts(organizationType));
  const [otherDocuments, setOtherDocuments] = useState<CompanyDocumentDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const allDocuments = useMemo(() => [...documents, ...otherDocuments], [documents, otherDocuments]);

  useEffect(() => {
    setDocuments(buildBaseDocumentDrafts(organizationType));
    setOtherDocuments([]);
  }, [organizationType]);

  useEffect(() => {
    return () => {
      documents.forEach((row) => revokeAssetPreview(row.asset));
      otherDocuments.forEach((row) => revokeAssetPreview(row.asset));
    };
  }, [documents, otherDocuments]);

  async function uploadDocumentAsset(file: File): Promise<UploadedAsset> {
    const normalizedMime = file.type.toLowerCase();
    if (!COMPANY_DOCUMENT_ALLOWED_MIME_TYPES.has(normalizedMime)) {
      throw new Error("Documento inválido. Solo PDF, JPG o PNG.");
    }
    if (file.size > COMPANY_DOCUMENT_MAX_SIZE_BYTES) {
      throw new Error("Documento inválido. Máximo 25MB.");
    }

    const previewUrl = URL.createObjectURL(file);
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/upload/image", {
      method: "POST",
      body: formData
    });
    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      assetId?: string;
      url?: string;
    };
    if (!response.ok || payload.ok === false || !payload.assetId || !payload.url) {
      URL.revokeObjectURL(previewUrl);
      throw new Error(payload.error || "No se pudo subir el documento.");
    }

    return {
      assetId: payload.assetId,
      url: payload.url,
      previewUrl,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size
    };
  }

  async function attachBaseDocumentFile(documentId: string, file: File) {
    try {
      setError(null);
      setSuccessMessage(null);
      setIsUploading(true);
      const asset = await uploadDocumentAsset(file);
      setDocuments((prev) =>
        prev.map((row) => {
          if (row.id !== documentId) return row;
          revokeAssetPreview(row.asset);
          return {
            ...row,
            asset
          };
        })
      );
    } catch (uploadError) {
      setError((uploadError as Error)?.message || "No se pudo subir el documento.");
    } finally {
      setIsUploading(false);
    }
  }

  async function attachOtherDocumentFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setError(null);
    setSuccessMessage(null);
    setIsUploading(true);

    try {
      const uploaded: CompanyDocumentDraft[] = [];
      for (const file of Array.from(fileList)) {
        const asset = await uploadDocumentAsset(file);
        uploaded.push({
          id: randomId("doc_other"),
          title: file.name.replace(/\.[^/.]+$/, "") || "Otro documento",
          hasExpiry: false,
          expiryDate: "",
          notes: "",
          asset
        });
      }
      setOtherDocuments((prev) => [...prev, ...uploaded]);
    } catch (uploadError) {
      setError((uploadError as Error)?.message || "No se pudieron subir los documentos.");
    } finally {
      setIsUploading(false);
    }
  }

  function updateDocument(documentId: string, scope: "base" | "other", patch: Partial<CompanyDocumentDraft>) {
    if (scope === "base") {
      setDocuments((prev) => prev.map((row) => (row.id === documentId ? { ...row, ...patch } : row)));
      return;
    }
    setOtherDocuments((prev) => prev.map((row) => (row.id === documentId ? { ...row, ...patch } : row)));
  }

  function removeAsset(documentId: string, scope: "base" | "other") {
    if (scope === "base") {
      setDocuments((prev) =>
        prev.map((row) => {
          if (row.id !== documentId) return row;
          revokeAssetPreview(row.asset);
          return {
            ...row,
            asset: null
          };
        })
      );
      return;
    }

    setOtherDocuments((prev) =>
      prev.filter((row) => {
        if (row.id !== documentId) return true;
        revokeAssetPreview(row.asset);
        return false;
      })
    );
  }

  function validateBeforeSave() {
    const draftValidation = validateCompanyDocumentWizardDrafts(
      allDocuments.map((row) => ({
        title: row.title,
        hasExpiry: row.hasExpiry,
        expiryDate: row.expiryDate,
        fileAssetId: row.asset?.assetId ?? null
      }))
    );
    if (!draftValidation.ok) return draftValidation.error;
    return null;
  }

  function saveDocuments() {
    if (isUploading) {
      setError("Espera a que termine la subida de documentos.");
      return;
    }

    const validationError = validateBeforeSave();
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      try {
        setError(null);
        setSuccessMessage(null);
        const rowsToPersist = allDocuments.filter((row) => row.asset?.assetId && row.asset.url);
        for (const row of rowsToPersist) {
          await actionAddClientDocument({
            clientId,
            title: row.title.trim(),
            fileAssetId: row.asset?.assetId ?? undefined,
            fileUrl: row.asset?.url ?? undefined,
            originalName: row.asset?.fileName ?? undefined,
            expiresAt: row.hasExpiry && row.expiryDate ? row.expiryDate : undefined
          });
          if (row.notes.trim()) {
            await actionAddClientNote({
              clientId,
              title: `Documento: ${row.title.trim()}`,
              body: row.notes.trim()
            });
          }
        }

        setSuccessMessage("Documentos guardados correctamente.");
        router.push(`/admin/clientes/${clientId}?tab=documentos`);
      } catch (saveError) {
        setError((saveError as Error)?.message || "No se pudieron guardar los documentos.");
      }
    });
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-diagnostics-corporate">
          {isInstitution ? "Instituciones" : isInsurer ? "Aseguradoras" : "Empresas"}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
          {isInstitution ? "Documentos institucionales" : isInsurer ? "Documentos de aseguradora" : "Documentos empresariales"}
        </h2>
        <p className="text-sm text-slate-600">
          Carga de documentos base para {companyLabel || (isInstitution ? "institución" : isInsurer ? "aseguradora" : "empresa")}. ID:{" "}
          <span className="font-semibold">{companyId}</span>
        </p>
      </div>

      <section className="space-y-4 rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">Paso 2) Documentos</p>
          <button
            type="button"
            onClick={() => router.push(`/admin/clientes/${clientId}?tab=documentos`)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            <ArrowLeft size={13} />
            Volver al detalle
          </button>
        </div>

        <div className="space-y-3">
          {documents.map((doc, index) => (
            <article key={doc.id} className="space-y-2 rounded-xl border border-slate-200 bg-[#F8FAFC] p-3">
              <p className="text-xs font-semibold text-slate-700">Documento base #{index + 1}</p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-12">
                <input
                  value={doc.title}
                  onChange={(event) => updateDocument(doc.id, "base", { title: event.target.value })}
                  className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25 md:col-span-2 lg:col-span-4"
                  placeholder="Título del documento"
                />
                <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-[#2e75ba] shadow-sm md:col-span-1 lg:col-span-3">
                  <Upload size={14} className="mr-1" />
                  {doc.asset ? "Reemplazar archivo" : "Subir archivo"}
                  <input
                    type="file"
                    accept="application/pdf,image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void attachBaseDocumentFile(doc.id, file);
                    }}
                    disabled={isUploading || isPending}
                  />
                </label>
                <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 md:col-span-1 lg:col-span-2">
                  <input
                    type="checkbox"
                    checked={doc.hasExpiry}
                    onChange={(event) =>
                      updateDocument(doc.id, "base", {
                        hasExpiry: event.target.checked,
                        expiryDate: event.target.checked ? doc.expiryDate : ""
                      })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-[#4aa59c] focus:ring-[#4aa59c]"
                  />
                  Tiene vencimiento
                </label>
                {doc.hasExpiry ? (
                  <input
                    type="date"
                    value={doc.expiryDate}
                    onChange={(event) => updateDocument(doc.id, "base", { expiryDate: event.target.value })}
                    className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25 md:col-span-1 lg:col-span-3"
                  />
                ) : null}
                {doc.asset ? (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 md:col-span-2 lg:col-span-12">
                    <p className="truncate">{doc.asset.fileName}</p>
                    <button
                      type="button"
                      onClick={() => removeAsset(doc.id, "base")}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700"
                    >
                      <X size={12} />
                      Quitar
                    </button>
                  </div>
                ) : null}
                <textarea
                  value={doc.notes}
                  onChange={(event) => updateDocument(doc.id, "base", { notes: event.target.value.slice(0, 180) })}
                  placeholder="Notas (opcional)"
                  className="min-h-[72px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25 md:col-span-2 lg:col-span-12"
                />
              </div>
            </article>
          ))}
        </div>

        <div className="space-y-2 rounded-xl border border-slate-200 bg-[#F8FAFC] p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Otros documentos (opcional)</p>
            <label className="inline-flex h-10 cursor-pointer items-center gap-1 rounded-lg border border-[#4aa59c]/30 bg-[#4aa59c]/10 px-3 text-xs font-semibold text-[#2e75ba]">
              <PlusCircle size={13} />
              Subir múltiples
              <input
                type="file"
                multiple
                accept="application/pdf,image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={(event) => void attachOtherDocumentFiles(event.target.files)}
                disabled={isUploading || isPending}
              />
            </label>
          </div>

          {!otherDocuments.length ? <p className="text-xs text-slate-500">Sin documentos adicionales.</p> : null}

          {otherDocuments.map((doc) => (
            <div key={doc.id} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-white p-2 md:grid-cols-2 lg:grid-cols-12">
              <input
                value={doc.title}
                onChange={(event) => updateDocument(doc.id, "other", { title: event.target.value })}
                className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25 md:col-span-1 lg:col-span-4"
                placeholder="Título"
              />
              <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 md:col-span-1 lg:col-span-2">
                <input
                  type="checkbox"
                  checked={doc.hasExpiry}
                  onChange={(event) =>
                    updateDocument(doc.id, "other", {
                      hasExpiry: event.target.checked,
                      expiryDate: event.target.checked ? doc.expiryDate : ""
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-[#4aa59c] focus:ring-[#4aa59c]"
                />
                Vence
              </label>
              {doc.hasExpiry ? (
                <input
                  type="date"
                  value={doc.expiryDate}
                  onChange={(event) => updateDocument(doc.id, "other", { expiryDate: event.target.value })}
                  className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25 md:col-span-1 lg:col-span-3"
                />
              ) : null}
              <p className="truncate text-xs text-slate-600 md:col-span-1 lg:col-span-2">{doc.asset?.fileName ?? "Sin archivo"}</p>
              <button
                type="button"
                onClick={() => removeAsset(doc.id, "other")}
                className="inline-flex h-11 items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 text-xs font-semibold text-rose-700 lg:col-span-1"
              >
                <X size={12} />
                Quitar
              </button>
              <textarea
                value={doc.notes}
                onChange={(event) => updateDocument(doc.id, "other", { notes: event.target.value.slice(0, 180) })}
                placeholder="Notas (opcional)"
                className="min-h-[72px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25 md:col-span-2 lg:col-span-12"
              />
            </div>
          ))}
        </div>

        {error ? <p className="text-xs text-rose-700">{error}</p> : null}
        {successMessage ? <p className="text-xs text-emerald-700">{successMessage}</p> : null}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push(`/admin/clientes/${clientId}?tab=documentos`)}
            disabled={isPending}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm",
              isPending && "cursor-not-allowed opacity-60"
            )}
          >
            Omitir y finalizar
          </button>
          <button
            type="button"
            onClick={saveDocuments}
            disabled={isPending || isUploading || allDocuments.every((row) => !row.asset?.assetId)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4aadf5]",
              (isPending || isUploading || allDocuments.every((row) => !row.asset?.assetId)) && "cursor-not-allowed opacity-60"
            )}
          >
            Guardar documentos
          </button>
        </div>
      </section>
    </section>
  );
}
