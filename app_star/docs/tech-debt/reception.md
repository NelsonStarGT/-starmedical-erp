# Tech Debt · Recepción v2

## 1) Semántica legacy: `createWalkInVisit`

**Situación actual**
- La función `createWalkInVisit` en `lib/reception/visit.service.ts` crea el episodio operativo de recepción (Visit) y registra evento inicial.
- El nombre quedó heredado del flujo “walk-in”, pero en Recepción v2 el concepto operativo oficial es **Admisión** (nueva/existente/cita) y el mismo constructor se usa como base para esos ingresos.

**Deuda**
- `createWalkInVisit` debería renombrarse a un nombre clínico-operativo consistente, por ejemplo:
  - `createReceptionVisit` o
  - `createAdmissionVisit`

**Por qué NO se renombra ahora**
- Es un cambio transversal (import paths + referencias en acciones/servicios) con riesgo de romper flujos ya operativos y causar diffs grandes.
- Queremos mantener refactors **controlados** antes de avanzar con Diagnóstico/Laboratorio.

**Plan recomendado (cuando hacerlo)**
1) Mantener alias no disruptivo (`createReceptionVisit = createWalkInVisit`) para nueva semántica.
2) Migrar llamadas internas gradualmente a `createReceptionVisit`.
3) Marcar `createWalkInVisit` como `@deprecated` y removerlo en una ventana de hardening mayor (idealmente con cobertura de pruebas o un release mayor).

