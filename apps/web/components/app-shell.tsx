'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { clearToken } from '@/lib/api';
import type { User } from '@/lib/types';

export function AppShell({ children, user }: { children: ReactNode; user: User | null }) {
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    clearToken();
    router.replace('/login');
  }

  return (
    <div className="app-frame">
      <header className="site-header">
        <div className="site-header__top">
          <Link className="wordmark" href={user?.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard'}>UANG HARI INI</Link>
          <span className="user-note">{user ? `Akun ${user.name}` : 'Akun pengguna'}</span>
        </div>
        <nav className="main-nav" aria-label="Navigasi utama">
          <div className="main-nav__links">
            {user?.role === 'SUPER_ADMIN' ? (
              <Link aria-current={pathname === '/admin' ? 'page' : undefined} href="/admin">
                Admin
              </Link>
            ) : (
              <>
                <Link aria-current={pathname === '/dashboard' ? 'page' : undefined} href="/dashboard">
                  Dashboard
                </Link>
                <Link aria-current={pathname === '/transactions' ? 'page' : undefined} href="/transactions">
                  Transaksi
                </Link>
              </>
            )}
          </div>
          <button className="text-button" type="button" onClick={logout}>Keluar</button>
        </nav>
      </header>

      {children}

      <footer className="foot-marquee" aria-label="Penutup animasi; fokus untuk menjeda" tabIndex={0}>
        <div className="foot-marquee__track" aria-hidden="true">
          <span>CATAT JAJAN ◆ CATAT MASUK ◆ TAHU SISANYA ◆ </span>
          <span>CATAT JAJAN ◆ CATAT MASUK ◆ TAHU SISANYA ◆ </span>
        </div>
        <p className="visually-hidden">Catat jajan. Catat pemasukan. Tahu sisanya.</p>
      </footer>
    </div>
  );
}
