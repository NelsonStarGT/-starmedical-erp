# AFTER · npm audit remediation (2026-02-24)

## Scope completed
- Baseline evidence captured (full/prod audit + package snapshot + quality gates).
- Quick wins in production:
  - `jspdf` upgraded to `^4.2.0`.
  - `markdown-it` pinned via override to `14.1.1`.
- Excel migration off ERP runtime:
  - All `exceljs` usages removed from `app/`, `lib/`, `components/`.
  - Excel operations delegated to `processing-service` through `lib/processing-service/excel.ts`.
  - `exceljs` removed from root dependencies.
- Processing-service storage organization hardened:
  - Artifact keys moved to `tenants/{tenantId}/processing/{jobType}/YYYY/MM/DD/{jobId}/output/...`.
  - `manifest.json` emitted in `.../logs/manifest.json` with input/output checksums and limits applied.

## Commands executed
```bash
npm audit --json > docs/security/audit/2026-02-24/npm-audit.full.after.json
npm audit --omit=dev --json > docs/security/audit/2026-02-24/npm-audit.omit-dev.after.json
npm ls exceljs
npm run typecheck
npm run lint
npm run test
npm run build
npm run smoke
```

## Before vs After
- Full audit:
  - before: **24** (22 high, 2 moderate)
  - after: **15** (14 high, 1 moderate)
- Production audit (`--omit=dev`):
  - before: **10** (9 high, 1 moderate)
  - after: **0**

## Remaining vulnerabilities (full audit only, dev/tooling)
- `eslint`, `eslint-config-next`, `typescript-eslint` chain and transitive `minimatch`/`ajv`.
- Impact:
  - dev/CI toolchain, not production runtime path.
- Rationale for pending:
  - remediación total empuja majors en ESLint ecosystem y puede romper reglas/CI.
  - se deja como plan controlado en PR separado de tooling.

## Quality gates after changes
- `npm run typecheck`: ✅ pass
- `npm run lint`: ✅ pass
- `npm run test`: ✅ pass
- `npm run build`: ✅ pass
- `npm run smoke`: ✅ pass

## Key validation evidence
- `npm ls exceljs` => `(empty)`.
- `npm audit --omit=dev` => `0` vulnerabilities.

## Notes
- No se usó `npm audit fix --force`.
- Cambios de seguridad aplicados en pasos revertibles y con evidencia versionada.
