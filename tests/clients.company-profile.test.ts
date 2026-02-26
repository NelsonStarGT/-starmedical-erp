import test from "node:test";
import assert from "node:assert/strict";
import { ECONOMIC_ACTIVITY_OTHER_ID, resolveEconomicActivitySelection } from "@/lib/catalogs/economicActivities";
import {
  buildCompanyContactPersonSummary,
  buildCompanyPbxExtensionPreview,
  canUsePbxExtensionMode,
  getPrimaryPbxChannel,
  hasAtLeastOneCompanyChannel,
  normalizeCompanyGeneralChannels,
  normalizeCompanyPersonContacts,
  applyCompanyPersonLinkedUser,
  reassignCompanyChannelOwnersOnPersonRemoval,
  validateCompanyContactPeople,
  validateCompanyContactPeopleDrafts,
  validateCompanyGeneralChannelDrafts,
  validateCompanyGeneralChannels,
  validateEconomicActivityOtherNote,
  resolveCompanyGeneralChannelLabel
} from "@/lib/clients/companyProfile";

test("actividad económica OTRO exige nota <=150", () => {
  const missing = validateEconomicActivityOtherNote({
    activityId: ECONOMIC_ACTIVITY_OTHER_ID,
    otherNote: ""
  });
  assert.equal(missing.ok, false);
  if (missing.ok) return;
  assert.match(missing.error, /debes agregar una nota/i);

  const valid = validateEconomicActivityOtherNote({
    activityId: ECONOMIC_ACTIVITY_OTHER_ID,
    otherNote: "Servicios especializados para sector local"
  });
  assert.equal(valid.ok, true);
  if (!valid.ok) return;
  assert.equal(valid.normalizedNote, "Servicios especializados para sector local");
});

test("actividad económica legacy texto libre cae a 'otro' sin perder texto", () => {
  const resolved = resolveEconomicActivitySelection("Fabricación artesanal local");
  assert.equal(resolved.id, ECONOMIC_ACTIVITY_OTHER_ID);
  assert.equal(resolved.legacyText, "Fabricación artesanal local");
});

test("canales generales mantienen un principal por tipo", () => {
  const channels = normalizeCompanyGeneralChannels([
    { kind: "PHONE", label: "Central", value: "5550-0000", isPrimary: false, isActive: true },
    { kind: "PHONE", label: "Recepción", value: "5550-1111", isPrimary: false, isActive: true },
    { kind: "EMAIL", label: "Facturación", value: "facturacion@acme.com", isPrimary: false, isActive: true },
    { kind: "WHATSAPP", label: "Soporte", value: "5550-2222", isPrimary: true, isActive: true }
  ]);

  assert.equal(channels.length, 4);
  assert.equal(validateCompanyGeneralChannels(channels), null);
  assert.equal(channels.filter((row) => row.kind === "PHONE" && row.isPrimary).length, 1);
  assert.equal(channels.filter((row) => row.kind === "EMAIL" && row.isPrimary).length, 1);
  assert.equal(channels.filter((row) => row.kind === "WHATSAPP" && row.isPrimary).length, 1);
});

test("C1 permite cambiar principal de teléfonos y mantiene uno único", () => {
  const channels = normalizeCompanyGeneralChannels([
    { kind: "PHONE", labelPreset: "pbx", value: "55500000", isPrimary: false, isActive: true },
    { kind: "PHONE", labelPreset: "recepcion", value: "55501111", isPrimary: true, isActive: true }
  ]);

  assert.equal(channels.length, 2);
  assert.equal(channels.filter((row) => row.kind === "PHONE" && row.isPrimary).length, 1);
  assert.equal(channels[0]?.isPrimary, true);
  assert.equal(channels[1]?.isPrimary, false);
});

