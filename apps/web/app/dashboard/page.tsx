'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { TransactionForm } from '@/components/transaction-form';
import { ApiError, apiFetch } from '@/lib/api';
import { formatDate, formatRupiah, todayInputValue, type Summary, type Transaction } from '@/lib/types';
import { useAuthGuard } from '@/lib/use-auth-guard';

const RECENT_TRANSACTION_LIMIT = 5;

function useAnimatedNumber(value: number) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(value);
      return;
    }
    const start = performance.now();
    const duration = 400;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return displayValue;
}

export default function DashboardPage() {
  const { user, checking } = useAuthGuard();
  const [summary, setSummary] = useState<Summary>({ balance: 0, monthlyIncome: 0, monthlyExpense: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const animatedBalance = useAnimatedNumber(summary.balance);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryData, transactionData] = await Promise.all([
        apiFetch<Summary>(`/transactions/summary?month=${todayInputValue().slice(0, 7)}`),
        apiFetch<Transaction[]>(`/transactions?limit=${RECENT_TRANSACTION_LIMIT}`),
      ]);
      setSummary(summaryData);
      setTransactions(transactionData);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Dashboard belum bisa dimuat. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!checking && user) void loadData();
  }, [checking, loadData, user]);

  if (checking) return <div className="loading-screen" role="status">Membuka catatan…</div>;

  return (
    <AppShell user={user}>
      <main className="dashboard-shell">
        <section className="balance-hero" aria-labelledby="balance-title">
          <div>
            <p className="today-copy">Hari ini cukup catat yang terjadi.</p>
            <h1 id="balance-title">SALDO YANG TERSISA.</h1>
          </div>
          <p className="balance-figure" aria-live="polite">
            {loading ? '—' : formatRupiah(animatedBalance)}
          </p>
          <button className="button button--primary hero-action" type="button" onClick={() => setFormOpen(true)}>
            + Catat transaksi
          </button>
        </section>

        {error && <p className="page-error" role="alert">◆ {error}</p>}

        <section className="monthly-pair" aria-label="Ringkasan bulan ini">
          <article className="summary-block summary-block--income">
            <p>Pemasukan bulan ini</p>
            <strong>{loading ? '—' : formatRupiah(summary.monthlyIncome)}</strong>
            <span>Masuk</span>
          </article>
          <article className="summary-block summary-block--expense">
            <p>Pengeluaran bulan ini</p>
            <strong>{loading ? '—' : formatRupiah(summary.monthlyExpense)}</strong>
            <span>Keluar</span>
          </article>
        </section>

        <div className="ornament-divider" aria-hidden="true">✱ ✱ ✱ ✱</div>

        <section className="recent-section" aria-labelledby="recent-title">
          <div className="section-head">
            <h2 id="recent-title">TRANSAKSI TERAKHIR.</h2>
            <Link className="text-link" href="/transactions">Lihat semua →</Link>
          </div>
          {transactions.length === 0 && !loading ? (
            <div className="empty-state">
              <span aria-hidden="true">❋</span>
              <p>Belum ada catatan. Tambahkan jajan atau pemasukan pertama hari ini.</p>
              <button className="button button--secondary" type="button" onClick={() => setFormOpen(true)}>
                Catat sekarang
              </button>
            </div>
          ) : (
            <div className="transaction-sheet" role="list" aria-busy={loading}>
              {loading ? (
                Array.from({ length: 3 }).map((_, index) => <div className="skeleton-row" key={index} />)
              ) : (
                transactions.map((transaction) => (
                  <article className="transaction-row" role="listitem" key={transaction.id}>
                    <div>
                      <strong>{transaction.description}</strong>
                      <span>{formatDate(transaction.transactionDate)}</span>
                    </div>
                    <p className={transaction.type === 'INCOME' ? 'amount amount--income' : 'amount amount--expense'}>
                      <span aria-hidden="true">{transaction.type === 'INCOME' ? '+' : '−'}</span>
                      {formatRupiah(transaction.amount)}
                    </p>
                  </article>
                ))
              )}
            </div>
          )}
        </section>
      </main>

      <TransactionForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={loadData} />
    </AppShell>
  );
}
