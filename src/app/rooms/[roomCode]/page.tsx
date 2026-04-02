import { RoomShell } from '@/components/room-shell';
import type { ChatMessage, RoomMember } from '@/lib/domino/types';

const members: RoomMember[] = [
  { id: '1', roomId: 'demo', playerId: 'p1', displayName: 'Ana', seat: 'north', online: true, joinedAt: new Date().toISOString() },
  { id: '2', roomId: 'demo', playerId: 'p2', displayName: 'Luis', seat: 'east', online: true, joinedAt: new Date().toISOString() },
  { id: '3', roomId: 'demo', playerId: 'p3', displayName: 'Majo', seat: 'south', online: true, joinedAt: new Date().toISOString() },
  { id: '4', roomId: 'demo', playerId: 'p4', displayName: 'Carlos', seat: 'west', online: false, joinedAt: new Date().toISOString() },
];

const messages: ChatMessage[] = [
  { id: 'm1', roomId: 'demo', authorId: 'p1', authorName: 'Ana', body: '¿Jugamos a 100 puntos?', createdAt: new Date().toISOString() },
  { id: 'm2', roomId: 'demo', authorId: 'p2', authorName: 'Luis', body: 'Sí, y con reglas venezolanas.', createdAt: new Date().toISOString() },
];

export default async function RoomPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = await params;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Sala privada</p>
          <h1 className="mt-2 text-3xl font-semibold">Dominó en tiempo real</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">Shell inicial de tablero, sidebar y chat para continuar el MVP.</p>
        </div>
        <RoomShell roomCode={roomCode} members={members} messages={messages} />
      </div>
    </main>
  );
}
