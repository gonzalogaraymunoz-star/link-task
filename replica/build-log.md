# Replica · Build log
2026-10-27 — Recon/arquitectura/diseño recuperados del prototipo Fase B y código real.
2026-10-27 — Rama `feature/replica-fase-b-kanban` creada desde main; producción intacta.
2026-10-27 — S01-S04: Kanban, filtros, backlog, ficha, arrastre, planificación y alta de tareas incorporados con API de usuario.
2026-10-27 — Draft de esquema y RLS preparado, no aplicado a Supabase.
2026-10-27 — Tests JS en CI: 23/23 MCP y 16/16 app.
2026-10-27 — PostgreSQL 17 en GitHub Actions: esquema aplicado; RLS owner A/B, no-vínculos cruzados, verificación/archivo y deduplicación aprobados.
2026-10-27 — Arreglos: `verification` exclusivamente tareas, retry de creación con ID estable, navegación por meses sin salto de fin de mes.
2026-10-27 — `link_task_entries` y `link_task_sessions` en Supabase producción revisadas solo en lectura, RLS de propietario vigente.
2026-10-27 — Se intentó crear rama de QA en Supabase; conector exigió confirmación del costo (USD 0.01344/h); **no creada**.
PENDIENTE: autorización costo staging, migración real en staging, QA sesión real, 2 usuarios y navegador. No modificar producción.
