# Replica · Backend · Verificación 2026-10-27
- [x] LINK CONTROL CENTRAL inspeccionado en modo lectura; políticas RLS actuales revisadas sin modificar producción.
- [x] Código UI y API preparado en `feature/replica-fase-b-kanban` con validación de fechas, estados y vínculo con usuario.
- [x] Draft SQL `replica/schema.sql` aplicado correctamente en PostgreSQL 17 desechable mediante GitHub Actions.
- [x] Estado `verification` limitado a `kind='task'`, estado `archived` separado, unicidad `client_event_id` y políticas RLS validadas con dos identidades simuladas.
- [x] Tests de app (16/16) y de MCP (23/23) aprobados en CI; rutas API probadas con fetch simulado.
- [ ] Rama Supabase de ensayo todavía sin crear. Costo oficial informado: USD 0.01344/h; requiere consentimiento explícito del usuario.
- [ ] Ejecutar migración en rama Supabase independiente y verificar lectura/escritura con Auth real.
- [ ] Verificar readback, test multiusuario real, permisos cruzados y concurrencia en Supabase.
- [ ] QA en navegador 390/1440 px, móvil, accesibilidad, errores y regresión de OAuth/Google Tasks.
- [x] Producción, tablas reales, y secretos no modificados.

## Evidencia
- PostgreSQL + RLS: https://github.com/gonzalogaraymunoz-star/link-task/actions/runs/40555246910
- Control de cambios: `replica/test/schema-setup.sql`, `replica/test/rls-regression.sql`.

## Puerta pendiente
Autorizar costo de la rama Supabase, completar ensayos reales y efectuar nueva revisión antes de despliegue. **No fusionar ni desplegar ahora.**
