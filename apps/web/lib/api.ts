const DIRECT_API_URL = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');
const API_BASE = DIRECT_API_URL || '/api';
const READ_RETRY_DELAYS_MS = [350, 800];

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export const getToken = () =>
  typeof window === 'undefined' ? null : window.localStorage.getItem('money-manager-token');

export const setToken = (token: string) => {
  window.localStorage.setItem('money-manager-token', token);
};

export const clearToken = () => {
  window.localStorage.removeItem('money-manager-token');
};

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const method = (init.method ?? 'GET').toUpperCase();
  const retryDelays = method === 'GET' || method === 'HEAD' ? READ_RETRY_DELAYS_MS : [];

  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...init.headers,
        },
      });

      if (!response.ok) {
        if (response.status >= 500 && attempt < retryDelays.length) {
          await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt]));
          continue;
        }
        const body = (await response.json().catch(() => null)) as
          | { message?: string | string[] }
          | null;
        const message = Array.isArray(body?.message) ? body.message[0] : body?.message;
        throw new ApiError(message ?? 'Server sedang tidak siap. Silakan coba lagi.', response.status);
      }

      return response.json() as Promise<T>;
    } catch (caught) {
      if (caught instanceof ApiError) throw caught;
      if (attempt < retryDelays.length) {
        await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt]));
        continue;
      }
      if (caught instanceof DOMException && caught.name === 'AbortError') {
        throw new ApiError('Server terlalu lama merespons. Silakan coba lagi.', 408);
      }
      throw new ApiError('Tidak dapat terhubung ke server. Pastikan layanan API sedang aktif.', 0);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new ApiError('Tidak dapat terhubung ke server.', 0);
}
