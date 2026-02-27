# Login Cookies (Host Consistency)

Cuando se prueba autenticación en rutas `admin`, usa el mismo host para iniciar sesión y navegar:

- Correcto: login y navegación en `http://localhost:3000`
- Incorrecto: login en `127.0.0.1` y navegación en `localhost` (o viceversa)

## Síntoma típico

- `401 No autenticado` en rutas API (`/api/geo/countries`, etc.)
- errores en Server Actions por cookie de sesión ausente

## Recomendación operativa

1. Inicia sesión y navega siempre con el mismo host y puerto.
2. Si cambias host, cierra sesión e inicia sesión nuevamente en ese host.
3. Verifica en DevTools que la cookie `AUTH_COOKIE_NAME` exista para el dominio activo.
