'use client';

import { useEffect, useState } from 'react';
import { apiFetch, clearToken, getToken } from './api';
import type { User } from './types';

export function useAuthGuard() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      window.location.replace('/login');
      return;
    }

    apiFetch<User>('/auth/me')
      .then(setUser)
      .catch(() => {
        clearToken();
        window.location.replace('/login');
      })
      .finally(() => setChecking(false));
  }, []);

  return { user, checking };
}
