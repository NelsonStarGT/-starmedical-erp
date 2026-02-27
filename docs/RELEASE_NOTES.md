# Release Notes

## 2026-02-27 - Clientes v1 operativo (Camino A)

### Highlights

- A1: correlativos por tipo reforzados en flujos de Recepcion + backfill idempotente con `dry-run`.
- A2: ramos de aseguradoras validados como catalogo operativo tenant-scoped.
- A3: afiliaciones con `PENDING_VERIFY`, `lastVerifiedAt`, `notes`, y recordatorio en check-in.
- A4: vista comercial validada (operativa/comercial + filtros de negocio).
- A5: reportes geo reales (pais/admin1/admin2) con separacion `catalog` vs `Manual entry`, plus agregados por canal/tipo/ramo.

### Integracion Recepcion

- Check-in busca por `clientCode` y expone pendientes de afiliacion.
- Check-in permite confirmar o desvincular afiliaciones sin salir del flujo.

### Calidad

- `pnpm lint` PASS
- `pnpm typecheck` PASS
- `pnpm test` PASS

