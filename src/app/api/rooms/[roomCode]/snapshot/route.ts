import { getRoomSnapshot } from '@/lib/server/rooms';
import { jsonOk, withJsonErrors } from '@/lib/server/api';

export async function GET(request: Request, { params }: { params: Promise<{ roomCode: string }> }) {
  return withJsonErrors(async () => {
    const { roomCode } = await params;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const snapshot = await getRoomSnapshot(roomCode, sessionId);
    return jsonOk(snapshot);
  });
}