test("C1 etiqueta preset otro exige detalle <=60", () => {
  const missing = validateCompanyGeneralChannelDrafts([
    {
      kind: "PHONE",
      labelPreset: "otro",
      labelOther: "",
      value: "55501234",
      isPrimary: true,
      isActive: true
    }
  ]);
  assert.match(missing ?? "", /debes especificar/i);

  const tooLong = validateCompanyGeneralChannelDrafts([
    {
      kind: "PHONE",
      labelPreset: "otro",
      labelOther: "x".repeat(61),
      value: "55501234",
      isPrimary: true,
      isActive: true
    }
  ]);
  assert.match(tooLong ?? "", /60 caracteres/i);

  const valid = validateCompanyGeneralChannelDrafts([
    {
      kind: "PHONE",
      labelPreset: "pbx",
      value: "55500000",
      isPrimary: true,
      isActive: true
    },
    {
      kind: "PHONE",
      labelPreset: "otro",
      labelOther: "Mesa de ayuda",
      value: "55501234",
      isPrimary: false,
      isActive: true
    }
  ]);
  assert.equal(valid, null);
});

test("label legacy libre se mapea a preset otro sin perder texto", () => {
  const resolved = resolveCompanyGeneralChannelLabel({
    label: "Mesa de ayuda regional"
  });
  assert.equal(resolved.labelPreset, "otro");
  assert.equal(resolved.labelOther, "Mesa de ayuda regional");
  assert.equal(resolved.label, "Mesa de ayuda regional");
});

test("categoría PBX legacy se mapea a slug de catálogo dinámico", () => {
  const resolved = resolveCompanyGeneralChannelLabel(
    {
      labelPreset: "pbx",
      pbxAreaPreset: "Central"
    },
    {
      pbxCategoryOptions: [
        { value: "central", label: "Central telefónica", isActive: true },
        { value: "ventas", label: "Ventas", isActive: true }
      ]
    }
  );
  assert.equal(resolved.labelPreset, "pbx");
  assert.equal(resolved.pbxAreaPreset, "central");
  assert.equal(resolved.label, "PBX Central telefónica");
});

test("C2 persona con dos correos conserva un único principal", () => {
  const contacts = normalizeCompanyPersonContacts([
    {
      firstName: "Laura",
      lastName: "Díaz",
      department: "rrhh",
      emails: [
        { value: "laura.personal@acme.com", isPrimary: false, isActive: true, labelPreset: "personal" },
        { value: "laura.work@acme.com", isPrimary: true, isActive: true, labelPreset: "trabajo" }
      ]
    }
  ]);

  assert.equal(contacts.length, 1);
  assert.equal(contacts[0]?.emails.length, 2);
  assert.equal(contacts[0]?.emails.filter((row) => row.isPrimary).length, 1);
  assert.equal(contacts[0]?.emails[1]?.isPrimary, true);
});

test("regla extensión: WhatsApp limpia extensión en C2", () => {
  const contacts = normalizeCompanyPersonContacts([
    {
      firstName: "Mario",
      lastName: "López",
      department: "operaciones",
      phones: [
        {
          value: "55501234",
          extension: "201",
          phoneType: "whatsapp",
          isPrimary: true,
          isActive: true
        }
      ]
    }
  ]);

  assert.equal(contacts.length, 1);
  assert.equal(contacts[0]?.phones.length, 1);
  assert.equal(contacts[0]?.phones[0]?.phoneType, "whatsapp");
  assert.equal(contacts[0]?.phones[0]?.extension, null);
  assert.equal(contacts[0]?.phones[0]?.isWhatsApp, true);
  assert.equal(contacts[0]?.phones[0]?.canWhatsApp, true);
});

test("draft C2 exige departamento y cargo con detalle cuando es Otro", () => {
  const invalid = validateCompanyContactPeopleDrafts([
    {
      firstName: "Sofía",
      lastName: "Morales",
      departmentId: "otro",
      departmentOther: "",
      jobTitleId: "otro",
      jobTitleOther: "",
      phones: [{ value: "55501234", isPrimary: true, isActive: true }]
    }
  ]);
  assert.match(invalid ?? "", /especifica el área\/departamento/i);
});

test("link/unlink user conserva datos del contacto", () => {
  const base = {
    firstName: "Ana",
    lastName: "Pérez",
    departmentId: "rrhh",
    jobTitleId: "coordinador_rrhh",
    linkedUserId: null,
    linkedUserName: null,
    linkedUserEmail: null
  };
  const linked = applyCompanyPersonLinkedUser(base, {
    id: "usr_1",
    name: "Ana Pérez",
    email: "ana@starmedical.com"
  });
  assert.equal(linked.firstName, "Ana");
  assert.equal(linked.departmentId, "rrhh");
  assert.equal(linked.linkedUserId, "usr_1");

  const unlinked = applyCompanyPersonLinkedUser(linked, null);
  assert.equal(unlinked.firstName, "Ana");
  assert.equal(unlinked.departmentId, "rrhh");
  assert.equal(unlinked.linkedUserId, null);
});

