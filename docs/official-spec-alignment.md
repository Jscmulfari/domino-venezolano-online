# Dominó Venezolano Online — Alineación con SPEC oficial

Este documento toma como contrato oficial el objetivo descrito por el usuario:

- 4 jugadores exactos
- 2 equipos (north/south vs east/west)
- preset principal: reglas venezolanas
- servidor autoritativo
- realtime robusto
- reconexión
- lobby con host y estado ready
- mesa clara de juego
- scoring por ronda y por partida
- arquitectura extensible

---

## 1. Arquitectura por fases

### Fase 0 — Base de producto
- creación de sala privada
- join por código/link
- asientos fijos north/east/south/west
- presencia y reconexión por session/player
- lobby con host, ready y start gate

### Fase 1 — Loop jugable autoritativo
- servidor valida apertura
- servidor valida turno
- servidor valida ficha y punta
- servidor resuelve pase / bloqueo / cierre
- snapshot consistente por sala
- cliente solo envía intención de jugada

### Fase 2 — Realtime robusto
- canal por roomId
- eventos tipados
- versionado de estado
- re-sync completo al reconectar
- tolerancia a tabs móviles / reload / lag

### Fase 3 — Ronda y scoring
- cierre de ronda
- cálculo de puntos por equipo
- tabla de score acumulado
- siguiente mano / siguiente ronda
- fin de partida por target score

### Fase 4 — Presets y extensibilidad
- reglas venezolanas como preset default
- motor desacoplado para futuros presets
- CPU/bots conectados al mismo motor autoritativo

---

## 2. Entidades principales

### Sala / Lobby
- Room
- RoomInvite
- RoomSeat
- RoomParticipant
- RoomPresence
- ReadyState

### Identidad de juego
- Player
- Team
- Session
- Connection

### Juego
- Match
- Round
- Turn
- DominoTile
- DominoChain
- PlayerHand
- MoveIntent
- MoveResult
- PassAction
- RoundResult
- MatchScore

### Realtime / sincronización
- RoomEvent
- GameEvent
- StateVersion
- Snapshot
- ReconnectToken o resume context por session

---

## 3. Eventos realtime / socket

## Canal principal
- room:{roomId}

## Eventos de lobby
- room.created
- room.joined
- room.left
- room.seat.changed
- room.ready.changed
- room.host.changed
- room.presence.changed

## Eventos de partida
- game.started
- game.snapshot
- game.turn.changed
- game.move.accepted
- game.move.rejected
- game.pass.forced
- game.round.finished
- game.score.updated
- game.match.finished

## Reglas de sincronización
- el servidor publica snapshot inicial
- eventos incrementales llevan version
- si el cliente detecta hueco de version -> pide resync
- al reconectar se hace hydrate desde snapshot completo

---

## 4. Diseño del game engine

## Principios
- puro y determinista
- sin dependencias de UI o realtime
- recibe estado + comando, devuelve nuevo estado + eventos
- preset de reglas inyectable

## Capas del engine

### domain
- tipos puros
- invariantes de mesa, mano, turno, equipos

### rules
- preset venezolano
- apertura válida
- validación de jugada
- pase
- cierre / tranque
- puntuación

### reducers / transitions
- createMatch
- startRound
- applyMove
- applyPass
- finishRound
- finishMatch

### application/use-cases
- joinRoom
- claimSeat
- markReady
- startGame
- submitMove
- reconnectPlayer

## Comandos mínimos
- CLAIM_SEAT
- SET_READY
- START_MATCH
- PLAY_TILE
- PASS_TURN
- REQUEST_RESYNC

## Salidas mínimas
- newState
- emittedEvents[]
- publicSnapshot
- perPlayerPrivateViews

---

## 5. Estructura sugerida de carpetas/proyecto

```txt
src/
  app/
    api/
    rooms/
  components/
    table/
    lobby/
    shared/
  lib/
    domain/
      room.ts
      player.ts
      match.ts
      round.ts
      tile.ts
    engine/
      presets/
        venezuelan.ts
      commands.ts
      reducer.ts
      selectors.ts
      snapshots.ts
      scoring.ts
    realtime/
      events.ts
      channels.ts
      sync.ts
    use-cases/
      join-room.ts
      claim-seat.ts
      set-ready.ts
      start-match.ts
      submit-move.ts
      reconnect-player.ts
    persistence/
      rooms-repo.ts
      matches-repo.ts
      events-repo.ts
    supabase/
      client.ts
      server.ts
```

---

## 6. Evaluación honesta del código actual

## Lo que sí sirve
- Next.js base y App Router
- integración inicial con Supabase
- creación/unión de salas
- asientos fijos north/east/south/west
- snapshot por sala
- realtime básico sobre cambios en BD
- mesa UI ya útil como prototipo visual
- bots simples como prueba de flujo

## Lo que no cumple todavía el SPEC
- no existe lobby formal con host/ready/start gate consistente
- no hay servidor autoritativo completo de ronda/partida
- el motor actual mezcla UI + payload + heurística simple
- la geometría de cadena sigue siendo presentacional, no derivada de modelo semántico de extremos
- no hay scoring de ronda/partida
- no hay reconexión robusta con state versioning
- no hay separación limpia entre domain, engine, use-cases y realtime
- CPU actual es funcional pero no está integrada al contrato completo de reglas

## Qué debe rehacerse
- engine de juego completo
- modelo de snapshots públicos + vistas privadas por jugador
- capa de eventos realtime tipados
- persistencia de match/round/score
- lobby/ready/host/reconnect

## Qué conviene conservar
- shell de proyecto
- integración Supabase
- endpoints y UI como base de transición
- naming de asientos y room flow

---

## Decisión inmediata

A partir de este punto, el repo debe migrar de:
- prototipo de mesa realtime

a:
- juego 4P 2v2 con servidor autoritativo y motor extensible

La prioridad de implementación ya no es maquillaje visual sino:
1. modelo de dominio
2. engine venezolano
3. snapshots + realtime robusto
4. lobby/reconnect/score
5. UI final sobre ese contrato
