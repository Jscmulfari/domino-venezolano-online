# Dominó Venezolano Online

MVP base para jugar dominó venezolano entre familia y amigos en salas privadas, con chat en tiempo real dentro de la web.

## Stack elegido

- Next.js 16 + App Router + TypeScript
- Tailwind CSS 4
- Vercel para hosting
- Supabase para auth opcional, Postgres y Realtime
- Vercel Blob opcional para assets futuros

## Decisión realtime

Se elige **Supabase Realtime** como base del MVP porque funciona bien con Vercel sin mantener un servidor WebSocket propio dentro de Next.js. La idea es:

- `rooms`, `room_members`, `game_state`, `chat_messages` en Postgres
- Realtime subscriptions por sala para:
  - mensajes de chat
  - cambios de estado de partida
  - presencia de jugadores
- Route Handlers / Server Actions de Next para validación de jugadas y reglas

## MVP fases

1. Auth liviana + creación/unión a salas privadas
2. Chat realtime dentro de sala
3. Motor de dominó venezolano + turnos + validación
4. Lobby, presencia, score y revancha
5. Pulido mobile/desktop + invitaciones

## Scripts

```bash
npm run dev
npm run build
npm run lint
```

## Variables

Copia `.env.example` a `.env.local`.

## Estructura inicial

- `src/app/` rutas públicas y sala
- `src/components/` UI base
- `src/lib/domino/` tipos, reglas y arquitectura
- `docs/` decisiones técnicas
