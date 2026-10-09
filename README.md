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
- En esta versión, al vencer el JWT de Supabase posiblemente será necesario autorizar otra vez. Implementar renovación de sesión segura antes del escalamiento multiusuario.
- Hacer pruebas de revocación, desconexión y separación entre dos usuarios antes de ofrecer el producto a terceros.
