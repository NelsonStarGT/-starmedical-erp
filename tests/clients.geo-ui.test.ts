import test from "node:test";
import assert from "node:assert/strict";
import {
  isGeoAuthErrorLike,
  mapGeoLoadErrorMessage,
  sanitizeGeoDivisionDisplayName
} from "@/lib/clients/geoUi";

test("detecta mensajes de autenticacion en carga GEO", () => {
  assert.equal(isGeoAuthErrorLike("No autenticado"), true);
  assert.equal(isGeoAuthErrorLike("No autorizado."), true);
  assert.equal(isGeoAuthErrorLike("Parámetro countryId requerido."), false);
});

test("normaliza mensaje de error GEO para auth", () => {
  assert.equal(
    mapGeoLoadErrorMessage("No autenticado", "No se pudo cargar"),
    "No se pudo cargar geografia. Verifica tu sesion y recarga la pagina."
  );
  assert.equal(mapGeoLoadErrorMessage("Parámetro inválido", "fallback"), "Parámetro inválido");
});

test("limpia sufijo de codigo en labels de divisiones", () => {
  assert.equal(sanitizeGeoDivisionDisplayName("Guatemala 07", "07"), "Guatemala");
  assert.equal(sanitizeGeoDivisionDisplayName("Amatitlan 114", "114"), "Amatitlan");
  assert.equal(sanitizeGeoDivisionDisplayName("Escuintla", "05"), "Escuintla");
});
