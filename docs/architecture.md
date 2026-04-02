# Arquitectura MVP

## Objetivo

Plataforma web para salas privadas de dominó venezolano con chat y partida realtime para familia/amigos.

## Capas

### Frontend
- Next.js App Router
- UI responsive mobile/desktop
- Pantallas clave:
  - home
  - lobby / crear sala
  - sala de juego

### Backend lógico
- Route Handlers / Server Actions en Next.js
- Validación de reglas y transiciones de estado del juego
- Acceso a Supabase para persistencia y realtime

### Realtime
- Supabase Realtime por sala
- Canales por `room:{code}`
- Eventos esperados:
  - `chat.message.created`
  - `room.member.joined`
  - `game.state.updated`
  - `game.turn.changed`

## Modelos base

- `Room`
- `RoomMember`
- `ChatMessage`
- `DominoTile`
- `DominoGameState`
- `DominoMove`

## Reglas venezolanas MVP

- 4 jugadores
- 2 equipos
- mano inicial de 7 fichas
- apertura y turnos validados por servidor
- mesa con dos puntas
- conteo de ganador y score básico

## Nota Vercel

No montar sockets custom stateful dentro de Next para el MVP. Vercel + Supabase Realtime evita fricción operativa y escala mejor para salas privadas simples.
