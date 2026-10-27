# Replica · Hallazgos y pendientes (2026-10-27)
## Correcciones realizadas y probadas en CI
- FECHA-01: navegación mensual desde días 29-31 salta meses. Corregido anclando en primer día del mes destino.
- DUPLICADO-01: cada reintento de POST creaba nuevo client_event_id. Corregido reutilizando ID hasta confirmación.
- ESTADO-01: `verification` antes no estaba limitado en BD a registros tipo tarea. Añadida restricción y prueba SQL.

## Pendientes sin reproducir
- QA navegador real 390 px/1440 px; responsive, foco, accesibilidad y eventos drag-and-drop.
- Autorizar rama Supabase (costo) y correr migración en ella.
- QA Auth real, OAuth, Google Tasks y RLS con dos usuarios reales.
- Idempotencia concurrente y cortes de red en backend real.

No hay evidencia de incidentes de producción; no se ha desplegado.