test("EXTENSION_PBX sin PBX definido en C1/C0 devuelve error en drafts", () => {
  const error = validateCompanyContactPeopleDrafts(
    [
      {
        firstName: "Rosa",
        lastName: "Méndez",
        departmentId: "rrhh",
        jobTitleId: "coordinador_rrhh",
        phones: [
          {
            mode: "EXTENSION_PBX",
            extension: "321",
            isPrimary: true,
            isActive: true
          }
        ]
      }
    ],
    {
      generalChannels: [
        {
          kind: "PHONE",
          labelPreset: "pbx",
          value: "",
          isPrimary: true,
          isActive: true
        }
      ]
    }
  );

  assert.match(error ?? "", /(define PBX principal para usar extensiones|requiere seleccionar PBX)/i);
});

test("preview PBX + extensión construye formato esperado", () => {
  const preview = buildCompanyPbxExtensionPreview({
    pbxLabel: "Central",
    pbxCountryCode: "+502",
    pbxValue: "5550-0000",
    extension: "321"
  });
  assert.equal(preview, "PBX Central +502 55500000 + ext 321");
});

test("modo EXTENSION_PBX usa PBX principal normalizado para resolver teléfono", () => {
  const generalChannels = normalizeCompanyGeneralChannels([
    {
      id: "pbx_main",
      kind: "PHONE",
      labelPreset: "pbx",
      value: "5550-0000",
      isPrimary: true,
      isActive: true
    }
  ]);
  const pbx = getPrimaryPbxChannel(generalChannels);
  assert.ok(pbx);

  const contacts = normalizeCompanyPersonContacts(
    [
      {
        firstName: "Sonia",
        lastName: "López",
        departmentId: "compras",
        jobTitleId: "jefe_compras",
        phones: [
          {
            mode: "EXTENSION_PBX",
            extension: "404",
            isPrimary: true,
            isActive: true
          }
        ]
      }
    ],
    { pbxChannels: generalChannels }
  );

  assert.equal(contacts[0]?.phones[0]?.mode, "EXTENSION_PBX");
  assert.equal(contacts[0]?.phones[0]?.value, "55500000");
  assert.equal(contacts[0]?.phones[0]?.extension, "404");
  assert.equal(contacts[0]?.phones[0]?.pbxChannelId, "pbx_main");
  assert.equal(contacts[0]?.phones[0]?.canWhatsApp, false);
});

test("sin PBX con número se deshabilita modo EXTENSION_PBX", () => {
  assert.equal(
    canUsePbxExtensionMode({
      generalChannels: [{ kind: "PHONE", labelPreset: "pbx", value: "", isPrimary: true, isActive: true }]
    }),
    false
  );
  assert.equal(
    canUsePbxExtensionMode({
      generalChannels: [{ kind: "PHONE", labelPreset: "pbx", value: "55500000", isPrimary: true, isActive: true }]
    }),
    true
  );
});

test("resumen de persona incluye tel/email principal y PBX+ext", () => {
  const channels = normalizeCompanyGeneralChannels([
    {
      id: "pbx_1",
      kind: "PHONE",
      labelPreset: "pbx",
      pbxAreaPreset: "ventas",
      countryCode: "+502",
      value: "5550-0000",
      isPrimary: true,
      isActive: true
    }
  ]);
  const contacts = normalizeCompanyPersonContacts(
    [
      {
        firstName: "Sonia",
        lastName: "López",
        departmentId: "compras",
        jobTitleId: "jefe_compras",
        phones: [{ mode: "EXTENSION_PBX", pbxChannelId: "pbx_1", extension: "404", isPrimary: true, isActive: true }],
        emails: [{ value: "sonia@acme.com", isPrimary: true, isActive: true }]
      }
    ],
    { pbxChannels: channels }
  );
  const summary = buildCompanyContactPersonSummary(contacts[0]!, { pbxChannels: channels });
  assert.match(summary.headline, /Sonia López/);
  assert.ok(summary.chips.some((chip) => chip.includes("sonia@acme.com")));
  assert.ok(summary.chips.some((chip) => chip.includes("PBX")));
  assert.ok(summary.chips.some((chip) => chip.includes("ext 404")));
});

