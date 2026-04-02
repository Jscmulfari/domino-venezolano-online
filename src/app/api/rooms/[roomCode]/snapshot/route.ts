import { getRoomSnapshot } from '@/lib/server/rooms';
import { jsonOk, withJsonErrors } from '@/lib/server/api';

export async function GET(_request: Request, { params }: { params: Promise<{ roomCode: string }> }) {
  return withJsonErrors(async () => {
    const { roomCode } = await params;
    const snapshot = await getRoomSnapshot(roomCode);
    return jsonOk(snapshot);
  });
}
