'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { LiveRoomSnapshot, Seat } from '@/lib/domino/types';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { fetchJson } from '@/lib/client/fetch';
import { SEATS } from '@/lib/room/constants';

type Props = {
  initialSnapshot: LiveRoomSnapshot;
};

type ActionState = {
  loading: boolean;
  error: string | null;
};

function makeSessionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `session-${Math.random().toString(36).slice(2)}`;
}

function ensureSession() {
  const existingId = window.localStorage.getItem('domino:session-id');
  const existingName = window.localStorage.getItem('domino:display-name');
  const sessionId = existingId ?? makeSessionId();
  if (!existingId) window.localStorage.setItem('domino:session-id', sessionId);
  return { sessionId, displayName: existingName ?? 'Invitado' };
}

function seatLabel(seat: Seat) {
  return { north: 'Norte', east: 'Este', south: 'Sur', west: 'Oeste' }[seat];
}

function seatTone(seat: Seat, active: boolean) {
  const base = {
    north: 'from-sky-300/18 to-sky-500/8',
    east: 'from-violet-300/18 to-violet-500/8',
    south: 'from-amber-300/18 to-amber-500/8',
    west: 'from-emerald-300/18 to-emerald-500/8',
  }[seat];

  return `${base} ${active ? 'ring-2 ring-amber-300/70 shadow-lg shadow-amber-300/15' : ''}`;
}

function DominoPips({ value }: { value: number }) {
  const positions: Record<number, string[]> = {
    0: [],
    1: ['center'],
    2: ['top-left', 'bottom-right'],
    3: ['top-left', 'center', 'bottom-right'],
    4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
    6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right'],
  };

  const map: Record<string, string> = {
    center: 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
    'top-left': 'left-3 top-3',
    'top-right': 'right-3 top-3',
    'middle-left': 'left-3 top-1/2 -translate-y-1/2',
    'middle-right': 'right-3 top-1/2 -translate-y-1/2',
    'bottom-left': 'left-3 bottom-3',
    'bottom-right': 'right-3 bottom-3',
  };

  return (
    <div className="relative h-full w-full">
      {positions[value].map((position) => (
        <span key={position} className={`absolute h-2.5 w-2.5 rounded-full bg-slate-900 ${map[position]}`} />
      ))}
    </div>
  );
}

function TileFace({
  left,
  right,
  hidden = false,
  selected = false,
  disabled = false,
  compact = false,
  sideways = false,
  onClick,
}: {
  left: number;
  right: number;
  hidden?: boolean;
  selected?: boolean;
  disabled?: boolean;
  compact?: boolean;
  sideways?: boolean;
  onClick?: () => void;
}) {
  const sizeClass = compact ? 'h-16 w-10 rounded-xl' : 'h-24 w-14 rounded-2xl';
  const orientationClass = sideways ? 'rotate-90' : '';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${sizeClass} ${orientationClass} shrink-0 border bg-white shadow-xl transition ${
        hidden ? 'border-slate-700 bg-slate-100' : 'border-slate-300'
      } ${selected ? 'ring-4 ring-cyan-300 -translate-y-2' : ''} ${disabled ? 'opacity-45' : 'hover:-translate-y-1'} ${compact ? '' : ''}`}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-[inherit]">
        <div className="relative flex-1 bg-white">{hidden ? <div className="h-full w-full bg-slate-900/90" /> : <DominoPips value={left} />}</div>
        <div className="h-px bg-slate-300" />
        <div className="relative flex-1 bg-white">{hidden ? <div className="h-full w-full bg-slate-900/90" /> : <DominoPips value={right} />}</div>
      </div>
    </button>
  );
}

function OpponentFan({ count, sideways = false }: { count: number; sideways?: boolean }) {
  if (count <= 0) {
    return <div className="text-xs text-amber-100/45">sin fichas</div>;
  }

  return (
    <div className={`flex items-center justify-center ${sideways ? 'flex-col gap-[-10px]' : '-space-x-6'}`}>
      {Array.from({ length: Math.min(count, 7) }).map((_, index) => (
        <div key={index} className={sideways ? '-my-3' : ''} style={{ zIndex: index + 1 }}>
          <TileFace left={0} right={0} hidden compact sideways={sideways} />
        </div>
      ))}
      {count > 7 ? <span className="ml-2 text-xs text-amber-100/65">+{count - 7}</span> : null}
    </div>
  );
}

function SeatBadge({ seat, member, count, active }: { seat: Seat; member?: LiveRoomSnapshot['members'][number]; count: number; active: boolean }) {
  return (
    <div className={`rounded-3xl border border-white/10 bg-gradient-to-br px-4 py-3 backdrop-blur ${seatTone(seat, active)}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-amber-100/55">{seatLabel(seat)}</p>
          <p className="text-base font-semibold text-white">{member?.displayName ?? 'Libre'}</p>
        </div>
        <div className="text-right text-xs text-amber-100/70">
          <p>{count} fichas</p>
          <p>{member?.isBot ? 'CPU' : member ? 'Humano' : 'vacío'}</p>
        </div>
      </div>
    </div>
  );
}

