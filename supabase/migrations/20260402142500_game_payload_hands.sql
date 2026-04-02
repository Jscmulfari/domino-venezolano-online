alter table public.game_state
  add column if not exists payload jsonb not null default '{"board":[],"handsBySeat":{},"currentTurnSeat":null,"winnerSeat":null}'::jsonb;
