# Dominó Venezolano Online

MVP real para jugar dominó venezolano entre familia y amigos en salas privadas.

## Ya funcional

- crear sala privada
- entrar por código o link
- chat realtime persistido con Supabase
- lobby sincronizado con puestos north/east/south/west
- inicio de partida base
- mesa compartida inicial con turno actual y fichas jugadas demo

## Stack

- Next.js 16 + App Router + TypeScript
- Tailwind CSS 4
- Supabase Realtime + Postgres
- Vercel para deploy

## Variables

Copia `.env.example` a `.env.local`.

## Levantar

```bash
npm install
npm run dev
```

## Base de datos

La migración inicial está en `supabase/migrations/20260402044500_mvp_rooms_chat_game.sql`.

Con Supabase CLI:

```bash
npx supabase link --project-ref <ref>
npx supabase db push
```
