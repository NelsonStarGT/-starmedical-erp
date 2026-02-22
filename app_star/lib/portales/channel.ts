export type PortalRequestChannel = "PATIENT_PORTAL" | "COMPANY_PORTAL" | "INTERNAL" | "UNKNOWN";

export type PortalChannelFilter = "all" | "patient" | "company";

export function normalizeIdentifier(value: string | null | undefined) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

export function parsePortalRequestChannel(createdById: string | null | undefined): {
  channel: PortalRequestChannel;
  companyId: string | null;
} {
  const createdBy = normalizeIdentifier(createdById);
  if (!createdBy) {
    return { channel: "UNKNOWN", companyId: null };
  }

  if (createdBy.startsWith("portal_company:")) {
    const companyId = normalizeIdentifier(createdBy.slice("portal_company:".length));
    return { channel: "COMPANY_PORTAL", companyId };
  }

  if (createdBy.startsWith("portal:company:")) {
    const companyId = normalizeIdentifier(createdBy.slice("portal:company:".length));
    return { channel: "COMPANY_PORTAL", companyId };
  }

  if (createdBy.startsWith("portal:")) {
    return { channel: "PATIENT_PORTAL", companyId: null };
  }

  return { channel: "INTERNAL", companyId: null };
}

export function matchesPortalChannelFilter(channel: PortalRequestChannel, filter: PortalChannelFilter) {
  if (filter === "all") return true;
  if (filter === "patient") return channel === "PATIENT_PORTAL";
  if (filter === "company") return channel === "COMPANY_PORTAL";
  return true;
}

export function portalChannelLabel(channel: PortalRequestChannel) {
  if (channel === "PATIENT_PORTAL") return "Portal paciente";
  if (channel === "COMPANY_PORTAL") return "Portal empresa";
  if (channel === "INTERNAL") return "Interno";
  return "Desconocido";
}
