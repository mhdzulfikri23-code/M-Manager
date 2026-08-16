'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { TransactionForm } from '@/components/transaction-form';
import { ApiError, apiFetch } from '@/lib/api';
import {
  formatDate,
  formatRupiah,
  type Transaction,
  type TransactionInput,
  type TransactionType,
} from '@/lib/types';
import { useAuthGuard } from '@/lib/use-auth-guard';

type Filter = 'ALL' | TransactionType;

export default function TransactionsPage() {
  const { user, checking } = useAuthGuard();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [undoItem, setUndoItem] = useState<Transaction | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (filter !== 'ALL') params.set('type', filter);
    if (month) params.set('month', month);
    try {
      setTransactions(await apiFetch<Transaction[]>(`/transactions?${params.toString()}`));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Riwayat belum bisa dimuat. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [filter, month]);

  useEffect(() => {
    if (!checking && user) void loadTransactions();
  }, [checking, loadTransactions, user]);

  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);

  async function removeTransaction(transaction: Transaction) {
    setTransactions((current) => current.filter((item) => item.id !== transaction.id));
    setUndoItem(transaction);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoItem(null), 8000);
    try {
      await apiFetch(`/transactions/${transaction.id}`, { method: 'DELETE' });
    } catch (caught) {
      setTransactions((current) => [transaction, ...current]);
      setUndoItem(null);
      setError(caught instanceof ApiError ? caught.message : 'Transaksi belum terhapus. Coba lagi.');
    }
  }

  async function undoDelete() {
    if (!undoItem) return;
    const payload: TransactionInput = {
      type: undoItem.type,
      amount: Number(undoItem.amount),
      category: undoItem.category,
      description: undoItem.description,
      transactionDate: undoItem.transactionDate.slice(0, 10),
    };
    try {
      await apiFetch('/transactions', { method: 'POST', body: JSON.stringify(payload) });
      setUndoItem(null);
      await loadTransactions();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Penghapusan belum bisa dibatalkan.');
    }
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  if (checking) return <div className="loading-screen" role="status">Membuka riwayat…</div>;

  return (
    <AppShell user={user}>
      <main className="transactions-shell">
        <header className="page-title-row">
          <div>
            <p>Semua yang masuk dan keluar.</p>
            <h1>RIWAYAT UANG.</h1>
          </div>
          <button className="button button--primary" type="button" onClick={openCreate}>+ Catat transaksi</button>
        </header>

        <section className="filters" aria-label="Filter transaksi">
          <div className="filter-tabs" role="group" aria-label="Jenis transaksi">
            {([
              ['ALL', 'Semua'],
              ['INCOME', 'Pemasukan'],
              ['EXPENSE', 'Pengeluaran'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="month-filter">
            <span>Bulan</span>
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          </label>
        </section>

        {error && <p className="page-error" role="alert">◆ {error}</p>}

        <section className="history" aria-live="polite">
          {loading ? (
            <div className="transaction-sheet" aria-busy="true">
              {Array.from({ length: 5 }).map((_, index) => <div className="skeleton-row" key={index} />)}
            </div>
          ) : transactions.length === 0 ? (
            <div className="empty-state">
              <span aria-hidden="true">❋</span>
              <p>Tidak ada transaksi untuk filter ini. Ubah filter atau catat transaksi baru.</p>
              <button className="button button--secondary" type="button" onClick={openCreate}>Catat sekarang</button>
            </div>
          ) : (
            <div className="history-table-wrap">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Keterangan</th>
                    <th>Kategori</th>
                    <th>Jenis</th>
                    <th>Nominal</th>
                    <th><span className="visually-hidden">Aksi</span></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td data-label="Tanggal">{formatDate(transaction.transactionDate)}</td>
                      <td data-label="Keterangan"><strong>{transaction.description}</strong></td>
                      <td data-label="Kategori">{transaction.category}</td>
                      <td data-label="Jenis">
                        <span className={`type-mark type-mark--${transaction.type.toLowerCase()}`}>
                          {transaction.type === 'INCOME' ? '＋ Pemasukan' : '− Pengeluaran'}
                        </span>
                      </td>
                      <td data-label="Nominal" className={transaction.type === 'INCOME' ? 'amount amount--income' : 'amount amount--expense'}>
                        {transaction.type === 'INCOME' ? '+' : '−'}{formatRupiah(transaction.amount)}
                      </td>
                      <td className="row-actions">
                        <button type="button" onClick={() => { setEditing(transaction); setFormOpen(true); }}>Edit</button>
                        <button type="button" onClick={() => void removeTransaction(transaction)}>Hapus</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {undoItem && (
        <div className="undo-toast" role="status">
          <span>“{undoItem.description}” dihapus.</span>
          <button type="button" onClick={() => void undoDelete()}>Batalkan</button>
        </div>
      )}

      <TransactionForm
        open={formOpen}
        transaction={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={loadTransactions}
      />
    </AppShell>
  );
}
