# BEFORE · npm audit baseline (2026-02-24)

## Environment snapshot
- See `docs/security/audit/2026-02-24/packages.snapshot.txt`

## Commands executed
```bash
npm audit --json > docs/security/audit/2026-02-24/npm-audit.full.json
npm audit --omit=dev --json > docs/security/audit/2026-02-24/npm-audit.omit-dev.json
npm run typecheck
npm run lint
npm run test
npm run build
```

## Vulnerability counts
- `npm audit` (full): **24 total**
  - high: 22
  - moderate: 2
- `npm audit --omit=dev` (production): **10 total**
  - high: 9
  - moderate: 1

## Production chain summary (top)
- `exceljs -> archiver -> archiver-utils -> glob -> minimatch`
- `exceljs -> archiver -> readdir-glob -> minimatch`
- `jspdf` (direct)
- `@tiptap/pm -> prosemirror-markdown -> markdown-it`

## Baseline quality gates
- `npm run typecheck`: ✅ pass (exit 0)
- `npm run lint`: ✅ pass (exit 0)
- `npm run test`: ✅ pass (223 pass, 0 fail, 1 skipped)
- `npm run build`: ✅ pass

## Logs
- `docs/security/audit/2026-02-24/typecheck.before.log`
- `docs/security/audit/2026-02-24/lint.before.log`
- `docs/security/audit/2026-02-24/test.before.log`
- `docs/security/audit/2026-02-24/build.before.log`
