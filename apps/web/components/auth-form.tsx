'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ApiError, apiFetch, clearToken, getToken, setToken } from '@/lib/api';
import type { User } from '@/lib/types';

interface AuthResponse {
  accessToken: string;
  user: User;
}

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const isRegister = mode === 'register';

  useEffect(() => {
    if (!getToken()) return;
    apiFetch<User>('/auth/me')
      .then((currentUser) => router.replace(currentUser.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard'))
      .catch(() => clearToken());
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const formData = new FormData(event.currentTarget);

    try {
      const response = await apiFetch<AuthResponse>(`/auth/${isRegister ? 'register' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify({
          ...(isRegister ? { username: formData.get('username') } : {}),
          email: formData.get('email'),
          password: formData.get('password'),
        }),
      });
      setToken(response.accessToken);
      router.replace(response.user.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Akun belum bisa diproses. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-poster" aria-labelledby="auth-title">
        <div className="auth-poster__ornament" aria-hidden="true">✱ ❋ ◆</div>
        <p className="auth-poster__date">CATATAN HARIAN · 2026</p>
        <h1 id="auth-title">{isRegister ? 'MULAI CATAT.' : 'BALIK CATAT.'}</h1>
        <p>Jajan masuk. Pemasukan masuk. Sisanya biar angka yang bicara.</p>
      </section>

      <section className="auth-form-wrap" aria-label={isRegister ? 'Daftar akun' : 'Masuk akun'}>
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <h2>{isRegister ? 'Buat akun pribadi' : 'Masuk ke catatanmu'}</h2>
          {isRegister && (
            <label className="field">
              <span>Username / nama akun</span>
              <input name="username" type="text" minLength={3} maxLength={30} pattern="[A-Za-z0-9._-]+" autoComplete="username" required />
              <small>Dipakai sebagai nama tampilan dan untuk login. Huruf besar dan kecil berpengaruh.</small>
            </label>
          )}
          <label className="field">
            <span>{isRegister ? 'Alamat email' : 'Username atau email'}</span>
            <input name="email" type={isRegister ? 'email' : 'text'} autoComplete={isRegister ? 'email' : 'username'} required />
            <small>{isRegister ? 'Contoh: kamu@email.com' : 'Username case-sensitive; email tidak membedakan huruf besar/kecil.'}</small>
          </label>
          <label className="field">
            <span>Kata sandi</span>
            <span className="password-input">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                minLength={8}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                aria-pressed={showPassword}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                  <circle cx="12" cy="12" r="2.75" />
                </svg>
              </button>
            </span>
            <small>Minimal 8 karakter.</small>
          </label>
          {error && <p className="form-error" role="alert">◆ {error}</p>}
          <button className="button button--primary" type="submit" disabled={loading} aria-busy={loading}>
            {loading ? 'Memproses…' : isRegister ? 'Buat akun' : 'Masuk'}
          </button>
          <p className="auth-switch">
            {isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
            <Link href={isRegister ? '/login' : '/register'}>
              {isRegister ? 'Masuk di sini' : 'Daftar sekarang'}
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
