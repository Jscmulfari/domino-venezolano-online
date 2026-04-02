import { NextResponse } from 'next/server';

export function jsonOk(payload: unknown, init?: ResponseInit) {
  return NextResponse.json(payload, init);
}

export function jsonError(message: string, status = 500, details?: unknown) {
  return NextResponse.json(
    {
      error: message,
      ...(details === undefined ? {} : { details }),
    },
    { status },
  );
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error('JSON inválido en request body');
  }
}

export async function withJsonErrors<T>(handler: () => Promise<T | Response>) {
  try {
    const result = await handler();
    return result instanceof Response ? result : jsonOk(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    const status = message === 'Sala no encontrada' ? 404 : message === 'JSON inválido en request body' ? 400 : 500;
    return jsonError(message, status);
  }
}
