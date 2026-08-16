import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Daftar · Uang Hari Ini' };

export default function RegisterLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
