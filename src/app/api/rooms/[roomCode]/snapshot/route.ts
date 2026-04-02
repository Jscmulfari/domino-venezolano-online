import { NextResponse } from 'next/server';
import { getRoomSnapshot } from '@/lib/server/rooms';

export async function GET(_request: Request, { params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = await params;
  const snapshot = await getRoomSnapshot(roomCode);
  return NextResponse.json(snapshot);
}
