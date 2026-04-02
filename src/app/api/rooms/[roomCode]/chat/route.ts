import { createServerSupabase } from '@/lib/supabase/server';
import { jsonError, jsonOk, readJsonBody, withJsonErrors } from '@/lib/server/api';

export async function POST(request: Request, { params }: { params: Promise<{ roomCode: string }> }) {
  return withJsonErrors(async () => {
    const { roomCode } = await params;
    const body = await readJsonBody<{ authorName?: string; sessionId?: string; text?: string }>(request);
    const authorName = body.authorName?.trim();
    const sessionId = body.sessionId?.trim();
    const text = body.text?.trim();

    if (!authorName || !sessionId || !text) {
      return jsonError('authorName, sessionId y text son requeridos', 400);
    }

    const supabase = createServerSupabase();
    const { data: room, error: roomError } = await supabase.from('rooms').select('id').eq('code', roomCode.toUpperCase()).maybeSingle();

    if (roomError) return jsonError(roomError.message, 500);
    if (!room) return jsonError('Sala no encontrada', 404);

    const { error } = await supabase.from('chat_messages').insert({
      room_id: room.id,
      session_id: sessionId,
      author_name: authorName,
      body: text,
    });

    if (error) return jsonError(error.message, 500);

    return jsonOk({ ok: true });
  });
}
