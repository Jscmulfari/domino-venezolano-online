# Arquitectura objetivo

Este repo deja de tratarse como un MVP abierto y pasa a alinearse con el SPEC oficial del producto.

## Contrato principal
- 4 jugadores exactos
- 2v2 fijo por asientos
- preset venezolano por defecto
- servidor autoritativo
- realtime robusto con resync
- lobby con host + ready
- reconexión
- scoring por ronda/partida
- arquitectura extensible

## Fases

### Fase 1 — lobby autoritativo
- host
- ready state
- asientos bloqueados
- gate de inicio

### Fase 2 — engine de ronda
- apertura
- turnos
- pase / tranque
- cierre de ronda

### Fase 3 — realtime robusto
- snapshot versionado
- eventos tipados
- resync al reconectar

### Fase 4 — scoring y match
- puntos por ronda
- acumulado por equipos
- fin de partida

### Fase 5 — presets y CPU
- venezolano primero
- otras variantes después

## Capas propuestas
- `lib/domain/` contratos e invariantes
- `lib/engine/` motor puro
- `lib/use-cases/` casos de uso servidor
- `lib/realtime/` eventos y sincronización
- `lib/persistence/` acceso a storage

## Estado actual
El repo ya trae una base útil de room flow, Supabase, snapshots y UI prototipo, pero todavía no cumple el contrato completo del producto. El siguiente trabajo debe migrar la lógica real al engine autoritativo y usar la UI actual solo como superficie de entrega.
