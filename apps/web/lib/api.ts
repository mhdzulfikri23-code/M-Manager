const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

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
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { message?: string | string[] }
      | null;
    const message = Array.isArray(body?.message) ? body.message[0] : body?.message;
    throw new ApiError(message ?? 'Permintaan gagal. Periksa koneksi lalu coba lagi.', response.status);
  }

  return response.json() as Promise<T>;
}
