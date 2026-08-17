import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Super Admin · Uang Hari Ini',
  description: 'Ringkasan pengguna dan seluruh tabungan bersama.',
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
