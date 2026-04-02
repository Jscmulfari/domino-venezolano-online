import { RoomShell } from '@/components/room-shell';
import { getRoomSnapshot } from '@/lib/server/rooms';

export default async function RoomPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = await params;
  const snapshot = await getRoomSnapshot(roomCode);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Sala privada</p>
          <h1 className="mt-2 text-3xl font-semibold">{snapshot.room.name}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">Código {snapshot.room.code}. Chat realtime, puestos y mesa compartida.</p>
        </div>
        <RoomShell initialSnapshot={snapshot} />
      </div>
    </main>
  );
}
