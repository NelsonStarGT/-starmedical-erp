import { test } from "node:test";
import assert from "node:assert/strict";
import type { SessionUser } from "../lib/auth";
import { canWriteAgenda, enforceAgendaBranchScope, type AgendaMutationSnapshot } from "../lib/agenda/access";

const baseSnapshot: AgendaMutationSnapshot = {
  fecha: "2026-02-05",
  horaInicio: "09:00",
  horaFin: "09:30",
  pacienteId: "p-1",
  medicoId: "m-1",
  sucursalId: "s1",
  salaId: "room-1",
  tipoCitaId: "t-1",
  estado: "Programada",
  estadoPago: "Pendiente",
  empresaId: null,
  notas: null
};

function makeUser(input: Partial<SessionUser>): SessionUser {
  return {
    id: input.id || "u-1",
    email: input.email || "user@test.local",
    roles: input.roles || [],
    permissions: input.permissions || [],
    deniedPermissions: input.deniedPermissions || [],
    branchId: input.branchId ?? null,
    legalEntityId: input.legalEntityId ?? null,
    name: input.name || null
  };
}

test("usuario autenticado sin rol operativo solo puede lectura", () => {
  const user = makeUser({ roles: ["VIEWER"] });
  const create = canWriteAgenda(user, "POST", { after: baseSnapshot });
  assert.equal(create.allowed, false);
});

test("recepcion puede crear y reprogramar, pero no marcar atendida", () => {
  const reception = makeUser({ roles: ["RECEPTION"] });
  const create = canWriteAgenda(reception, "POST", { after: baseSnapshot });
  assert.equal(create.allowed, true);

  const reschedule = canWriteAgenda(reception, "PUT", {
    before: baseSnapshot,
    after: { ...baseSnapshot, horaInicio: "10:00", horaFin: "10:30" }
  });
  assert.equal(reschedule.allowed, true);

  const attended = canWriteAgenda(reception, "PUT", {
    before: baseSnapshot,
    after: { ...baseSnapshot, estado: "Atendida" }
  });
  assert.equal(attended.allowed, false);
});

test("enfermeria puede marcar en sala, no puede reprogramar", () => {
  const nurse = makeUser({ roles: ["ENFERMERIA"] });

  const enSala = canWriteAgenda(nurse, "PATCH", {
    before: baseSnapshot,
    after: { ...baseSnapshot, estado: "En sala" }
  });
  assert.equal(enSala.allowed, true);

  const reschedule = canWriteAgenda(nurse, "PATCH", {
    before: baseSnapshot,
    after: { ...baseSnapshot, fecha: "2026-02-06" }
  });
  assert.equal(reschedule.allowed, false);
});

test("medico puede marcar atendida y notas clinicas", () => {
  const doctor = makeUser({ roles: ["MEDICO"] });

  const attended = canWriteAgenda(doctor, "PATCH", {
    before: baseSnapshot,
    after: { ...baseSnapshot, estado: "Atendida" }
  });
  assert.equal(attended.allowed, true);

  const notes = canWriteAgenda(doctor, "PATCH", {
    before: baseSnapshot,
    after: { ...baseSnapshot, notas: "Paciente estable." }
  });
  assert.equal(notes.allowed, true);
});

test("coordinacion puede eliminar citas", () => {
  const coordination = makeUser({ roles: ["SUPERVISOR"] });
  const result = canWriteAgenda(coordination, "DELETE", { before: baseSnapshot });
  assert.equal(result.allowed, true);
});

test("scope por sede bloquea escrituras fuera de branchId del usuario", () => {
  const user = makeUser({ roles: ["RECEPTION"], branchId: "s1" });

  const allowed = enforceAgendaBranchScope(user, "s1");
  assert.equal(allowed.allowed, true);
  assert.equal(allowed.effectiveBranchId, "s1");

  const denied = enforceAgendaBranchScope(user, "s2");
  assert.equal(denied.allowed, false);
});
