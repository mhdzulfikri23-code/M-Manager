import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tabungan Bersama · Uang Hari Ini',
  description: 'Menabung dan memantau target bersama partner.',
};

export default function SavingsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
