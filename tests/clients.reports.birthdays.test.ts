import test from "node:test";
import assert from "node:assert/strict";
import { ClientPhoneCategory, ClientProfileType } from "@prisma/client";
import { projectClientsBirthdaysRows } from "@/lib/clients/reports.service";

function baseRow(overrides: Partial<Parameters<typeof projectClientsBirthdaysRows>[0][number]>) {
  return {
    id: "client-1",
    type: ClientProfileType.PERSON,
    firstName: "Ana",
    middleName: null,
    thirdName: null,
    lastName: "Lopez",
    secondLastName: null,
    thirdLastName: null,
    companyName: null,
    tradeName: null,
    birthDate: new Date("1998-03-05T00:00:00.000Z"),
    clientPhones: [],
    clientEmails: [],
    ...overrides
  };
}

test("cumpleaños por mes filtra correctamente", () => {
  const result = projectClientsBirthdaysRows(
    [
      baseRow({ id: "a", birthDate: new Date("1998-03-05T00:00:00.000Z") }),
      baseRow({ id: "b", birthDate: new Date("1998-02-08T00:00:00.000Z") }),
      baseRow({ id: "c", birthDate: new Date("1998-03-22T00:00:00.000Z") })
    ],
    {
      month: 3,
      referenceDate: new Date("2026-02-27T00:00:00.000Z")
    }
  );

  assert.equal(result.items.length, 2);
  assert.deepEqual(
    result.items.map((item) => item.id).sort(),
    ["a", "c"]
  );
});

test("cumpleaños por próximos días usa ventana inclusiva", () => {
  const result = projectClientsBirthdaysRows(
    [
      baseRow({ id: "today", birthDate: new Date("1990-02-27T00:00:00.000Z") }),
      baseRow({ id: "inside", birthDate: new Date("1990-03-03T00:00:00.000Z") }),
      baseRow({ id: "outside", birthDate: new Date("1990-03-10T00:00:00.000Z") })
    ],
    {
      nextDays: 7,
      referenceDate: new Date("2026-02-27T00:00:00.000Z")
    }
  );

  assert.deepEqual(
    result.items.map((item) => item.id),
    ["today", "inside"]
  );
});

test("cumpleaños genera links de contacto (tel/wa/mail)", () => {
  const result = projectClientsBirthdaysRows(
    [
      baseRow({
        id: "contact",
        clientPhones: [
          {
            number: "5511 2233",
            e164: "+50255112233",
            countryCode: "+502",
            category: ClientPhoneCategory.MOBILE,
            canWhatsapp: true,
            isPrimary: true,
            isActive: true
          }
        ],
        clientEmails: [
          {
            valueRaw: "ANA@MAIL.COM",
            valueNormalized: "ana@mail.com",
            isPrimary: true,
            isActive: true
          }
        ]
      })
    ],
    {
      referenceDate: new Date("2026-02-27T00:00:00.000Z")
    }
  );

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.phoneHref, "tel:+50255112233");
  assert.equal(result.items[0]?.whatsappHref, "https://wa.me/50255112233");
  assert.equal(result.items[0]?.emailHref, "mailto:ana@mail.com");
});
