# Replica · LINK TASK · Arquitectura de integración
Base: `gonzalogaraymunoz-star/link-task`; rama `feature/replica-fase-b-kanban`.

## Stack retenido
- Cloudflare Worker JS para UI/API (sin cambiar entrega).
- Supabase LINK CONTROL CENTRAL para registros, Auth y RLS; no KV nuevo.
- Google Tasks y Calendar permanecen externos, sin sincronización automática nueva.
- La vista actual usa `model.entries`, `model.sessions`, `api()`, `load()`.

## Modelo
Extender `public.link_task_entries` de modo aditivo: `planned_for date` (null=backlog), `due_on date`, `position int`, `objective text`, `origin text` y `client_event_id text`.
Añadir `verification` al enum CHECK de status; mantener `archived` independiente.
Añadir `public.link_task_task_links` (owner + tarea + evidencia o sesión) con RLS de propietario en todos los extremos.
No crear otro sistema de tareas ni copiar registros existentes.

## API
- `GET /api/entries`: incluir campos nuevos sin cambiar identidad/orden.
- `POST /api/entries`: aceptar campos nuevos y evento idempotente para tareas.
- `PATCH /api/entries/:id`: actualizar campos permitidos en tarea del usuario.
- `GET /api/task-links?task_id=<uuid>`: vínculos de una tarea propia.
- `POST /api/task-links`: vínculo explícito a evidencia o sesión propia.

## Riesgos y mitigaciones
1. **Producción incompatible sin migración**: no integrar en main ni desplegar hasta aplicar migración en entorno autorizado y probar.
2. **RLS transversal**: usuarios no pueden vincular registros ajenos; el servidor usa JWT individual.
3. **Doble submit y relaciones externas**: client_event_id único por usuario; nunca crear tarea Google desde Kanban sin consentimiento.
4. **Zona horaria**: fechas operativas date sin hora, interpretadas en America/Santiago; no derivar de created_at.
5. **Concurrencia y estados**: PATCH por UUID + user_id + kind task; nunca convertir archived en verification.

## Orden de ejecución Replica
S01+S02 (tablero/backlog) → S03 (ficha/vínculos) → S04 (creación) → tests → revisión humana.
No desplegar; entrega en rama hasta próxima aprobación.
