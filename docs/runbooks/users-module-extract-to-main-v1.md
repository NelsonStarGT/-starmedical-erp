# Users Module Extract To Main v1

## Fuente usada
- Rama principal de código: `codex/auth-users-rbac-pr-clean`
- Referencia documental secundaria: `codex/final/users-module-final-closure-v3`

## Paths extraídos
- `app/admin/usuarios/configuracion/page.tsx`
- `app/admin/usuarios/layout.tsx`
- `app/admin/usuarios/lista/page.tsx`
- `app/admin/usuarios/page.tsx`
- `app/admin/usuarios/permisos/page.tsx`
- `app/api/users/[id]/branch-access/route.ts`
- `app/api/users/[id]/hr-link/route.ts`
- `app/api/users/[id]/link-hr/route.ts`
- `app/api/users/[id]/reset-password/route.ts`
- `app/api/users/[id]/roles/route.ts`
- `app/api/users/[id]/route.ts`
- `app/api/users/[id]/unlink-hr/route.ts`
- `app/api/users/route.ts`
- `app/login/page.tsx`
- `components/users/ChangeOwnPasswordCard.tsx`
- `components/users/UsersAdminPanel.tsx`
- `lib/users/access.ts`
- `lib/users/admin-data.ts`
- `lib/users/service.ts`
- `src/lib/users/service.ts`
- `tests/users/service.test.ts`

## Dependencias traídas o adaptadas
- `lib/api/http.ts`
- `lib/auth-password.ts`
- `lib/config-central/security-policy.ts`
- `lib/validation/person.ts`

## Archivos descartados
- `components/users/UserProvider.tsx`
  - Quedó sin referencias después de reemplazar las páginas y paneles por la extracción real.
- `components/users/SyncPermissionsButton.tsx`
  - Dependía de sincronización legacy de RBAC no compatible con el esquema actual de `main`.
- `app/api/admin/permissions/sync/route.ts`
  - Misma razón: endpoint de sincronización legacy no necesario para rescatar el módulo.
- `lib/security/rbacSnapshot.ts`
  - Dependía de tablas/campos inexistentes en `main`.
- `lib/security/rbacSync.ts`
  - Dependía de `userPermission`, `module`, `area`, `action`, `isSystem` y otros campos no presentes.
- `lib/tenant.ts`
  - El rescate quedó alineado a política global y ya no lo necesita.
- `tests/auth.rbac.hardening.test.ts`
  - Arrastraba rutas y módulos fuera de Usuarios (`finanzas`, `whatsapp`, `upload`, `health`) y contaminaba la extracción.

## Problemas encontrados
- La fuente asumía un esquema Prisma/RBAC más amplio que el presente en `main`.
- El contrato viejo usaba `tenantId`, `userBranchAccess`, `userProfile`, `hrEmployee`, `userPermission`, `branch` e indicadores RBAC persistidos que no existen en esta base.
- Se resolvió adaptando el módulo al contrato real actual y devolviendo `501` solo en las rutas RRHH no soportadas por el esquema actual.

## Validaciones ejecutadas
- `npm run -s typecheck -- --pretty false`
- `npx --yes tsx --test tests/users/service.test.ts`
- `npm run -s build`
- Smoke HTTP sobre build aislada en `http://localhost:3101`:
  - `/login` → `200`
  - `/admin/usuarios` → `307 /login`
  - `/admin/usuarios/lista` → `307 /login`
  - `/admin/usuarios/configuracion` → `307 /login`
  - `/admin/usuarios/permisos` → `307 /login`

## Resultado final
- Extracción limpia por paths completada.
- `typecheck` en verde.
- Test dirigido del servicio en verde.
- Build en verde.
- Módulo rescatado y listo para evaluación de merge a `main`.
