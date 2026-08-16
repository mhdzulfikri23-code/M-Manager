import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Transaksi · Uang Hari Ini' };

export default function TransactionsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
