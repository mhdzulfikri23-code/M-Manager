'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { ApiError, apiFetch, setToken } from '@/lib/api';
import type { User } from '@/lib/types';

interface AuthResponse {
  accessToken: string;
  user: User;
}

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isRegister = mode === 'register';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const formData = new FormData(event.currentTarget);

    try {
      const response = await apiFetch<AuthResponse>(`/auth/${isRegister ? 'register' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify({
          ...(isRegister ? { name: formData.get('name') } : {}),
          email: formData.get('email'),
          password: formData.get('password'),
        }),
      });
      setToken(response.accessToken);
      router.replace('/dashboard');
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
              <span>Nama</span>
              <input name="name" type="text" minLength={2} autoComplete="name" required />
              <small>Nama yang tampil di dashboard.</small>
            </label>
          )}
          <label className="field">
            <span>Alamat email</span>
            <input name="email" type="email" autoComplete="email" required />
            <small>Contoh: kamu@email.com</small>
          </label>
          <label className="field">
            <span>Kata sandi</span>
            <input
              name="password"
              type="password"
              minLength={8}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
            />
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
