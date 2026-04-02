'use client';

import { useEffect, useMemo, useState } from 'react';
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

function TileFace({ left, right, hidden = false, selected = false, disabled = false, onClick }: { left: number; right: number; hidden?: boolean; selected?: boolean; disabled?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-20 w-12 shrink-0 flex-col items-center justify-center rounded-2xl border text-sm font-bold shadow-lg transition ${
        hidden ? 'border-slate-700 bg-slate-900 text-slate-700' : 'border-slate-300 bg-white text-slate-950'
      } ${selected ? 'ring-4 ring-cyan-300' : ''} ${disabled ? 'opacity-50' : 'hover:-translate-y-1'}`}
    >
      <span>{hidden ? '•' : left}</span>
      <span className="text-slate-400">—</span>
      <span>{hidden ? '•' : right}</span>
    </button>
  );
}

export function RoomShell({ initialSnapshot }: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [chatInput, setChatInput] = useState('');
  const [actionState, setActionState] = useState<ActionState>({ loading: false, error: null });
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
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

  return (
    <div className="space-y-4">
      <div className="rounded-[2rem] border border-amber-200/10 bg-gradient-to-b from-[#14532d] to-[#052e16] p-4 text-white shadow-2xl shadow-black/40 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70">Mesa activa</p>
            <h2 className="text-2xl font-semibold">{snapshot.room.name}</h2>
            <p className="text-sm text-amber-100/70">Código {snapshot.room.code}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{snapshot.game.statusText}</div>
            <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1">Turno: {snapshot.game.currentTurnSeat ? seatLabel(snapshot.game.currentTurnSeat) : 'Pendiente'}</div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-[1.75rem] border border-white/10 bg-black/15 p-4">
            <div className="relative min-h-[540px] rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_center,rgba(22,101,52,0.95),rgba(6,78,59,0.95))] p-4 md:p-6">
              <div className="absolute left-1/2 top-4 -translate-x-1/2 text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-amber-100/60">Norte</p>
                <p className="font-semibold">{snapshot.members.find((member) => member.seat === 'north')?.displayName ?? 'Libre'}</p>
                <p className="text-sm text-amber-100/70">{snapshot.game.handCounts.north ?? 0} fichas</p>
              </div>

              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-center md:right-4">
                <p className="text-xs uppercase tracking-[0.24em] text-amber-100/60">Este</p>
                <p className="font-semibold">{snapshot.members.find((member) => member.seat === 'east')?.displayName ?? 'Libre'}</p>
                <p className="text-sm text-amber-100/70">{snapshot.game.handCounts.east ?? 0} fichas</p>
              </div>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-amber-100/60">Sur</p>
                <p className="font-semibold">{snapshot.members.find((member) => member.seat === 'south')?.displayName ?? 'Libre'}</p>
                <p className="text-sm text-amber-100/70">{snapshot.game.handCounts.south ?? 0} fichas</p>
              </div>

              <div className="absolute left-2 top-1/2 -translate-y-1/2 text-center md:left-4">
                <p className="text-xs uppercase tracking-[0.24em] text-amber-100/60">Oeste</p>
                <p className="font-semibold">{snapshot.members.find((member) => member.seat === 'west')?.displayName ?? 'Libre'}</p>
                <p className="text-sm text-amber-100/70">{snapshot.game.handCounts.west ?? 0} fichas</p>
              </div>

              <div className="mx-auto mt-24 flex min-h-[220px] max-w-[760px] flex-wrap items-center justify-center gap-3 rounded-[1.5rem] border border-dashed border-white/10 bg-black/10 p-4 md:mt-28">
                {snapshot.game.board.length === 0 ? (
                  <p className="text-sm text-amber-100/70">La mesa está vacía. Tomen puestos y arranquen la partida.</p>
                ) : (
                  snapshot.game.board.map((tile) => <TileFace key={`${tile.id}-${tile.placedBy}-${tile.left}-${tile.right}`} left={tile.left} right={tile.right} />)
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-amber-100/60">Tu estado</p>
              <p className="mt-2 text-xl font-semibold">{myMember?.displayName ?? clientIdentity?.displayName ?? 'Invitado'}</p>
              <p className="text-sm text-amber-100/70">Puesto: {mySeat ? seatLabel(mySeat) : 'sin asiento'}</p>
              <p className="text-sm text-amber-100/70">{isMyTurn ? 'Es tu turno' : 'Esperando turno'}</p>
              {snapshot.game.winnerSeat ? <p className="mt-2 text-sm font-semibold text-emerald-300">Ganador: {seatLabel(snapshot.game.winnerSeat)}</p> : null}
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap gap-2">
                {SEATS.map((seat) => {
                  const owner = snapshot.members.find((member) => member.seat === seat);
                  const mine = owner?.sessionId === clientIdentity?.sessionId;
                  return (
                    <button
                      key={seat}
                      onClick={() => claimSeat(seat)}
                      disabled={actionState.loading || (!!owner && !mine)}
                      className="rounded-full border border-white/10 px-3 py-2 text-sm disabled:opacity-50"
                    >
                      {seatLabel(seat)} · {owner?.displayName ?? 'Libre'}
                    </button>
                  );
                })}
              </div>
              <button onClick={startGame} disabled={actionState.loading} className="mt-4 w-full rounded-2xl bg-amber-300 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50">
                Repartir e iniciar
              </button>
              <div className="mt-3 rounded-2xl border border-white/10 bg-black/10 p-3 text-xs text-amber-100/70 break-all">{inviteLink}</div>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-amber-100/60">Chat secundario</p>
              <div className="mt-3 max-h-32 space-y-2 overflow-auto text-sm">
                {snapshot.messages.slice(-3).map((message) => (
                  <div key={message.id} className="rounded-xl border border-white/10 bg-black/10 p-2">
                    <p className="font-medium">{message.authorName}</p>
                    <p className="text-amber-100/80">{message.body}</p>
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
            </div>
          </aside>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200/10 bg-slate-950/90 p-4 text-white shadow-2xl shadow-black/40 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Tu mano privada</p>
            <h3 className="text-xl font-semibold">{snapshot.game.hand.length} fichas</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => playTile('left')}
              disabled={!selectedTile || !selectedValidSides.includes('left') || !isMyTurn || actionState.loading}
              className="rounded-2xl border border-white/15 px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              Jugar izquierda
            </button>
            <button
              onClick={() => playTile('right')}
              disabled={!selectedTile || !selectedValidSides.includes('right') || !isMyTurn || actionState.loading}
              className="rounded-2xl border border-white/15 px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              Jugar derecha
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <div className="flex min-h-[100px] min-w-max gap-3 pb-2">
            {snapshot.game.hand.length === 0 ? (
              <p className="text-sm text-slate-500">Tu mano aparecerá cuando tomes asiento e inicie la partida.</p>
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
        {selectedTile ? <p className="mt-3 text-sm text-cyan-300">Ficha seleccionada: {selectedTile.left}-{selectedTile.right}</p> : null}
        {actionState.error ? <p className="mt-3 text-sm text-rose-300">{actionState.error}</p> : null}
      </div>
    </div>
  );
}
