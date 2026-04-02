# Estado de la fase actual

## Ya quedó funcional en esta fase
- contrato explícito de juego 4 jugadores exactos / 2v2
- base de engine autoritativo en `src/lib/engine/`
- lobby state con hostSeat, players y ready map
- `claimSeat`
- `setReady`
- `canStartMatch`
- `startMatch` con reparto de 7 fichas
- apertura obligatoria con 6-6
- turnos autoritativos
- validación de jugadas legales
- pase solo si no hay jugada válida
- cierre por irse
- cierre por tranca después de 4 pases seguidos
- puntuación de ronda por suma del equipo perdedor
- meta configurable de partida

## Qué falta
- persistir este engine como fuente real del servidor en la app/API
- snapshots públicos + vistas privadas por jugador
- endpoints de lobby ready/host/start basados en engine
- reconexión / resync versionado
- scoring mostrado en UI
- integración formal de bots al engine autoritativo
- preset venezolano completo si hay matices adicionales del reglamento local

## Decisión
El código actual de UI y rutas sigue siendo transición. La fuente de verdad futura debe salir del engine de `src/lib/engine/`.
