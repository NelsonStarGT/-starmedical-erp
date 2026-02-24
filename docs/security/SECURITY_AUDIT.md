# SECURITY_AUDIT

## Corte
- Fecha: 2026-02-24
- Evidencias: `docs/security/audit/2026-02-24/`

## Estado
- Producción (`npm audit --omit=dev`): **0 vulnerabilidades**.
- Full (`npm audit`): **15 vulnerabilidades** (dev/tooling).

## Mitigado
1. Cadena Excel en ERP (`exceljs -> archiver -> glob/minimatch`)
- Acción:
  - se migraron import/export XLSX del ERP a `processing-service`.
  - `exceljs` eliminado del `package.json` del ERP.
- Evidencia:
  - `npm ls exceljs` => vacío.
  - `npm audit --omit=dev` => 0.

2. `jspdf` high
- Acción: upgrade a `^4.2.0`.
- Evidencia:
  - `npm ls jspdf` muestra `4.2.0`.

3. `markdown-it` moderate
- Acción: `overrides.markdown-it=14.1.1`.
- Evidencia:
  - `npm ls markdown-it` muestra `14.1.1 overridden`.

## Pendiente (dev/tooling)
- Stack ESLint/TypeScript ESLint:
  - `eslint`, `eslint-config-next`, `typescript-eslint` y transitivos.
  - `ajv` (moderate) en cadena de tooling.
- Riesgo:
  - bajo para runtime de producción; impacto en desarrollo/CI.
- Racional:
  - remediación completa requiere actualización mayor del ecosistema lint.
  - se recomienda PR dedicado de tooling con baseline de reglas y fixes de lint.

## Decisiones de seguridad
- No se utilizó `npm audit fix --force`.
- Se priorizó producción primero (runtime del ERP).
- Se mantuvo hardening de processing-service con límites y trazabilidad:
  - límites de tamaño/filas/columnas/timeout por job.
  - storage path por tenant/jobType/fecha/jobId.
  - `manifest.json` con checksums e inputs/outputs.

## Criterio de aceptación
- Build/lint/typecheck/test/smoke en verde.
- Producción audit minimizado a 0.