test("C1 exige un único PBX principal cuando hay teléfonos generales cargados", () => {
  const error = validateCompanyGeneralChannelDrafts([
    {
      kind: "PHONE",
      labelPreset: "recepcion",
      value: "55501234",
      isPrimary: true,
      isActive: true
    },
    {
      kind: "PHONE",
      labelPreset: "facturacion",
      value: "55504321",
      isPrimary: false,
      isActive: true
    }
  ]);

  assert.match(error ?? "", /único PBX (principal|por defecto)/i);
});

test("C1 canal asignado a persona requiere owner válido", () => {
  const missingOwner = validateCompanyGeneralChannelDrafts(
    [
      {
        id: "ch_1",
        kind: "EMAIL",
        ownerType: "PERSON",
        ownerPersonId: null,
        labelPreset: "facturacion",
        value: "facturacion@acme.com",
        isPrimary: true,
        isActive: true
      }
    ],
    {
      contactPeople: [{ id: "p_1", firstName: "Ana", lastName: "Pérez", departmentId: "rrhh", jobTitleId: "coordinador_rrhh" }]
    }
  );
  assert.match(missingOwner ?? "", /selecciona la persona propietaria/i);

  const unknownOwner = validateCompanyGeneralChannelDrafts(
    [
      {
        id: "ch_1",
        kind: "EMAIL",
        ownerType: "PERSON",
        ownerPersonId: "p_x",
        labelPreset: "facturacion",
        value: "facturacion@acme.com",
        isPrimary: true,
        isActive: true
      }
    ],
    {
      contactPeople: [{ id: "p_1", firstName: "Ana", lastName: "Pérez", departmentId: "rrhh", jobTitleId: "coordinador_rrhh" }]
    }
  );
  assert.match(unknownOwner ?? "", /persona asignada no existe/i);
});

test("al eliminar persona, canales asignados se reasignan a Empresa", () => {
  const next = reassignCompanyChannelOwnersOnPersonRemoval(
    [
      {
        id: "ch_1",
        kind: "EMAIL",
        ownerType: "PERSON",
        ownerPersonId: "p_1"
      },
      {
        id: "ch_2",
        kind: "PHONE",
        ownerType: "COMPANY",
        ownerPersonId: null
      }
    ],
    ["p_1"]
  );

  assert.equal(next[0]?.ownerType, "COMPANY");
  assert.equal(next[0]?.ownerPersonId, null);
  assert.equal(next[1]?.ownerType, "COMPANY");
});

test("personas de contacto requieren nombre/apellido/área y principal por tipo", () => {
  const contacts = normalizeCompanyPersonContacts([
    {
      firstName: "Ana",
      lastName: "Pérez",
      department: "finanzas",
      role: "Jefe de facturación",
      phones: [
        { value: "55501234", isPrimary: true, isActive: true },
        { value: "55504321", isPrimary: false, isActive: true }
      ],
      emails: [{ value: "ana.perez@acme.com", isPrimary: false, isActive: true }]
    }
  ]);

  assert.equal(validateCompanyContactPeople(contacts), null);
  assert.equal(hasAtLeastOneCompanyChannel({ generalChannels: [], contactPeople: contacts }), true);

  const invalid = validateCompanyContactPeople([
    {
      firstName: "Luis",
      lastName: "",
      departmentId: "compras",
      departmentOther: null,
      jobTitleId: "analista_ti",
      jobTitleOther: null,
      employmentStatus: "ACTIVE",
      linkedUserId: null,
      linkedUserName: null,
      linkedUserEmail: null,
      department: "compras",
      role: "Analista",
      isAreaPrimary: false,
      notes: null,
      phones: [],
      emails: []
    }
  ]);
  assert.match(invalid ?? "", /apellido requerido/i);
});
