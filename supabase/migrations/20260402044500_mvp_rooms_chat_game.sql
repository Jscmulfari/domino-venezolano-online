create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  host_session_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  session_id text not null,
  display_name text not null,
  seat text,
  online boolean not null default true,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, session_id)
);

create unique index if not exists room_members_room_seat_idx
  on public.room_members (room_id, seat)
  where seat is not null;

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  session_id text not null,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.game_state (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  phase text not null default 'waiting',
  current_turn_seat text,
  board jsonb not null default '[]'::jsonb,
  status_text text not null default 'Esperando 4 jugadores',
  updated_at timestamptz not null default now()
);

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.chat_messages enable row level security;
alter table public.game_state enable row level security;

create policy "rooms read" on public.rooms for select using (true);
create policy "room_members read" on public.room_members for select using (true);
create policy "chat_messages read" on public.chat_messages for select using (true);
create policy "game_state read" on public.game_state for select using (true);

alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_members;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.game_state;
