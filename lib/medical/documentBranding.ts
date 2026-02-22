export type DocumentBrandingBackgroundPosition = "center" | "top" | "bottom";
export type DocumentBrandingLogoPosition = "top-left" | "top-center" | "top-right";
export type DocumentBrandingScope = "clinical" | "order_lab" | "order_rx" | "order_usg";

export type DocumentBrandingTemplate = {
  id: string;
  scope: DocumentBrandingScope;
  title: string;
  isDefault: boolean;
  updatedAt: string;
  backgroundImageUrl: string | null;
  backgroundOpacity: number;
  backgroundScale: number;
  backgroundPosition: DocumentBrandingBackgroundPosition;
  logoUrl: string | null;
  logoWidthPx: number;
  logoPosition: DocumentBrandingLogoPosition;
  footerEnabled: boolean;
  footerLeftText: string;
  footerRightText: string;
  marginTopIn: number;
  marginRightIn: number;
  marginBottomIn: number;
  marginLeftIn: number;
};

export const DOCUMENT_BRANDING_DEFAULT_ID = "doc-branding-default";

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : null;
}

function normalizeBackgroundPosition(value: string | null | undefined): DocumentBrandingBackgroundPosition {
  if (value === "top" || value === "bottom") return value;
  return "center";
}

function normalizeLogoPosition(value: string | null | undefined): DocumentBrandingLogoPosition {
  if (value === "top-left" || value === "top-right") return value;
  return "top-center";
}

function normalizeScope(value: string | null | undefined): DocumentBrandingScope {
  if (value === "order_lab" || value === "order_rx" || value === "order_usg") return value;
  return "clinical";
}

function defaultTitleByScope(scope: DocumentBrandingScope) {
  if (scope === "order_lab") return "Plantilla orden laboratorio";
  if (scope === "order_rx") return "Plantilla orden rayos X";
  if (scope === "order_usg") return "Plantilla orden ultrasonido";
  return "Plantilla clínica institucional";
}

export function createDefaultDocumentBrandingTemplate(
  input?: Partial<DocumentBrandingTemplate> | null
): DocumentBrandingTemplate {
  const scope = normalizeScope(input?.scope);
  return {
    id: input?.id || DOCUMENT_BRANDING_DEFAULT_ID,
    scope,
    title: input?.title || defaultTitleByScope(scope),
    isDefault: input?.isDefault ?? true,
    updatedAt: input?.updatedAt || new Date().toISOString(),
    backgroundImageUrl: input?.backgroundImageUrl || null,
    backgroundOpacity: input?.backgroundOpacity ?? 0.12,
    backgroundScale: input?.backgroundScale ?? 1,
    backgroundPosition: input?.backgroundPosition || "center",
    logoUrl: input?.logoUrl || null,
    logoWidthPx: input?.logoWidthPx ?? 140,
    logoPosition: input?.logoPosition || "top-right",
    footerEnabled: input?.footerEnabled ?? true,
    footerLeftText: input?.footerLeftText || "Documento clínico",
    footerRightText: input?.footerRightText || "Emitido desde StarMedical ERP",
    marginTopIn: input?.marginTopIn ?? 0.75,
    marginRightIn: input?.marginRightIn ?? 0.75,
    marginBottomIn: input?.marginBottomIn ?? 0.75,
    marginLeftIn: input?.marginLeftIn ?? 0.75
  };
}

export function normalizeDocumentBrandingTemplate(
  input: Partial<DocumentBrandingTemplate> | null | undefined
): DocumentBrandingTemplate {
  const scope = normalizeScope(input?.scope);
  const fallback = createDefaultDocumentBrandingTemplate({
    id: typeof input?.id === "string" && input.id.trim().length > 0 ? input.id.trim() : DOCUMENT_BRANDING_DEFAULT_ID,
    scope,
    isDefault: Boolean(input?.isDefault),
    title: typeof input?.title === "string" && input.title.trim().length > 0 ? input.title.trim() : defaultTitleByScope(scope),
    updatedAt: typeof input?.updatedAt === "string" && input.updatedAt.trim().length > 0 ? input.updatedAt : new Date().toISOString()
  });

  return {
    id: fallback.id,
    scope,
    title: fallback.title,
    isDefault: Boolean(input?.isDefault ?? fallback.isDefault),
    updatedAt: typeof input?.updatedAt === "string" && input.updatedAt.trim().length > 0 ? input.updatedAt : fallback.updatedAt,
    backgroundImageUrl: normalizeOptionalString(input?.backgroundImageUrl) ?? null,
    backgroundOpacity: Number(clamp(Number(input?.backgroundOpacity ?? fallback.backgroundOpacity), 0, 1).toFixed(2)),
    backgroundScale: Number(clamp(Number(input?.backgroundScale ?? fallback.backgroundScale), 0.5, 1.2).toFixed(2)),
    backgroundPosition: normalizeBackgroundPosition(input?.backgroundPosition || fallback.backgroundPosition),
    logoUrl: normalizeOptionalString(input?.logoUrl) ?? null,
    logoWidthPx: Math.round(clamp(Number(input?.logoWidthPx ?? fallback.logoWidthPx), 60, 320)),
    logoPosition: normalizeLogoPosition(input?.logoPosition || fallback.logoPosition),
    footerEnabled: Boolean(input?.footerEnabled ?? fallback.footerEnabled),
    footerLeftText: (typeof input?.footerLeftText === "string" ? input.footerLeftText : fallback.footerLeftText).trim() || " ",
    footerRightText: (typeof input?.footerRightText === "string" ? input.footerRightText : fallback.footerRightText).trim() || " ",
    marginTopIn: Number(clamp(Number(input?.marginTopIn ?? fallback.marginTopIn), 0.35, 1.5).toFixed(2)),
    marginRightIn: Number(clamp(Number(input?.marginRightIn ?? fallback.marginRightIn), 0.35, 1.5).toFixed(2)),
    marginBottomIn: Number(clamp(Number(input?.marginBottomIn ?? fallback.marginBottomIn), 0.35, 1.5).toFixed(2)),
    marginLeftIn: Number(clamp(Number(input?.marginLeftIn ?? fallback.marginLeftIn), 0.35, 1.5).toFixed(2))
  };
}

export function normalizeDocumentBrandingTemplates(
  input: Array<Partial<DocumentBrandingTemplate>>
): DocumentBrandingTemplate[] {
  const normalized = input.map((item) => normalizeDocumentBrandingTemplate(item));
  if (normalized.length === 0) return [createDefaultDocumentBrandingTemplate()];

  const sorted = normalized
    .slice()
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  const scopes: DocumentBrandingScope[] = ["clinical", "order_lab", "order_rx", "order_usg"];
  const next = [...sorted];
  for (const scope of scopes) {
    const scoped = next.filter((item) => item.scope === scope);
    if (scoped.length === 0) continue;
    if (scoped.some((item) => item.isDefault)) continue;
    const latest = scoped[0];
    const idx = next.findIndex((item) => item.id === latest.id);
    if (idx >= 0) {
      next[idx] = { ...next[idx], isDefault: true };
    }
  }
  return next;
}

export function pickDefaultDocumentBrandingTemplate(
  templates: DocumentBrandingTemplate[],
  scope: DocumentBrandingScope = "clinical"
): DocumentBrandingTemplate {
  const scoped = templates.filter((item) => item.scope === scope);
  return scoped.find((item) => item.isDefault) || scoped[0] || createDefaultDocumentBrandingTemplate({ scope });
}
