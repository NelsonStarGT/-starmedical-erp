import type { ClientBloodType } from "@prisma/client";

function normalizeBloodTypeToken(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const BLOOD_TYPE_CANONICAL: ReadonlyArray<ClientBloodType> = [
  "A_POS",
  "A_NEG",
  "B_POS",
  "B_NEG",
  "AB_POS",
  "AB_NEG",
  "O_POS",
  "O_NEG"
];

export function resolveClientBloodType(value?: string | null): ClientBloodType | null {
  const compactRaw = (value ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (compactRaw === "A+" || compactRaw === "A_POS" || compactRaw === "A_POSITIVO") return "A_POS";
  if (compactRaw === "A-" || compactRaw === "A_NEG" || compactRaw === "A_NEGATIVO") return "A_NEG";
  if (compactRaw === "B+" || compactRaw === "B_POS" || compactRaw === "B_POSITIVO") return "B_POS";
  if (compactRaw === "B-" || compactRaw === "B_NEG" || compactRaw === "B_NEGATIVO") return "B_NEG";
  if (compactRaw === "AB+" || compactRaw === "AB_POS" || compactRaw === "AB_POSITIVO") return "AB_POS";
  if (compactRaw === "AB-" || compactRaw === "AB_NEG" || compactRaw === "AB_NEGATIVO") return "AB_NEG";
  if (compactRaw === "O+" || compactRaw === "O_POS" || compactRaw === "O_POSITIVO") return "O_POS";
  if (compactRaw === "O-" || compactRaw === "O_NEG" || compactRaw === "O_NEGATIVO") return "O_NEG";

  const token = normalizeBloodTypeToken(value);
  if (!token) return null;

  if (token === "A" || token === "A_POS" || token === "APOS" || token === "A_POSITIVO") return "A_POS";
  if (token === "A_NEG" || token === "ANEG" || token === "A_NEGATIVO") return "A_NEG";
  if (token === "B" || token === "B_POS" || token === "BPOS" || token === "B_POSITIVO") return "B_POS";
  if (token === "B_NEG" || token === "BNEG" || token === "B_NEGATIVO") return "B_NEG";
  if (token === "AB" || token === "AB_POS" || token === "ABPOS" || token === "AB_POSITIVO") return "AB_POS";
  if (token === "AB_NEG" || token === "ABNEG" || token === "AB_NEGATIVO") return "AB_NEG";
  if (token === "O" || token === "O_POS" || token === "OPOS" || token === "O_POSITIVO") return "O_POS";
  if (token === "O_NEG" || token === "ONEG" || token === "O_NEGATIVO") return "O_NEG";
  if (token === "UNKNOWN" || token === "DESCONOCIDO") return null;

  if ((BLOOD_TYPE_CANONICAL as readonly string[]).includes(token)) {
    return token as ClientBloodType;
  }
  return null;
}
