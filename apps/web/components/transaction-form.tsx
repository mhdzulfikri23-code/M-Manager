'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { ApiError, apiFetch } from '@/lib/api';
import {
  formatRupiahInput,
  parseRupiahInput,
  todayInputValue,
  type Transaction,
  type TransactionInput,
  type TransactionType,
} from '@/lib/types';

interface TransactionFormProps {
  open: boolean;
  transaction?: Transaction | null;
  onClose: () => void;
  onSaved: () => void;
}

export function TransactionForm({ open, transaction, onClose, onSaved }: TransactionFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [type, setType] = useState<TransactionType>(transaction?.type ?? 'EXPENSE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    setType(transaction?.type ?? 'EXPENSE');
    setError('');
  }, [transaction, open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload: TransactionInput = {
      type,
      amount: parseRupiahInput(formData.get('amount')),
      transactionDate: String(formData.get('transactionDate')),
      description: String(formData.get('description')),
    };

    if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
      setError('Nominal harus lebih besar dari 0. Masukkan jumlah yang benar.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await apiFetch(`/transactions${transaction ? `/${transaction.id}` : ''}`, {
        method: transaction ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
      onSaved();
      onClose();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Transaksi belum tersimpan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="transaction-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <form className="transaction-form" onSubmit={handleSubmit} noValidate>
        <div className="dialog-head">
          <div>
            <p className="ornament" aria-hidden="true">◆</p>
            <h2>{transaction ? 'EDIT CATATAN.' : 'CATAT HARI INI.'}</h2>
          </div>
          <button className="close-button" type="button" onClick={onClose} aria-label="Tutup form">×</button>
        </div>

        <fieldset className="type-switch">
          <legend>Jenis transaksi</legend>
          <label>
            <input
              type="radio"
              name="type"
              value="EXPENSE"
              checked={type === 'EXPENSE'}
              onChange={() => setType('EXPENSE')}
            />
            <span>Pengeluaran</span>
          </label>
          <label>
            <input
              type="radio"
              name="type"
              value="INCOME"
              checked={type === 'INCOME'}
              onChange={() => setType('INCOME')}
            />
            <span>Pemasukan</span>
          </label>
        </fieldset>

        <label className="field">
          <span>Nominal</span>
          <input
            key={`amount-${transaction?.id ?? 'new'}`}
            name="amount"
            type="text"
            inputMode="numeric"
            pattern="[0-9., ]+"
            defaultValue={transaction ? formatRupiahInput(Math.round(Number(transaction.amount))) : ''}
            placeholder="50.000"
            onInput={(event) => {
              event.currentTarget.value = formatRupiahInput(event.currentTarget.value);
            }}
            required
          />
          <small>Boleh pakai titik atau koma, misalnya 50.000.</small>
        </label>

        <label className="field">
          <span>Tanggal</span>
          <input
            key={`date-${transaction?.id ?? 'new'}`}
            name="transactionDate"
            type="date"
            defaultValue={transaction?.transactionDate.slice(0, 10) ?? todayInputValue()}
            required
          />
          <small>Otomatis memakai tanggal hari ini.</small>
        </label>

        <label className="field">
          <span>Keterangan</span>
          <input
            key={`description-${transaction?.id ?? 'new'}`}
            name="description"
            type="text"
            maxLength={160}
            defaultValue={transaction?.description ?? ''}
            placeholder={type === 'EXPENSE' ? 'Makan siang' : 'Gaji harian'}
            required
          />
          <small>Singkat saja, misalnya “Es kopi”.</small>
        </label>

        {error && <p className="form-error" role="alert">◆ {error}</p>}
        <div className="form-actions">
          <button className="button button--secondary" type="button" onClick={onClose}>Batal</button>
          <button className="button button--primary" type="submit" disabled={loading} aria-busy={loading}>
            {loading ? 'Menyimpan…' : transaction ? 'Simpan perubahan' : 'Simpan transaksi'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
