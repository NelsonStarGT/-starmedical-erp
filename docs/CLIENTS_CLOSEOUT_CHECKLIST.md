# Clients Module Closeout Checklist

## Objetivo
Validar en menos de 10 minutos que el módulo de Clientes quedó estable, con filtro de país consistente, acciones overlay funcionales y export/reportes listos para operación.

## Gates obligatorios (automatizados)
Ejecutar en este orden:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:tenant:isolation
pnpm clients:audit:data
```

## QA manual rápido (10 min)
1. Iniciar sesión como usuario admin del tenant.
2. Ir a `/admin/clientes/lista` y seleccionar un país en el filtro superior.
3. Verificar que el filtro impacta resultados en:
   - `/admin/clientes/lista`
   - `/admin/clientes/personas`
   - `/admin/clientes/empresas`
   - `/admin/clientes/instituciones`
   - `/admin/clientes/aseguradoras`
4. Confirmar que en `/admin/clientes` (Dashboard) y `/admin/clientes/configuracion` NO aparece el filtro.
5. Abrir menú de acciones en filas de Empresas/Instituciones/Aseguradoras/Personas y confirmar:
   - se ve sobre la tabla sin clipping
   - no requiere mini-scroll interno del contenedor
   - cierra al hacer click fuera o `Esc`
6. En Reportes (`/admin/clientes/reportes`), validar que el país activo afecta:
   - resumen
   - lista
   - geo
   - cumpleaños
7. Probar exportación (CSV/XLSX/PDF/ZIP) y confirmar que respeta el país activo.
8. Verificar respuesta esperada “Sin datos para filtros actuales” (422) cuando el filtro deja dataset vacío.
9. Validar que RBAC se mantiene:
   - usuario sin permisos de reportes/export no accede
   - no hay fuga de datos cross-tenant
10. Registrar evidencia mínima:
   - capturas de Lista filtrada y Reportes filtrados
   - salida de comandos de gates.

## Criterio de cierre
- Todos los gates en verde.
- Filtro país consistente y visible solo en vistas definidas.
- Menú de acciones overlay sin clipping en listados.
- Export/reportes preparados para operación y auditoría de datos completada.

