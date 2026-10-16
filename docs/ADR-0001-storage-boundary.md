# ADR-0001 — Cloudflare despliega; Supabase conserva el estado operacional

**Fecha:** 2026-10-16  
**Estado:** Aceptada como objetivo arquitectónico; migración de credenciales pendiente.  
**Alcance:** LINK TASK y, como patrón, los demás servicios LINK WORLD.

## Decisión

- **Cloudflare Workers/Pages**: despliegue, entrega web y punto de entrada HTTP/MCP; ejecución sin estado de lógica breve. No es fuente de verdad de tareas, sesiones de trabajo, deduplicaciones, rutinas, progreso, eventos ni credenciales persistentes.
- **Supabase (LINK CONTROL CENTRAL)**: PostgreSQL, Auth, RLS y persistencia de operaciones, auditoría, rutinas, idempotencia y relaciones con LINK WORLD. Secretos de larga vida: almacenamiento cifrado del lado servidor, con acceso por identidad/funciones privilegiadas mínimas; nunca tablas consultables desde el navegador.
- **Google Tasks / Google Calendar**: sistemas externos de tareas y agenda. Supabase mantiene IDs, marcas de agua, eventos e historial de sincronización; no duplica innecesariamente fuentes de verdad.
- **GitHub**: código, migraciones, pruebas y control de cambios. No secretos.

## Hallazgos en producción (2026-10-16)

- Namespace activo: `LINK_TASK_OAUTH_KV`; 71 claves al auditar: 49 `client:*`, 2 `grant:*`, 12 `link_task:supa_session:*`, 1 `google:token:*` y 7 `linktask:daily:v1:*`.
- El Worker `link-task-mcp` tenía disparador `*/5 * * * *` (=288 veces/día). `src/index.js` escribe dos marcas KV por ejecución, y `src/daily-tasks.js` escribe un resultado por rutina activa. Con una rutina: ~864 escrituras KV/día incluso si la tarea ya existía, más las de autenticación. En la captura del panel había 503 escrituras; el origen exacto de cada escritura no se atribuyó con trazas, pero la amplificación del cron está demostrada en código.
- `auth-session.js`, `google-tasks.js` y `@cloudflare/workers-oauth-provider` mantienen material sensible/persistente en KV. No eliminar KV ni girar claves hasta comprobar migración + nueva autenticación.

## Mitigación aplicada (sin afectar tareas ni sesiones)

- Cron Worker cambiado a `15 4,7 * * *` (UTC), dos ejecuciones/día. En Chile continental equivale aprox. a 00:15/03:15 en invierno o 01:15/04:15 en verano.
- La primera ejecución materializa las tareas del nuevo día; la segunda verifica/recupera si falló la primera. La operación conserva detección de duplicados en Google Tasks.
- Reducción esperada de escrituras fijas de la rutina: de ~864/día a ~6/día (>99%). Puede haber otras escrituras de OAuth, por lo que esto NO equivale al consumo total.

## Migración segura por etapas

1. **Esquema en Supabase:** registrar `daily_routines`, `daily_occurrences` e `integration_sync_runs` con identificadores externos, fechas locales, restricciones únicas, RLS y bitácora de errores. Reutilizar `link_task_entries`, `link_task_sessions`, `event_bus` y `link_cron_runs` existentes; no duplicar sus funciones.
2. **Rutinas:** copiar registros diarios KV a Supabase, comparar recuentos e IDs, habilitar lectura dual temporal; escribir nuevas rutinas solo en Supabase después de pruebas. Idempotencia por `(routine_id, local_date)` y comprobación del marcador Google.
3. **Credenciales:** migrar tokens Google y renovación Supabase a almacenamiento cifrado servidor, fuera del alcance de RLS de usuarios normales; auditar revocación, rotación, concurrencia y acceso cross-user. Los clientes/grants de `OAuthProvider` necesitan almacenamiento alternativo compatible o reemplazo probado del componente. Nunca copiar tokens a logs, archivos GitHub ni respuestas MCP.
4. **Procesador:** mover planificación y estado de cron a Supabase (`pg_cron`/Edge Function o equivalente autorizado); Cloudflare solo enruta las solicitudes y presenta UI. Evitar reescrituras en cada polling; registrar cambios reales y errores con deduplicación.
5. **Corte:** pruebas E2E de login, refresh, reautorización, crear/completar tarea, rutinas en invierno/verano, reintentos, fallos de Supabase y Google. Hacer corte reversible con respaldo cifrado. Tras al menos 7 días de evidencia estable, desactivar KV como fuente de estado; eliminar datos solamente con respaldo confirmado y autorización.

## Prohibiciones para nuevo desarrollo

- No agregar claves KV para sesiones operativas, estados de ejecución, tareas, contabilidad, rutinas ni resultados de cron.
- No usar el cron cada cinco minutos para escribir una marca de “sigo vivo” si nada cambió.
- No almacenar `service_role`, JWTs, refresh tokens ni contraseñas en repositorios, documentación, logs o frontend.
- No afirmar “migrado” por crear tablas o documentos; exigir readback, pruebas E2E y corte verificado.

## Riesgos y rollback

Mientras no termine el corte, KV sigue siendo **una dependencia de autenticación en producción**. Si la nueva implementación falla, se conserva el camino anterior y se revierte el feature flag, sin borrar ni modificar claves existentes. Ajustar cron no migra credenciales ni estado; no confundir mitigación de cuota con objetivo arquitectónico completado.
