export type IdentityLike = {
  appName?: string | null;
  orgName?: string | null;
  tenantId?: string | null;
  userName?: string | null;
  email?: string | null;
};

function pickSource(identity: IdentityLike | null | undefined): string {
  if (!identity) return "";

  const source = [
    identity.userName,
    identity.orgName,
    identity.appName,
    identity.email,
    identity.tenantId
  ].find((value) => typeof value === "string" && value.trim().length > 0);

  return typeof source === "string" ? source.trim() : "";
}

function initialsFromString(value: string): string {
  if (!value) return "";

  const cleaned = value
    .replace(/[@._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";

  const words = cleaned.split(" ").filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
  }

  const single = words[0] || "";
  const alphaNum = single.replace(/[^\p{L}\p{N}]/gu, "");
  return (alphaNum.slice(0, 2) || single.slice(0, 2)).toUpperCase();
}

export function initialsFromIdentity(identity: IdentityLike | null | undefined, fallback = "SM") {
  const initials = initialsFromString(pickSource(identity));
  const safeFallback = initialsFromString(fallback) || "SM";
  return initials || safeFallback;
}
