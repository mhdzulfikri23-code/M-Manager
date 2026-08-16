import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Masuk · Uang Hari Ini' };

export default function LoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
