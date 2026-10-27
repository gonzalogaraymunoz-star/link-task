# Replica · Backend · Resultado comprobado
- [x] LINK CONTROL CENTRAL inspeccionado en modo lectura.
- [x] Contrato SQL preparado en `replica/schema.sql` **sin ejecutarlo**.
- [x] Rutas y validación del backend incorporadas en rama aislada.
- [x] Pruebas API con `fetch` simulado y JWT simulado en GitHub Actions, 16/16 pruebas de app aprobadas.
- [ ] Migración aplicada en staging con revisión de RLS, permisos, índices, constraints.
- [ ] Persistencia real, concurrencia y eventos de idempotencia verificados mediante Supabase.
- [ ] Separación entre usuarios en base de datos comprobada.
- [ ] Lectura y vinculación E2E de evidencias/sesiones en navegador autenticado.
- [ ] Google Tasks OAuth real; fuera del alcance de esta integración.
- [x] No se modificaron secretos ni dependencias KV heredadas.
- [x] No se desplegó producción.

## Puerta de aceptación
No considerar operativa la versión hasta pasar migración, navegación real, doble usuario RLS y regresión de autenticación y sincronizaciones externas.
