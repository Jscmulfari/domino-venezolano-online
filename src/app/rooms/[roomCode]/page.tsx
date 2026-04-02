import { RoomShell } from '@/components/room-shell';
import { getRoomSnapshot } from '@/lib/server/rooms';

export default async function RoomPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = await params;
  const snapshot = await getRoomSnapshot(roomCode);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#166534_0%,#052e16_45%,#020617_100%)] px-3 py-4 text-white md:px-6 md:py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <RoomShell initialSnapshot={snapshot} />
      </div>
    </main>
  );
}
