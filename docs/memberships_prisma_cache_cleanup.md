# Memberships Prisma Cache Cleanup

Si la API de Membresías lanza errores tipo `Unknown field` o `Unknown argument` justo después de cambios en `prisma/schema.prisma`, el problema suele ser cliente Prisma o bundle de Next desfasado.

Pasos seguros de limpieza en local:

```bash
rm -rf .next
rm -rf node_modules/.prisma
npx prisma generate
```

Luego reinicia el servidor:

```bash
npm run dev
```

Nota:
- Si persiste un mismatch entre schema y DB, validar con `npx prisma migrate status`.
- `npx prisma migrate dev` requiere terminal interactiva; en CI usar `npx prisma migrate deploy`.
