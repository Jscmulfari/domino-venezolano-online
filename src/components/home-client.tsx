'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchJson } from '@/lib/client/fetch';

function makeSessionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `session-${Math.random().toString(36).slice(2)}`;
}

function getStoredSessionId() {
  const existing = window.localStorage.getItem('domino:session-id');
  if (existing) return existing;

  const next = makeSessionId();
  window.localStorage.setItem('domino:session-id', next);
  return next;
}

export function HomeClient() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('Mesa familiar');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createRoom() {
    setLoading(true);
    setError(null);

    try {
      const sessionId = getStoredSessionId();
      window.localStorage.setItem('domino:display-name', displayName.trim());

      const result = await fetchJson<{ roomCode: string }>('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, roomName, sessionId }),
      });

      if (!result.ok) throw new Error(result.error);
      router.push(`/rooms/${result.data.roomCode}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  async function joinRoom() {
    setLoading(true);
    setError(null);

    try {
      const sessionId = getStoredSessionId();
      const normalizedCode = roomCode.trim().toUpperCase();
      window.localStorage.setItem('domino:display-name', displayName.trim());

      const result = await fetchJson<{ roomCode: string }>('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, roomCode: normalizedCode, sessionId }),
      });

      if (!result.ok) throw new Error(result.error);
      router.push(`/rooms/${result.data.roomCode}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || !displayName.trim();

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <div className="rounded-3xl border border-white/10 bg-black/15 p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-amber-200/70">Qué ya se siente real</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <h2 className="text-xl font-semibold">Mesa visual</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Tablero central con fichas visibles y posiciones de 4 jugadores.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <h2 className="text-xl font-semibold">Mano privada</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Cada dispositivo ve solo su mano cuando la partida inicia.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <h2 className="text-xl font-semibold">Turnos</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Se marca turno actual y solo deja jugar fichas válidas básicas.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <h2 className="text-xl font-semibold">Realtime</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Mesa, manos y jugadas se sincronizan por Supabase.</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-amber-400/20 bg-black/20 p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-amber-300">Entrar a jugar</p>
        <div className="mt-4 space-y-4">
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Tu nombre"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none placeholder:text-slate-500"
          />
          <input
            value={roomName}
            onChange={(event) => setRoomName(event.target.value)}
            placeholder="Nombre de mesa"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none placeholder:text-slate-500"
          />
          <button onClick={createRoom} disabled={disabled} className="w-full rounded-2xl bg-amber-300 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50">
            {loading ? 'Procesando...' : 'Crear mesa'}
          </button>
          <div className="h-px bg-white/10" />
          <input
            value={roomCode}
            onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
            placeholder="Código de mesa"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white uppercase outline-none placeholder:text-slate-500"
          />
          <button onClick={joinRoom} disabled={disabled || !roomCode.trim()} className="w-full rounded-2xl border border-white/15 px-4 py-3 font-semibold text-white disabled:opacity-50">
            Entrar por código
          </button>
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}
