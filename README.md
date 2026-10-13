# LINK TASK · MCP Cloudflare

Puente remoto MCP para **ChatGPT ↔ LINK TASK ↔ Supabase**, desplegado desde este repositorio con Cloudflare Workers Builds.

- Aplicación: https://link-task.gonzalogaraymunoz.workers.dev/
- MCP: https://link-task-mcp.gonzalogaraymunoz.workers.dev/mcp
- Salud pública: https://link-task-mcp.gonzalogaraymunoz.workers.dev/health
- OAuth discovery: https://link-task-mcp.gonzalogaraymunoz.workers.dev/.well-known/oauth-authorization-server

## Estado de implementación

**2026-10-09:** compilado y desplegado en Cloudflare. OAuth discovery comprobado. Siete pruebas unitarias pasadas. Falta terminar una conexión OAuth real con la cuenta del usuario y verificar una actividad escrita desde ChatGPT. No declarar esa etapa completada hasta hacerla.

## Cómo funciona

1. ChatGPT se conecta con el URL MCP mediante OAuth en el dominio de Cloudflare.
2. LINK TASK presenta una página de consentimiento; el usuario ingresa con su cuenta **Supabase Auth** existente.
3. Cloudflare emite un token OAuth limitado y vinculado al usuario, usando PKCE y confirmación explícita.
4. Las herramientas consultan la API de LINK TASK o escriben en Supabase con **el JWT de ese usuario**; RLS protege los datos.
5. LINK TASK refleja las sesiones al actualizar el panel.

Herramientas: `get_workspace`, `list_sessions`, `get_insights`, `start_session`, `end_session`, `record_work`.

**Privacidad:** el MCP no recibe automáticamente el historial privado ni la memoria de ChatGPT. Registra únicamente información enviada por operaciones autorizadas. `record_work` guarda eventos puntuales con `duration_kind=not_measured`; no inventa duración.

## Desarrollo

- Cloudflare Worker: `link-task-mcp`.
- KV: `OAUTH_KV` (ya vinculado).
- Fuente de identidad: Supabase Auth del proyecto LINK CONTROL CENTRAL.
- `npm install`, `npm run check` y `npm run deploy`.
- Cloudflare Workers Builds conecta `main` y ejecuta pruebas antes de desplegar.
- `npm run smoke` verifica discovery OAuth, metadata MCP y que el endpoint rechace peticiones anónimas.

El valor `SUPABASE_PUBLISHABLE_KEY` es una **clave publicable**, no un secreto. Nunca introducir `service_role`, refresh tokens, contraseñas privadas ni claves administradoras en el repositorio.

## Limitaciones reconocidas

- OAuth se hospeda en Cloudflare con la biblioteca oficial `@cloudflare/workers-oauth-provider`; **no cambia** el Site URL compartido de Supabase, que actualmente apunta a un proyecto antiguo.
- La autorización inicial puede pedir contraseña de Supabase aunque el usuario ya esté conectado a la web; son dominios diferentes.
- Con renovación de sesión, LINK TASK conserva un identificador de sesión OAuth (no el JWT de Supabase) y un refresh token de Supabase cifrado con AES-GCM y clave separada derivada por HKDF. El registro vive en Cloudflare KV hasta un máximo de 30 días; después se requiere un nuevo consentimiento. Revocar la sesión en Supabase invalida el acceso.
- Hacer pruebas de revocación, desconexión y separación entre dos usuarios antes de ofrecer el producto a terceros.


## Google Tasks

El MCP incluye `google_connect`, `google_tasklists`, `google_tasks_list`, `google_task_create` y `google_disconnect`.
El usuario abre el enlace generado por `google_connect` y concede acceso a Google Tasks.
La ruta de retorno configurada en el Worker es:

`https://link-task-mcp.gonzalogaraymunoz.workers.dev/google/callback`

**En Google Cloud**: habilitar Google Tasks API, crear cliente OAuth tipo aplicación web, configurar la URI de redirección anterior y añadir el usuario como usuario de prueba cuando corresponda.

**En Cloudflare → Worker link-task-mcp → Configuración → Variables y secretos**, cargar como secretos (NO variables públicas):
- `GOOGLE_CLIENT_ID`: identificador de cliente OAuth.
- `GOOGLE_CLIENT_SECRET`: secreto de ese cliente OAuth.
- `GOOGLE_TOKEN_ENCRYPTION_KEY`: 32 bytes aleatorios codificados en base64, generados localmente. No reutilizar secretos existentes.

La cuenta Google se vincula por el usuario autenticado de Supabase; el refresh token cifrado se guarda en el namespace KV `OAUTH_KV`. No se exponen credenciales a ChatGPT.
**No declarar completado** hasta probar con cuenta real y validar lectura/creación de una tarea. Calendar y Pulso Vivo todavía no están integrados a estos nuevos comandos.

## Renovación de autenticación MCP (2026-10-13)

- Tras autorizar la cuenta en la pantalla LINK TASK, la app guarda temporalmente el refresh token de Supabase cifrado con una clave derivada por HKDF de `GOOGLE_TOKEN_ENCRYPTION_KEY`, con un contexto exclusivo para sesiones Supabase. La contraseña no se guarda.
- `OAuthProvider` recibe únicamente `userId` y un identificador aleatorio `sessionId`, nunca el token de renovación.
- Cuando el JWT vence, el Worker solicita uno nuevo mediante Supabase Auth y lo vuelve a verificar con `/auth/v1/user` antes de acceder a datos protegidos por RLS.
- Los permisos de lectura/escritura continúan limitados al consentimiento MCP. Las sesiones duran hasta 30 días, después se necesita autorización nueva; también si el usuario revoca credenciales.
- Usuarios conectados antes de esta migración necesitan **autorizar una sola vez** para habilitar el formato nuevo.
- No girar la clave `GOOGLE_TOKEN_ENCRYPTION_KEY` sin un plan de migración: también cifra las credenciales existentes de Google Tasks.