function getBoardTileClasses(index: number) {
  const columns = 8;
  const row = Math.floor(index / columns);
  const positionInRow = index % columns;
  const isReverseRow = row % 2 === 1;
  const column = isReverseRow ? columns - positionInRow : positionInRow + 1;
  const isTurnColumn = positionInRow === columns - 1;
  const sideways = isTurnColumn;
  const verticalNudge = row % 2 === 0 ? 8 : -8;
  const rotate = sideways ? (row % 2 === 0 ? 90 : -90) : 0;

  return {
    sideways,
    style: {
      gridColumn: `${column} / span 1`,
      gridRow: `${row + 1} / span 1`,
      transform: `translateY(${sideways ? 0 : verticalNudge}px) rotate(${rotate}deg)`,
      zIndex: 100 - index,
    },
  };
}

export function RoomShell({ initialSnapshot }: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [chatInput, setChatInput] = useState('');
  const [actionState, setActionState] = useState<ActionState>({ loading: false, error: null });
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const botTickRef = useRef<string | null>(null);
  const [clientIdentity] = useState<{ sessionId: string; displayName: string } | null>(() => {
    if (typeof window === 'undefined') return null;
    return ensureSession();
  });

  useEffect(() => {
    async function refreshSnapshot() {
      const suffix = clientIdentity?.sessionId ? `?sessionId=${encodeURIComponent(clientIdentity.sessionId)}` : '';
      const result = await fetchJson<LiveRoomSnapshot>(`/api/rooms/${initialSnapshot.room.code}/snapshot${suffix}`, { cache: 'no-store' });
      if (!result.ok) {
        setActionState({ loading: false, error: result.error });
        return;
      }
      setSnapshot(result.data);
    }

    const identity = clientIdentity;
    if (identity && !initialSnapshot.members.some((member) => member.sessionId === identity.sessionId)) {
      void fetchJson<{ roomCode: string }>('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: identity.displayName, roomCode: initialSnapshot.room.code, sessionId: identity.sessionId }),
      }).then(() => refreshSnapshot());
    }

    const supabase = getBrowserSupabase();
    const roomId = initialSnapshot.room.id;
    const channel = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` }, refreshSnapshot)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` }, refreshSnapshot)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state', filter: `room_id=eq.${roomId}` }, refreshSnapshot)
      .subscribe();

    void refreshSnapshot();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [clientIdentity, initialSnapshot.members, initialSnapshot.room.code, initialSnapshot.room.id]);

  useEffect(() => {
    const turnSeat = snapshot.game.currentTurnSeat;
    if (!turnSeat || snapshot.game.phase !== 'playing') return;

    const turnMember = snapshot.members.find((member) => member.seat === turnSeat);
    if (!turnMember?.isBot) {
      botTickRef.current = null;
      return;
    }

    const tickKey = `${snapshot.room.code}:${turnSeat}:${snapshot.game.board.length}:${snapshot.game.handCounts[turnSeat] ?? 0}`;
    if (botTickRef.current === tickKey) return;
    botTickRef.current = tickKey;

    const timer = window.setTimeout(() => {
      void fetchJson(`/api/rooms/${snapshot.room.code}/bot-play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [snapshot.game.board.length, snapshot.game.currentTurnSeat, snapshot.game.handCounts, snapshot.game.phase, snapshot.members, snapshot.room.code]);

  const myMember = useMemo(() => {
    if (!clientIdentity) return null;
    return snapshot.members.find((member) => member.sessionId === clientIdentity.sessionId) ?? null;
  }, [clientIdentity, snapshot.members]);

  const mySeat = myMember?.seat ?? null;
  const selectedTile = snapshot.game.hand.find((tile) => tile.id === selectedTileId) ?? null;

  async function runAction(url: string, body: object) {
    setActionState({ loading: true, error: null });
    const result = await fetchJson<{ ok: true }>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!result.ok) {
      setActionState({ loading: false, error: result.error });
      return false;
    }
    setActionState({ loading: false, error: null });
    return true;
  }

  async function claimSeat(seat: Seat) {
    if (!clientIdentity) return;
    await runAction(`/api/rooms/${snapshot.room.code}/seat`, { seat, sessionId: clientIdentity.sessionId });
  }

  async function addBot(seat: Seat) {
    await runAction(`/api/rooms/${snapshot.room.code}/bot-seat`, { seat });
  }

  async function fillBots() {
    await runAction(`/api/rooms/${snapshot.room.code}/bot-fill`, {});
  }

  async function startGame() {
    await runAction(`/api/rooms/${snapshot.room.code}/start`, {});
  }

  async function playTile(side: 'left' | 'right') {
    if (!clientIdentity || !selectedTile) return;
    const ok = await runAction(`/api/rooms/${snapshot.room.code}/turn`, {
      tileId: selectedTile.id,
      side,
      sessionId: clientIdentity.sessionId,
    });
    if (ok) setSelectedTileId(null);
  }

  async function sendChat() {
    if (!clientIdentity || !chatInput.trim()) return;
    const ok = await runAction(`/api/rooms/${snapshot.room.code}/chat`, {
      authorName: clientIdentity.displayName,
      sessionId: clientIdentity.sessionId,
      text: chatInput,
    });
    if (ok) setChatInput('');
  }

  const inviteLink = typeof window === 'undefined' ? '' : `${window.location.origin}/rooms/${snapshot.room.code}`;
  const isMyTurn = !!mySeat && snapshot.game.currentTurnSeat === mySeat;
  const selectedValidSides = selectedTile ? snapshot.game.validSidesByTile[selectedTile.id] ?? [] : [];
  const northMember = snapshot.members.find((member) => member.seat === 'north');
  const eastMember = snapshot.members.find((member) => member.seat === 'east');
  const southMember = snapshot.members.find((member) => member.seat === 'south');
  const westMember = snapshot.members.find((member) => member.seat === 'west');

  return (
    <div className="space-y-4">
      <section className="rounded-[2.2rem] border border-amber-200/10 bg-[radial-gradient(circle_at_top,#1f7a46_0%,#0b4e2f_45%,#052e16_100%)] p-3 text-white shadow-[0_30px_80px_rgba(0,0,0,0.55)] md:p-5">
        <div className="rounded-[1.9rem] border border-white/10 bg-black/10 p-3 backdrop-blur md:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-amber-200/70">Mesa de dominó</p>
              <h2 className="text-2xl font-semibold md:text-3xl">{snapshot.room.name}</h2>
              <p className="text-sm text-amber-100/70">Código {snapshot.room.code}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm text-amber-50/90">{snapshot.game.statusText}</div>
              <div className={`rounded-full border px-4 py-2 text-sm font-semibold ${isMyTurn ? 'border-amber-300/60 bg-amber-300 text-slate-950' : 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100'}`}>
                {snapshot.game.currentTurnSeat ? `Turno: ${seatLabel(snapshot.game.currentTurnSeat)}` : 'Esperando jugadores'}
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[1.9rem] border border-white/10 bg-[radial-gradient(circle_at_center,rgba(26,107,60,0.98),rgba(9,63,38,0.98))] px-3 pb-5 pt-4 md:px-6 md:pb-6 md:pt-5">
            <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:28px_28px]" />
            <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-5">
              <div className="flex items-center justify-center">
                <div className="w-full max-w-sm space-y-3 text-center">
                  <SeatBadge seat="north" member={northMember} count={snapshot.game.handCounts.north ?? 0} active={snapshot.game.currentTurnSeat === 'north'} />
                  <OpponentFan count={snapshot.game.handCounts.north ?? 0} />
                </div>
              </div>

              <div className="grid items-center gap-4 md:grid-cols-[140px_minmax(0,1fr)_140px] xl:grid-cols-[170px_minmax(0,1fr)_170px]">
                <div className="flex flex-col items-center gap-3">
                  <SeatBadge seat="west" member={westMember} count={snapshot.game.handCounts.west ?? 0} active={snapshot.game.currentTurnSeat === 'west'} />
                  <OpponentFan count={snapshot.game.handCounts.west ?? 0} sideways />
                </div>

                <div className="rounded-[2.2rem] border border-white/10 bg-black/12 px-3 py-4 shadow-inner shadow-black/25 md:px-5 md:py-6 xl:px-8 xl:py-8">
                  <div className="mb-4 flex items-center justify-between text-[11px] uppercase tracking-[0.28em] text-amber-100/60">
                    <span>Salida</span>
                    <span>Cadena de juego</span>
                    <span>Cierre</span>
                  </div>
                  <div className="rounded-[1.8rem] border border-dashed border-amber-100/15 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.08),rgba(0,0,0,0.18))] px-3 py-4 md:px-5 md:py-5 xl:px-7 xl:py-6">
                    {snapshot.game.board.length === 0 ? (
                      <div className="flex min-h-[280px] items-center justify-center text-center text-sm text-amber-100/70 md:min-h-[320px] xl:min-h-[360px]">
                        La mesa espera la primera ficha.
                      </div>
                    ) : (
                      <div className="relative min-h-[280px] md:min-h-[320px] xl:min-h-[360px]">
                        <div className="pointer-events-none absolute inset-0 rounded-[1.5rem] border border-white/5" />
                        <div className="pointer-events-none absolute inset-x-8 top-1/2 hidden h-px -translate-y-1/2 border-t border-dashed border-amber-100/10 md:block" />
                        <div className="pointer-events-none absolute inset-y-8 left-1/2 hidden w-px -translate-x-1/2 border-l border-dashed border-amber-100/10 xl:block" />
                        <div className="grid min-h-[280px] grid-cols-8 place-items-center gap-x-1 gap-y-3 px-2 py-4 md:min-h-[320px] md:gap-x-2 md:gap-y-4 md:px-3 xl:min-h-[360px] xl:gap-x-3 xl:gap-y-5 xl:px-6">
                          {snapshot.game.board.map((tile, index) => {
                            const placement = getBoardTileClasses(index);
                            return (
                              <div key={`${tile.id}-${tile.placedBy}-${tile.left}-${tile.right}-${index}`} style={placement.style} className="transition-transform duration-150">
                                <TileFace left={tile.left} right={tile.right} sideways={placement.sideways} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <SeatBadge seat="east" member={eastMember} count={snapshot.game.handCounts.east ?? 0} active={snapshot.game.currentTurnSeat === 'east'} />
                  <OpponentFan count={snapshot.game.handCounts.east ?? 0} sideways />
                </div>
              </div>

              <div className="rounded-[1.7rem] border border-white/10 bg-black/18 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-amber-100/55">Tu posición</p>
                    <h3 className="text-xl font-semibold">{southMember?.displayName ?? clientIdentity?.displayName ?? 'Jugador'}</h3>
                    <p className="text-sm text-amber-100/70">{mySeat ? `Puesto ${seatLabel(mySeat)}` : 'Toma un puesto para recibir mano'}</p>
                  </div>
                  <div className={`rounded-2xl border px-4 py-3 text-sm ${isMyTurn ? 'border-amber-300/60 bg-amber-300/18 text-amber-50' : 'border-white/10 bg-black/15 text-amber-100/70'}`}>
                    {snapshot.game.winnerSeat ? `Ganó ${seatLabel(snapshot.game.winnerSeat)}` : isMyTurn ? 'Tu turno: elige ficha y punta' : 'Esperando tu turno'}
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-center">
                  <div className="w-full rounded-[1.6rem] border border-amber-200/10 bg-[linear-gradient(180deg,rgba(76,29,149,0.10),rgba(15,23,42,0.35))] px-4 pb-4 pt-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.3em] text-amber-100/55">Tu mano</p>
                        <p className="text-sm text-amber-50/85">{snapshot.game.hand.length} fichas privadas</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => playTile('left')}
                          disabled={!selectedTile || !selectedValidSides.includes('left') || !isMyTurn || actionState.loading}
                          className="rounded-2xl border border-white/15 bg-black/20 px-4 py-2 text-sm font-semibold disabled:opacity-40"
                        >
                          Punta izquierda
                        </button>
                        <button
                          onClick={() => playTile('right')}
                          disabled={!selectedTile || !selectedValidSides.includes('right') || !isMyTurn || actionState.loading}
                          className="rounded-2xl border border-white/15 bg-black/20 px-4 py-2 text-sm font-semibold disabled:opacity-40"
                        >
                          Punta derecha
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto pb-2">
                      <div className="flex min-h-[126px] min-w-max items-end justify-center gap-2 px-1">
                        {snapshot.game.hand.length === 0 ? (
                          <p className="py-8 text-sm text-slate-300/60">Tu mano aparecerá cuando tomes asiento e inicie la partida.</p>
                        ) : (
                          snapshot.game.hand.map((tile) => (
                            <TileFace
                              key={tile.id}
                              left={tile.left}
                              right={tile.right}
                              selected={selectedTileId === tile.id}
                              disabled={!isMyTurn && snapshot.game.phase === 'playing'}
                              onClick={() => setSelectedTileId((current) => (current === tile.id ? null : tile.id))}
                            />
                          ))
                        )}
                      </div>
                    </div>

                    {selectedTile ? <p className="mt-3 text-sm text-cyan-300">Ficha seleccionada {selectedTile.left}-{selectedTile.right}</p> : null}
                    {actionState.error ? <p className="mt-3 text-sm text-rose-300">{actionState.error}</p> : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-[1.8rem] border border-white/10 bg-slate-950/90 p-4 text-white shadow-2xl shadow-black/35">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Control de mesa</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {SEATS.map((seat) => {
              const owner = snapshot.members.find((member) => member.seat === seat);
              const mine = owner?.sessionId === clientIdentity?.sessionId;
              return (
                <div key={seat} className="flex gap-2">
                  <button
                    onClick={() => claimSeat(seat)}
                    disabled={actionState.loading || (!!owner && !mine)}
                    className="rounded-full border border-white/10 px-3 py-2 text-sm disabled:opacity-50"
                  >
                    {seatLabel(seat)} · {owner?.displayName ?? 'Libre'}
                  </button>
                  {!owner ? (
                    <button onClick={() => addBot(seat)} disabled={actionState.loading} className="rounded-full border border-amber-300/30 px-3 py-2 text-sm text-amber-200 disabled:opacity-50">
                      CPU
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={fillBots} disabled={actionState.loading} className="rounded-2xl border border-amber-300/30 px-4 py-3 text-sm font-semibold text-amber-200 disabled:opacity-50">
              Completar vacíos con CPU
            </button>
            <button onClick={startGame} disabled={actionState.loading} className="rounded-2xl bg-amber-300 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50">
              Repartir e iniciar
            </button>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-3 text-xs text-amber-100/70 break-all">{inviteLink}</div>
        </div>

        <aside className="rounded-[1.8rem] border border-white/10 bg-slate-950/90 p-4 text-white shadow-2xl shadow-black/35">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Chat de mesa</p>
          <div className="mt-4 max-h-40 space-y-2 overflow-auto text-sm">
            {snapshot.messages.slice(-4).map((message) => (
              <div key={message.id} className="rounded-xl border border-white/10 bg-black/15 p-3">
                <p className="font-medium text-white">{message.authorName}</p>
                <p className="mt-1 text-amber-100/80">{message.body}</p>
              </div>
            ))}
          </div>
          <textarea
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            rows={2}
            placeholder="Mensaje rápido"
            className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"
          />
          <button onClick={sendChat} disabled={actionState.loading || !chatInput.trim()} className="mt-2 w-full rounded-2xl border border-white/15 px-4 py-2 text-sm font-semibold disabled:opacity-50">
            Enviar
          </button>
        </aside>
      </section>
    </div>
  );
}
