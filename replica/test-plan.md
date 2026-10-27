# Replica · Plan de pruebas
Los 21/21 del prototipo Fase B no son pruebas de esta implementación. No atribuirles validez aquí.

| ID | Escenario | Esperado |
|---|---|---|
| F01-H1 | Tarea sin planned_for | Permanece solo en backlog |
| F01-H2 | Planificar desde backlog | Aparece en fecha operativa seleccionada |
| F02-H1 | Cambiar día/semana/mes/año | Fechas Chile, sin filtrar por creación |
| F02-E1 | Cambio de horario de verano | Fecha local no se desplaza |
| F03-H1 | Arrastre de tarjeta | PATCH autorizado, refleja cambio |
| F03-H2 | Selector desde ficha | Resultado equivalente a arrastre |
| F03-N1 | PATCH no autorizado | Error, no se muestra éxito |
| F04-H1 | Enlazar evidencia propia | Acceso desde ficha |
| F04-N1 | Enlazar evidencia ajena | RLS deniega |
| F05-H1 | Crear tarea sin planificar | Backlog; creación persistida |
| F05-E1 | Reenviar mismo client_event_id | No crea duplicado |
| F06-H1 | Archivar tarea | Sale del Kanban sin marcarse Por verificar |
| F07-H1 | Inicio de sesión existente | Se conserva autenticación |
| F08-H1 | 390px y teclado | Columnas navegables y foco visible |
| SEC-01 | Sin token JWT | Respuesta 401 |
| SEC-02 | Segundo usuario | No leer ni enlazar datos del primero |

Pendiente: pruebas con navegador, red lenta, offline, recarga, error de Supabase, lector de pantalla y cierre del flujo real.
