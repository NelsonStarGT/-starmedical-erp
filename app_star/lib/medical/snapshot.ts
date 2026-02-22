import type { EncounterHistoryFieldDraft, EncounterSnapshot } from "@/components/medical/encounter/types";
import {
  createDefaultDocumentBrandingTemplate,
  normalizeDocumentBrandingTemplate,
  type DocumentBrandingTemplate
} from "@/lib/medical/documentBranding";
import { sanitizeRichHtmlOrDash } from "@/lib/medical/sanitize";

function escapeHtml(raw: string) {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function fieldValueHtml(field: EncounterHistoryFieldDraft) {
  if (!field.visible) return "";
  if (field.kind === "rich_text") {
    return sanitizeRichHtmlOrDash(field.richValue.html || "", "—");
  }
  if (field.kind === "number") {
    return `<p>${field.numberValue === null ? "—" : escapeHtml(String(field.numberValue))}</p>`;
  }
  const value = field.textValue?.trim() || field.defaultValue?.trim() || "—";
  return `<p>${escapeHtml(value)}</p>`;
}

function normalizeDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("es-GT", { dateStyle: "full", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function cssSafeUrl(raw: string | null) {
  if (!raw) return "";
  return raw.replaceAll("'", "%27").replaceAll('"', "%22");
}

function brandingBackgroundPosition(position: DocumentBrandingTemplate["backgroundPosition"]) {
  if (position === "top") return "top center";
  if (position === "bottom") return "bottom center";
  return "center";
}

function brandingLogoAlignment(position: DocumentBrandingTemplate["logoPosition"]) {
  if (position === "top-left") return "flex-start";
  if (position === "top-center") return "center";
  return "flex-end";
}

export function renderEncounterSnapshotHtml(snapshot: EncounterSnapshot, incomingBranding?: DocumentBrandingTemplate | null) {
  return renderEncounterSnapshotHtmlWithBranding(snapshot, incomingBranding || createDefaultDocumentBrandingTemplate());
}

export function renderEncounterSnapshotHtmlWithBranding(
  snapshot: EncounterSnapshot,
  incomingBranding: DocumentBrandingTemplate | null | undefined
) {
  const branding = normalizeDocumentBrandingTemplate(incomingBranding || createDefaultDocumentBrandingTemplate());
  const logoUrl = branding.logoUrl ? escapeHtml(branding.logoUrl) : "";
  const footerLeftText = escapeHtml(branding.footerLeftText || " ");
  const footerRightText = escapeHtml(branding.footerRightText || " ");
  const backgroundUrl = branding.backgroundImageUrl ? cssSafeUrl(branding.backgroundImageUrl) : "";
  const showBackground = Boolean(backgroundUrl);
  const backgroundCss = showBackground
    ? `
      .sheet::before {
        content: "";
        position: absolute;
        inset: 0;
        background-image: url('${backgroundUrl}');
        background-size: ${Math.round(branding.backgroundScale * 100)}% auto;
        background-position: ${brandingBackgroundPosition(branding.backgroundPosition)};
        background-repeat: no-repeat;
        opacity: ${branding.backgroundOpacity};
        z-index: 0;
      }
    `
    : "";

  const sectionsHtml = snapshot.history.sections
    .map((section) => {
      const fieldsHtml = section.fields
        .filter((field) => field.visible)
        .map((field) => {
          return `
            <article class="field-block">
              <p class="field-label">${escapeHtml(field.label)}</p>
              <div class="field-value">${fieldValueHtml(field)}</div>
            </article>
          `;
        })
        .join("\n");

      return `
        <section class="section-block">
          <h3>${escapeHtml(section.title)}</h3>
          ${section.description ? `<p class="section-description">${escapeHtml(section.description)}</p>` : ""}
          <div class="section-fields">${fieldsHtml || '<article class="field-block"><div class="field-value"><p>—</p></div></article>'}</div>
        </section>
      `;
    })
    .join("\n");

  const reconsultasHtml = snapshot.reconsultations
    .map((entry) => {
      const fallbackNote = entry.noteRich?.text?.trim() || entry.interpretation || "—";
      const noteHtml = sanitizeRichHtmlOrDash(entry.noteRich?.html || "", fallbackNote);
      return `
        <article class="reconsulta-block">
          <p class="reconsulta-head">${escapeHtml(entry.entryTitle)}</p>
          <p class="reconsulta-meta">${escapeHtml(entry.authorName)} · ${escapeHtml(normalizeDate(entry.createdAt))}</p>
          <div class="reconsulta-note">${noteHtml}</div>
        </article>
      `;
    })
    .join("\n");

  return `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Snapshot Clínico ${escapeHtml(snapshot.encounterId)}</title>
    <style>
      @page {
        size: Letter;
        margin: ${branding.marginTopIn}in ${branding.marginRightIn}in ${branding.marginBottomIn}in ${branding.marginLeftIn}in;
      }
      body {
        margin: 0;
        font-family: "Segoe UI", Arial, sans-serif;
        color: #0f172a;
        background: #ffffff;
      }
      .sheet {
        position: relative;
        width: 100%;
        min-height: calc(11in - ${branding.marginTopIn + branding.marginBottomIn}in);
      }
      ${backgroundCss}
      .content {
        position: relative;
        z-index: 1;
      }
      .header {
        border-bottom: 2px solid #4aa59c;
        padding-bottom: 10px;
        margin-bottom: 16px;
      }
      .brand-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .logo-row {
        margin-top: 6px;
        display: flex;
        justify-content: ${brandingLogoAlignment(branding.logoPosition)};
      }
      .logo {
        max-height: 44px;
        max-width: ${branding.logoWidthPx}px;
        object-fit: contain;
      }
      .brand {
        color: #2e75ba;
        font-weight: 700;
        font-size: 11px;
        letter-spacing: 0.2em;
        text-transform: uppercase;
      }
      h1 {
        margin: 6px 0 2px;
        font-size: 20px;
      }
      .meta {
        font-size: 12px;
        color: #334155;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 16px;
      }
      .meta-item {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 8px;
        background: #f8fafc;
        font-size: 12px;
      }
      .meta-item b {
        color: #0f172a;
      }
      .section-block {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 12px;
        margin-bottom: 12px;
        break-inside: avoid-page;
        background: rgba(255, 255, 255, 0.92);
      }
      .section-block h3 {
        margin: 0;
        color: #2e75ba;
        font-size: 15px;
      }
      .section-description {
        margin: 4px 0 10px;
        font-size: 12px;
        color: #475569;
      }
      .field-block + .field-block {
        margin-top: 8px;
      }
      .field-label {
        margin: 0 0 4px;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 10px;
        font-weight: 700;
      }
      .field-value p {
        margin: 0 0 6px;
        line-height: 1.5;
        font-size: 13px;
      }
      .field-value ul,
      .field-value ol {
        margin: 0 0 6px 18px;
      }
      .subhead {
        margin: 18px 0 8px;
        font-size: 13px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #2e75ba;
      }
      .reconsulta-block {
        border: 1px solid #dbeafe;
        background: #f8fbff;
        border-radius: 10px;
        padding: 10px;
        margin-bottom: 8px;
        break-inside: avoid-page;
      }
      .reconsulta-head {
        margin: 0;
        font-size: 13px;
        font-weight: 700;
      }
      .reconsulta-meta {
        margin: 2px 0 6px;
        font-size: 11px;
        color: #475569;
      }
      .footer {
        margin-top: 20px;
        padding-top: 10px;
        border-top: 1px dashed #cbd5e1;
        font-size: 11px;
        color: #475569;
      }
      .footer-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <div class="content">
        <header class="header">
          <div class="brand-row">
            <p class="brand">${escapeHtml(branding.title)} · Snapshot legal</p>
          </div>
          ${logoUrl ? `<div class="logo-row"><img class="logo" src="${logoUrl}" alt="Logo clínico" /></div>` : ""}
          <h1>Consulta ${escapeHtml(snapshot.encounterId)}</h1>
          <p class="meta">Firmado por ${escapeHtml(snapshot.signedByName)} el ${escapeHtml(normalizeDate(snapshot.signedAt))}</p>
        </header>

        <section class="grid">
          <article class="meta-item"><b>Paciente:</b> ${escapeHtml(snapshot.patient.name)}</article>
          <article class="meta-item"><b>Expediente:</b> ${escapeHtml(snapshot.patient.recordNumber)}</article>
          <article class="meta-item"><b>Diagnóstico principal:</b> ${escapeHtml(snapshot.diagnosis.principalCode || "—")}</article>
          <article class="meta-item"><b>Estado:</b> ${escapeHtml(snapshot.status)}</article>
        </section>

        <section>
          <p class="subhead">Historia clínica</p>
          ${sectionsHtml}
        </section>

        <section>
          <p class="subhead">Evolución / Reconsultas</p>
          ${reconsultasHtml || '<article class="reconsulta-block"><p class="reconsulta-head">Sin reconsultas</p></article>'}
        </section>

        ${
          branding.footerEnabled
            ? `<footer class="footer"><div class="footer-row"><span>${footerLeftText}</span><span>${footerRightText}</span></div></footer>`
            : ""
        }
      </div>
    </main>
  </body>
</html>
  `.trim();
}
