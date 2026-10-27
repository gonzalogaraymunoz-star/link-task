# Replica · Incidencias
No hubo fallos en 23 pruebas root + 16 pruebas app al cierre del build inicial.

## Verificaciones pendientes (no son fallos reproducidos)
- Migración no aplicada; nuevas columnas no existen todavía en producción.
- Prueba real de autenticación y permanencia de sesión; segundo usuario y RLS.
- Pruebas UI en navegador 390/1440px, lector pantalla, carga lenta, offline y DST.
- API idempotente y conflictos concurrentes en base real.
- Control de cambios de estados desde Google Tasks, fuera del nuevo tablero.

No declarar 0 errores E2E sin haber ejecutado E2E.
