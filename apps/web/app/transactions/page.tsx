'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
const TRANSACTIONS_PER_PAGE = 5;

function paginationPages(currentPage: number, totalPages: number) {
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  return [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
}

export default function TransactionsPage() {
  const { user, checking } = useAuthGuard();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [month, setMonth] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [undoItem, setUndoItem] = useState<Transaction | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyScrollRef = useRef<HTMLDivElement>(null);
  const totalPages = Math.max(1, Math.ceil(transactions.length / TRANSACTIONS_PER_PAGE));
  const pageStart = (page - 1) * TRANSACTIONS_PER_PAGE;
  const visibleTransactions = useMemo(
    () => transactions.slice(pageStart, pageStart + TRANSACTIONS_PER_PAGE),
    [pageStart, transactions],
  );
  const visiblePages = useMemo(() => paginationPages(page, totalPages), [page, totalPages]);

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

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function goToPage(nextPage: number) {
    setPage(Math.min(Math.max(nextPage, 1), totalPages));
    historyScrollRef.current?.scrollTo({ top: 0 });
  }

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
                onClick={() => { setFilter(value); setPage(1); }}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="month-filter">
            <span>Bulan</span>
            <input
              type="month"
              value={month}
              onChange={(event) => { setMonth(event.target.value); setPage(1); }}
            />
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
            <>
            <div
              className="history-table-wrap"
              ref={historyScrollRef}
              tabIndex={0}
              aria-label="Daftar transaksi, dapat digulir"
            >
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Keterangan</th>
                    <th>Jenis</th>
                    <th>Nominal</th>
                    <th><span className="visually-hidden">Aksi</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td data-label="Tanggal">{formatDate(transaction.transactionDate)}</td>
                      <td data-label="Keterangan"><strong>{transaction.description}</strong></td>
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
            <nav className="pagination" aria-label="Navigasi halaman riwayat transaksi">
              <p>
                Menampilkan {pageStart + 1}–{Math.min(pageStart + TRANSACTIONS_PER_PAGE, transactions.length)} dari{' '}
                {transactions.length} transaksi
              </p>
              <div className="pagination__controls">
                <button type="button" onClick={() => goToPage(page - 1)} disabled={page === 1}>
                  ← Sebelumnya
                </button>
                {visiblePages.map((pageNumber, index) => (
                  <span className="pagination__page" key={pageNumber}>
                    {index > 0 && pageNumber - visiblePages[index - 1] > 1 && (
                      <span className="pagination__ellipsis" aria-hidden="true">…</span>
                    )}
                    <button
                      type="button"
                      aria-label={`Buka halaman ${pageNumber}`}
                      aria-current={page === pageNumber ? 'page' : undefined}
                      onClick={() => goToPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  </span>
                ))}
                <button type="button" onClick={() => goToPage(page + 1)} disabled={page === totalPages}>
                  Berikutnya →
                </button>
              </div>
            </nav>
            </>
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
