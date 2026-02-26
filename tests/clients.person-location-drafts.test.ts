import assert from "node:assert/strict";
import test from "node:test";
import { ClientLocationType } from "@prisma/client";
import { buildBirthPlaceLabel, buildPersonLocationDrafts } from "@/lib/clients/personLocation";

test("crea ubicación HOME principal con dirección de vivienda en addressLine1", () => {
  const result = buildPersonLocationDrafts({
    addressGeneral: "Zona 10, Ciudad de Guatemala",
    hasGeoContext: true,
    geoCountryName: "Guatemala"
  });

  assert.equal(result.length, 1);
  assert.equal(result[0]?.type, ClientLocationType.HOME);
  assert.equal(result[0]?.address, "Zona 10, Ciudad de Guatemala");
  assert.equal(result[0]?.addressLine1, "Zona 10, Ciudad de Guatemala");
  assert.equal(result[0]?.isPrimary, true);
});

test("si no hay dirección de texto, usa ubicación estructurada y deja addressLine1 null", () => {
  const result = buildPersonLocationDrafts({
    hasGeoContext: true,
    geoAdmin2Name: "Palín",
    geoAdmin1Name: "Escuintla",
    geoCountryName: "Guatemala"
  });

  assert.equal(result.length, 1);
  assert.equal(result[0]?.type, ClientLocationType.HOME);
  assert.equal(result[0]?.address, "Palín, Escuintla, Guatemala");
  assert.equal(result[0]?.addressLine1, null);
});

test("crea ubicación WORK cuando existe contexto laboral aunque no haya dirección de texto", () => {
  const result = buildPersonLocationDrafts({
    hasGeoContext: true,
    geoCountryName: "Guatemala",
    workHasGeoContext: true,
    workGeoAdmin2Name: "Guatemala",
    workGeoAdmin1Name: "Guatemala",
    workGeoCountryName: "Guatemala"
  });

  assert.equal(result.length, 2);
  assert.equal(result[1]?.type, ClientLocationType.WORK);
  assert.equal(result[1]?.address, "Guatemala, Guatemala, Guatemala");
  assert.equal(result[1]?.addressLine1, null);
});

test("buildBirthPlaceLabel combina ciudad/poblado con municipio/departamento/país", () => {
  const result = buildBirthPlaceLabel({
    cityOrTown: "Aldea El Carmen",
    geoAdmin2Name: "Palín",
    geoAdmin1Name: "Escuintla",
    geoCountryName: "Guatemala"
  });

  assert.equal(result, "Aldea El Carmen, Palín, Escuintla, Guatemala");
});

test("buildBirthPlaceLabel evita duplicados y retorna null cuando no hay datos", () => {
  const duplicated = buildBirthPlaceLabel({
    cityOrTown: "Palín",
    geoAdmin2Name: "Palín",
    geoFreeState: "Escuintla",
    geoCountryName: "Guatemala"
  });
  assert.equal(duplicated, "Palín, Escuintla, Guatemala");

  const empty = buildBirthPlaceLabel({});
  assert.equal(empty, null);
});
