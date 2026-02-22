import { ClientProfileType, Prisma } from "@prisma/client";

export type ClientCompletenessSnapshot = {
  type: ClientProfileType;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  secondLastName: string | null;
  dpi: string | null;
  phone: string | null;
  companyName: string | null;
  tradeName: string | null;
  nit: string | null;
  address: string | null;
  city: string | null;
  department: string | null;
  institutionTypeId: string | null;
};

export type ClientCompletenessDocumentsSnapshot = {
  requiredTotal: number;
  approvedAndValid: number;
  rejectedOrMissing?: number;
};

type ClientCompletenessScoreOptions = {
  documents?: ClientCompletenessDocumentsSnapshot | null;
  weights?: {
    profile?: number;
    documents?: number;
  };
};

type RequiredFieldRule = {
  key: keyof ClientCompletenessSnapshot;
  label: string;
};

function isPresent(value: string | null | undefined) {
  return Boolean(value && value.trim().length);
}

function getRequiredRules(type: ClientProfileType): RequiredFieldRule[] {
  if (type === ClientProfileType.PERSON) {
    return [
      { key: "firstName", label: "Primer nombre" },
      { key: "middleName", label: "Segundo nombre" },
      { key: "lastName", label: "Primer apellido" },
      { key: "secondLastName", label: "Segundo apellido" },
      { key: "dpi", label: "DPI" },
      { key: "phone", label: "Teléfono" }
    ];
  }

  if (type === ClientProfileType.COMPANY) {
    return [
      { key: "companyName", label: "Razón social" },
      { key: "tradeName", label: "Nombre comercial" },
      { key: "nit", label: "NIT" },
      { key: "address", label: "Dirección" },
      { key: "city", label: "Ciudad" },
      { key: "department", label: "Departamento" }
    ];
  }

  if (type === ClientProfileType.INSURER) {
    return [
      { key: "companyName", label: "Nombre de aseguradora" },
      { key: "nit", label: "NIT" }
    ];
  }

  return [
    { key: "companyName", label: "Nombre de institución" },
    { key: "institutionTypeId", label: "Tipo de institución" },
    { key: "address", label: "Dirección" },
    { key: "city", label: "Ciudad" },
    { key: "department", label: "Departamento" }
  ];
}

export function getClientMissingRequiredFields(snapshot: ClientCompletenessSnapshot) {
  const rules = getRequiredRules(snapshot.type);
  return rules.filter((rule) => !isPresent(snapshot[rule.key] as string | null)).map((rule) => rule.label);
}

function getDocumentsCompletenessScore(snapshot?: ClientCompletenessDocumentsSnapshot | null) {
  if (!snapshot) return null;

  const requiredTotal = Math.max(0, snapshot.requiredTotal);
  if (!requiredTotal) return null;

  const approvedAndValid = Math.max(0, Math.min(snapshot.approvedAndValid, requiredTotal));
  return Math.round((approvedAndValid / requiredTotal) * 100);
}

function resolveScoreWeights(options?: ClientCompletenessScoreOptions) {
  const profileWeightRaw = options?.weights?.profile ?? 80;
  const documentsWeightRaw = options?.weights?.documents ?? 20;
  const total = profileWeightRaw + documentsWeightRaw;

  if (!Number.isFinite(total) || total <= 0) {
    return { profile: 0.8, documents: 0.2 };
  }

  return {
    profile: profileWeightRaw / total,
    documents: documentsWeightRaw / total
  };
}

export function getClientCompletenessScore(snapshot: ClientCompletenessSnapshot, options?: ClientCompletenessScoreOptions) {
  const rules = getRequiredRules(snapshot.type);
  if (!rules.length) return 100;

  const filled = rules.filter((rule) => isPresent(snapshot[rule.key] as string | null)).length;
  const profileScore = Math.round((filled / rules.length) * 100);
  const documentsScore = getDocumentsCompletenessScore(options?.documents);
  if (documentsScore === null) return profileScore;

  const weights = resolveScoreWeights(options);
  return Math.round(profileScore * weights.profile + documentsScore * weights.documents);
}

export function isClientIncomplete(snapshot: ClientCompletenessSnapshot, options?: ClientCompletenessScoreOptions): boolean {
  return getClientCompletenessScore(snapshot, options) < 100;
}

export function buildIncompleteWhere(type: ClientProfileType): Prisma.ClientProfileWhereInput {
  if (type === ClientProfileType.PERSON) {
    return {
      type: ClientProfileType.PERSON,
      OR: [
        { firstName: null },
        { middleName: null },
        { lastName: null },
        { secondLastName: null },
        { dpi: null },
        { phone: null }
      ]
    };
  }

  if (type === ClientProfileType.COMPANY) {
    return {
      type: ClientProfileType.COMPANY,
      OR: [
        { companyName: null },
        { tradeName: null },
        { nit: null },
        { address: null },
        { city: null },
        { department: null }
      ]
    };
  }

  if (type === ClientProfileType.INSURER) {
    return {
      type: ClientProfileType.INSURER,
      OR: [
        { companyName: null },
        { nit: null }
      ]
    };
  }

  return {
    type: ClientProfileType.INSTITUTION,
    OR: [
      { companyName: null },
      { institutionTypeId: null },
      { address: null },
      { city: null },
      { department: null }
    ]
  };
}

export function buildAnyIncompleteWhere(): Prisma.ClientProfileWhereInput {
  return {
    OR: [
      buildIncompleteWhere(ClientProfileType.PERSON),
      buildIncompleteWhere(ClientProfileType.COMPANY),
      buildIncompleteWhere(ClientProfileType.INSURER),
      buildIncompleteWhere(ClientProfileType.INSTITUTION)
    ]
  };
}
