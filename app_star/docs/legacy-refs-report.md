# Legacy References Report (Fase 4)

## Patrón: "/api/membresias" → canónico "/api/memberships"
- No referencias activas en UI: el código de páginas de Membresías (`app/admin/membresias/**`) ya usa `API_BASE = "/api/memberships"`.
- Legacy handlers conservados con `@deprecated` en:  
  - app/api/membresias/clientes/route.ts  
  - app/api/membresias/config/route.ts  
  - app/api/membresias/dashboard/route.ts  
  - app/api/membresias/contratos/route.ts  
  - app/api/membresias/contratos/[id]/route.ts  
  - app/api/membresias/contratos/[id]/pago/route.ts  
  - app/api/membresias/contratos/[id]/estado/route.ts  
  - app/api/membresias/planes/route.ts  
  - app/api/membresias/planes/[id]/estado/route.ts  
- Acción aplicada: solo comentarios `@deprecated`; UI ya apunta a canónico.

## Patrón: "/admin/health" → canónico "/diagnostics/health-checks"
- Restos encontrados: solo en documentación antigua (`docs/auditoria-modulos.md`).  
- Acción: no se cambia doc histórica; ruta legacy ya redirige a la canónica.

## Patrón: "/whatsapp" → canónico "/ops/whatsapp"
- Restos en UI legacy: `app/whatsapp/_components/WhatsAppModuleLayout.tsx` (tabs con /whatsapp/*).  
  - Reemplazo sugerido y aplicado:  
    - Inbox → /ops/whatsapp/inbox  
    - Flows → /ops/whatsapp/flows  
    - Contacts → /ops/whatsapp/contacts  
    - Automations → /ops/whatsapp/automations  
    - Metrics → /ops/whatsapp/metrics  
- Otros archivos con /whatsapp ya son redirects o providers reutilizados (sin cambio necesario).  

## Patrón: "/admin/membresías" (con acento) → canónico "/admin/membresias"
- Restos en doc antigua (`docs/auditoria-modulos.md`). No hay referencias en código UI; ya se usa sin acento.

## Resumen de cambios de código aplicados
- `app/whatsapp/_components/WhatsAppModuleLayout.tsx`: tabs actualizados a rutas canónicas `/ops/whatsapp/*`.
- Documentación: este reporte agrega consolidación de referencias; no se modificaron lógicas ni APIs.

## Pendiente / Siguiente paso
- Remover o actualizar docs antiguas que mencionan /admin/health o /whatsapp legacy si se quiere 100% alineado.  
- Mantener alias `/api/membresias/*` hasta que integraciones externas confirmen migración; luego se podrán borrar.
