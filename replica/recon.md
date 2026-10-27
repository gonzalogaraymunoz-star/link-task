# Replica · LINK TASK · Recon (Fases A y B)
Origen: código propio de LINK TASK (rama main), informes de Fases A/B y prototipo del 27-10-2026.

## Estado comprobado del código
- Aplicación existente: Cloudflare Worker JS, UI integrada por app/src/legacy.js y app/src/kanban.js.
- Autenticación: Supabase Auth (JWT), tablas link_task_entries y link_task_sessions con RLS.
- El Kanban original dibuja tarjetas de tareas/sesiones y cambia estado, pero usa created_at como fecha de filtrado.
- Estado `archived` se muestra incorrectamente como "En revisión"; no representa una verificación real.

## Flujos solicitados
F01 Planificar voluntariamente para hoy una tarea del backlog.
F02 Filtrar el Kanban por negocio y período (día/semana/mes/año) usando fecha operativa.
F03 Pasar tarea entre Pendiente, En curso, Por verificar y Hecho, mediante arrastre o selector.
F04 Abrir ficha y consultar objetivo, origen, sesiones y evidencias vinculadas.
F05 Crear tarea real con fecha operativa opcional; dejar sin fecha = backlog.
F06 Archivar sin confundir archivo y verificación.

## Pantallas
S01 Kanban principal con estadísticas después del tablero.
S02 Backlog separado; sin planificación forzosa.
S03 Ficha lateral con estado y vínculos explícitos.
S04 Formulario de nueva tarea.

## Límites
- La Fase B HTML era una simulación: no constituye evidencia de backend conectado.
- Nunca obtener conversaciones privadas automáticamente, ni inventar sesiones, horas o evidencia.
- No sustituir OAuth, MCP, Google Tasks, el directorio LINK WORLD ni arquitectura de persistencia.
- No tocar datos o despliegue de producción durante esta implementación.
