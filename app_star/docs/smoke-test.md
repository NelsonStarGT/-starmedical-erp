# Smoke Test – RRHH / Marcaje

- Fecha: 2026-01-20 22:43 UTC
- Estado general: NOT RUN (validación manual pendiente en entorno real desde CLI)
- Nota: Migración aplicada y status OK. Se ejecutaron `npm test -- --runInBand`, `npm run lint` y `npm run build` en esta rama; falta recorrer flujos en UI real.

## Checklist

- [ ] RRHH → Empleados
  - /hr/employees (Activos) carga
  - /hr/employees/pending muestra pendientes (o empty state)
  - /hr/employees/archived carga; filtros año/mes no se quedan cargando
  - Intentar eliminar un pendiente muestra razones estructuradas + CTA archivar
  - Archivar un empleado y verlo en Archivados

- [ ] RRHH → Asistencia
  - /hr/attendance Registros: buscador por Nombre/DPI/Código/Biométrico funciona; export CSV respeta filtros
  - Ingreso manual: entrada duplicada → 409; salida sin entrada → 409

- [ ] Marcaje (import/procesar)
  - Subir archivo ZKTime (Excel/CSV) en tab Marcaje
  - Import muestra inserted/duplicates/errors
  - Procesar pendientes mueve NEW → PROCESSED/IGNORED/FAILED y genera AttendanceRecord

- [ ] Tokens
  - /marcaje/tokens carga lista
  - Crear token, abrir link, revocar token

- [ ] Logo upload
  - Ajustes → Identidad (logo): subir PNG 256x256 sin errores y se renderiza

## Comandos ejecutados

- `npx prisma migrate deploy`
- `npx prisma migrate status`
- `npm test -- --runInBand`
- `npm run lint`
- `npm run build`
