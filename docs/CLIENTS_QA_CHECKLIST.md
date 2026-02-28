# CLIENTS QA CHECKLIST (10 min)

## 1) Acceso y permisos
1. Iniciar sesión con rol sin `CLIENTS_REPORTS_VIEW`.
2. Intentar abrir `/admin/clientes/reportes`.
3. Validar acceso restringido (SSR/API coherente).

## 2) Reportes filtros + export
1. Abrir `/admin/clientes/reportes` con rol autorizado.
2. Aplicar filtros (`q`, país, rango, canal, detalle, solo referidos).
3. Exportar CSV/XLSX/PDF y validar que respeta exactamente filtros activos.
4. Probar selección de secciones sin datos: modal debe bloquear descarga y mostrar mensaje.

## 3) Export compacto vs separado
1. En modal export, dejar compactación ON (PDF/XLSX) y exportar.
2. Repetir con compactación OFF.
3. Confirmar diferencia:
   - PDF: compacto vs sección por página.
   - XLSX: resumen vs hojas separadas.
4. Confirmar excepción: sección geo siempre separada.

## 4) Integridad visible en listas
1. Abrir `/admin/clientes/lista`.
2. Buscar clientes con datos incompletos.
3. Validar badges `Falta ubicación` / `Falta contacto` cuando aplique.
4. Repetir en panel `Listado de clientes` dentro de `/admin/clientes/reportes`.

## 5) Rutas bulk enterprise
1. Probar `/api/clientes/importar` sin permiso analyze -> 403.
2. Probar `/api/clientes/plantilla-excel` sin permiso template -> 403.
3. Probar rutas con permisos correctos -> respuesta 200.

## 6) Data integrity command
1. Ejecutar `pnpm clients:audit:data`.
2. Confirmar generación/actualización de `docs/CLIENTS_DATA_INTEGRITY_REPORT.md`.
3. Revisar conteos y duplicados potenciales.

## 7) UX responsive rápido
1. En reportes, viewport móvil/tablet: tablas no deben romper layout (scroll horizontal disponible).
2. Abrir popover de paneles: debe quedar visible sin desbordes.
3. Revisar headers compactos: subtítulos legibles sin truncado excesivo.
