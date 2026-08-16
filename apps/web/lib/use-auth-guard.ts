'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, clearToken, getToken } from './api';
import type { User } from './types';

export function useAuthGuard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }

    apiFetch<User>('/auth/me')
      .then(setUser)
      .catch(() => {
        clearToken();
        router.replace('/login');
      })
      .finally(() => setChecking(false));
  }, [router]);

  return { user, checking };
}
