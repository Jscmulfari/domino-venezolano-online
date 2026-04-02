export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

async function parseJsonSafely(response: Response) {
  const text = await response.text();

  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error('Respuesta inválida del servidor');
  }
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const response = await fetch(input, init);
    const payload = await parseJsonSafely(response);

    if (!response.ok) {
      const message =
        payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
          ? payload.error
          : `Error HTTP ${response.status}`;

      return { ok: false, error: message, status: response.status };
    }

    if (payload === null) {
      return { ok: false, error: 'Respuesta vacía del servidor', status: response.status };
    }

    return { ok: true, data: payload as T };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Error de red',
      status: 0,
    };
  }
}
