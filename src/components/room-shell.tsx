'use client';

import { useEffect, useMemo, useState } from 'react';
import { getBrowserSupabase } from '@/lib/supabase/client';
import type { LiveRoomSnapshot, Seat } from '@/lib/domino/types';
import { SEATS } from '@/lib/room/constants';
import { fetchJson } from '@/lib/client/fetch';

type Props = {
  initialSnapshot: LiveRoomSnapshot;
};

type ActionState = {
  loading: boolean;
  error: string | null;
};

function makeSessionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `session-${Math.random().toString(36).slice(2)}`;
}

function ensureSession() {
  const existingId = window.localStorage.getItem('domino:session-id');
  const existingName = window.localStorage.getItem('domino:display-name');

  const sessionId = existingId ?? makeSessionId();
  if (!existingId) window.localStorage.setItem('domino:session-id', sessionId);

  return {
    sessionId,
    displayName: existingName ?? 'Invitado',
  };
}

export function RoomShell({ initialSnapshot }: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [chatInput, setChatInput] = useState('');
  const [tileInput, setTileInput] = useState('6-6');
  const [actionState, setActionState] = useState<ActionState>({ loading: false, error: null });
  const [clientIdentity] = useState<{ sessionId: string; displayName: string } | null>(() => {
    if (typeof window === 'undefined') return null;
    return ensureSession();
  });

  useEffect(() => {
    async function refreshSnapshot() {
      const result = await fetchJson<LiveRoomSnapshot>(`/api/rooms/${initialSnapshot.room.code}/snapshot`, { cache: 'no-store' });
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
        body: JSON.stringify({
          displayName: identity.displayName,
          roomCode: initialSnapshot.room.code,
          sessionId: identity.sessionId,
        }),
      }).then((result) => {
        if (!result.ok) {
          setActionState({ loading: false, error: result.error });
          return;
        }

        void refreshSnapshot();
      });
    }

    const supabase = getBrowserSupabase();
    const roomId = initialSnapshot.room.id;

    const channel = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` }, refreshSnapshot)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` }, refreshSnapshot)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state', filter: `room_id=eq.${roomId}` }, refreshSnapshot)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [clientIdentity, initialSnapshot.members, initialSnapshot.room.code, initialSnapshot.room.id]);

  const myMember = useMemo(() => {
    if (!clientIdentity) return null;
    return snapshot.members.find((member) => member.sessionId === clientIdentity.sessionId) ?? null;
  }, [clientIdentity, snapshot.members]);

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

  async function sendChat() {
    if (!clientIdentity || !chatInput.trim()) return;

    const ok = await runAction(`/api/rooms/${snapshot.room.code}/chat`, {
      authorName: clientIdentity.displayName,
      sessionId: clientIdentity.sessionId,
      text: chatInput,
    });

    if (ok) setChatInput('');
  }

  async function claimSeat(seat: Seat) {
    if (!clientIdentity) return;
    await runAction(`/api/rooms/${snapshot.room.code}/seat`, { seat, sessionId: clientIdentity.sessionId });
  }

  async function startGame() {
    await runAction(`/api/rooms/${snapshot.room.code}/start`, {});
  }

  async function pushTile() {
    const [leftRaw, rightRaw] = tileInput.split('-');
    const left = Number(leftRaw);
    const right = Number(rightRaw);

    if (Number.isNaN(left) || Number.isNaN(right)) {
      setActionState({ loading: false, error: 'Formato de ficha inválido. Usa 6-6' });
      return;
    }

    await runAction(`/api/rooms/${snapshot.room.code}/turn`, { tile: { left, right } });
  }

  const inviteLink = typeof window === 'undefined' ? '' : `${window.location.origin}/rooms/${snapshot.room.code}`;

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_340px]">
      <aside className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Sala</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">#{snapshot.room.code}</h2>
        <p className="mt-2 text-sm text-slate-300">{snapshot.room.name}</p>
        <p className="mt-4 text-xs text-slate-500">Link</p>
        <div className="mt-2 rounded-xl border border-white/10 bg-slate-950/70 p-3 text-xs text-cyan-300 break-all">{inviteLink}</div>
        <div className="mt-4 space-y-3">
          {snapshot.members.map((member) => (
            <div key={member.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
              <p className="font-medium text-white">{member.displayName}</p>
              <p className="text-sm text-slate-400">{member.seat ?? 'sin puesto'}</p>
            </div>
          ))}
        </div>
      </aside>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Mesa</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Base de juego sincronizada</h3>
          </div>
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-200">{snapshot.game.statusText}</span>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {SEATS.map((seat) => {
            const owner = snapshot.members.find((member) => member.seat === seat);
            const mine = owner?.sessionId === clientIdentity?.sessionId;
            return (
              <button
                key={seat}
                onClick={() => claimSeat(seat)}
                disabled={actionState.loading || (!!owner && !mine)}
                className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-left disabled:opacity-50"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{seat}</p>
                <p className="mt-2 font-semibold text-white">{owner?.displayName ?? 'Libre'}</p>
                <p className="mt-1 text-sm text-slate-400">{mine ? 'Tu puesto' : owner ? 'Ocupado' : 'Tomar asiento'}</p>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-dashed border-white/15 bg-slate-950/40 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={startGame} disabled={actionState.loading} className="rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">
              Iniciar partida
            </button>
            <input
              value={tileInput}
              onChange={(event) => setTileInput(event.target.value)}
              placeholder="6-6"
              className="rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-white outline-none"
            />
            <button onClick={pushTile} disabled={actionState.loading} className="rounded-xl border border-white/15 px-4 py-2 font-semibold text-white disabled:opacity-50">
              Jugar ficha demo
            </button>
          </div>
          <div className="mt-4 flex min-h-[220px] flex-wrap gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            {snapshot.game.board.length === 0 ? (
              <p className="text-sm text-slate-500">Sin fichas todavía.</p>
            ) : (
              snapshot.game.board.map((tile, index) => (
                <div key={`${tile.left}-${tile.right}-${index}`} className="flex h-20 w-16 flex-col items-center justify-center rounded-2xl border border-white/10 bg-white text-slate-950 shadow-lg">
                  <span className="text-lg font-bold">{tile.left}</span>
                  <span className="text-slate-400">—</span>
                  <span className="text-lg font-bold">{tile.right}</span>
                </div>
              ))
            )}
          </div>
          <p className="mt-3 text-sm text-slate-400">Turno actual: {snapshot.game.currentTurnSeat ?? 'pendiente'}</p>
          <p className="mt-1 text-sm text-slate-500">Tu puesto: {myMember?.seat ?? 'sin asignar'}</p>
        </div>

        {actionState.error ? <p className="text-sm text-rose-300">{actionState.error}</p> : null}
      </section>

      <aside className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Chat</p>
        <h3 className="mt-2 text-2xl font-semibold text-white">Realtime</h3>
        <div className="mt-4 space-y-3">
          {snapshot.messages.map((message) => (
            <div key={message.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
              <p className="text-sm font-medium text-white">{message.authorName}</p>
              <p className="mt-1 text-sm text-slate-300">{message.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          <textarea
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            rows={3}
            placeholder="Escribe al grupo"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none placeholder:text-slate-500"
          />
          <button onClick={sendChat} disabled={actionState.loading || !chatInput.trim()} className="w-full rounded-2xl border border-white/15 px-4 py-3 font-semibold text-white disabled:opacity-50">
            Enviar
          </button>
        </div>
      </aside>
    </div>
  );
}
