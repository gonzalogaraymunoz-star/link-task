# Replica · Plan y avance de pruebas
## Automatizadas completadas
- CI MCP: 23 pruebas aprobadas.
- CI app: 16 pruebas aprobadas.
- PostgreSQL 17 desechable: instalación de migración, checks de estado y RLS de vínculos con dos identidades simuladas, aprobados.
- Fuente: https://github.com/gonzalogaraymunoz-star/link-task/actions/runs/40555246910

## Próximas pruebas reales
| ID | Flujo | Requisito |
|---|---|---|
| S01 | Abrir sesión autenticada y cargar tareas de usuario real | Supabase staging con Auth |
| S02 | Crear tarea en backlog y planificar para hoy | Escritura + readback reales |
| S03 | Cambiar estado por selector y arrastre | Mobile y desktop, readback |
| S04 | Asociar evidencia/sesión | Restricción cruzada real |
| S05 | Eliminar fecha operativa, tarea vuelve a backlog | Zona America/Santiago |
| S06 | Caducidad de JWT, dos usuarios | 401 y aislamiento |
| S07 | Reintentar alta tras timeout | No duplicar tarea |
| S08 | Accesibilidad y tamaños 390/1440 | Keyboard/foco/lector |
| S09 | Regresión OAuth, Google Tasks y MCP | No afectar integraciones heredadas |

No atribuir 21/21 del prototipo simulado ni 39/39 de unit tests a pruebas en navegador o Supabase real.
