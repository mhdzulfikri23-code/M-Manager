'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { ApiError, apiFetch } from '@/lib/api';
import {
  formatRupiahInput,
  parseRupiahInput,
  todayInputValue,
  type PartnerCandidate,
  type SavingsGroupSummary,
  type Transaction,
  type TransactionInput,
  type TransactionType,
} from '@/lib/types';

type EntryType = TransactionType | 'SAVINGS';
type SavingsMode = 'EXISTING' | 'NEW';

interface TransactionFormProps {
  open: boolean;
  transaction?: Transaction | null;
  onClose: () => void;
  onSaved: () => void;
}

export function TransactionForm({ open, transaction, onClose, onSaved }: TransactionFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [entryType, setEntryType] = useState<EntryType>(transaction?.type ?? 'EXPENSE');
  const [savingsMode, setSavingsMode] = useState<SavingsMode>('EXISTING');
  const [groups, setGroups] = useState<SavingsGroupSummary[]>([]);
  const [candidates, setCandidates] = useState<PartnerCandidate[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    setEntryType(transaction?.type ?? 'EXPENSE');
    setError('');
    if (!open || transaction) return;

    setOptionsLoading(true);
    Promise.all([
      apiFetch<SavingsGroupSummary[]>('/groups'),
      apiFetch<PartnerCandidate[]>('/groups/candidates'),
    ])
      .then(([groupData, candidateData]) => {
        setGroups(groupData);
        setCandidates(candidateData);
        setSavingsMode(groupData.length > 0 ? 'EXISTING' : 'NEW');
      })
      .catch((caught) => {
        setError(caught instanceof ApiError ? caught.message : 'Pilihan tabungan belum bisa dimuat.');
      })
      .finally(() => setOptionsLoading(false));
  }, [transaction, open]);

  async function saveSavings(formData: FormData, amount: number) {
    const note = String(formData.get('note') ?? '').trim();
    let groupId = String(formData.get('groupId') ?? '');

    if (savingsMode === 'NEW') {
      const partnerEmail = String(formData.get('partnerEmail') ?? '');
      if (!partnerEmail) {
        throw new ApiError('Pilih user yang akan diajak menabung bersama.', 400);
      }
      const goal = parseRupiahInput(formData.get('goal'));
      await apiFetch('/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.get('groupName'),
          partnerEmail,
          initialAmount: amount,
          ...(note ? { initialNote: note } : {}),
          ...(Number.isFinite(goal) ? { goal } : {}),
        }),
      });
      return;
    }

    if (!groupId) {
      throw new ApiError('Pilih tabungan bersama tujuan setoran.', 400);
    }

    await apiFetch(`/groups/${groupId}/deposits`, {
      method: 'POST',
      body: JSON.stringify({ amount, ...(note ? { note } : {}) }),
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const amount = parseRupiahInput(formData.get('amount'));

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Nominal harus lebih besar dari 0. Masukkan jumlah yang benar.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (entryType === 'SAVINGS' && !transaction) {
        await saveSavings(formData, amount);
      } else {
        const payload: TransactionInput = {
          type: entryType as TransactionType,
          amount,
          transactionDate: String(formData.get('transactionDate')),
          description: String(formData.get('description')),
        };
        await apiFetch(`/transactions${transaction ? `/${transaction.id}` : ''}`, {
          method: transaction ? 'PATCH' : 'POST',
          body: JSON.stringify(payload),
        });
      }
      onSaved();
      onClose();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Catatan belum tersimpan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  const isSavings = entryType === 'SAVINGS' && !transaction;

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

        <fieldset className="type-switch" data-edit={Boolean(transaction)}>
          <legend>Jenis transaksi</legend>
          <label>
            <input type="radio" name="type" value="EXPENSE" checked={entryType === 'EXPENSE'} onChange={() => setEntryType('EXPENSE')} />
            <span>Pengeluaran</span>
          </label>
          <label>
            <input type="radio" name="type" value="INCOME" checked={entryType === 'INCOME'} onChange={() => setEntryType('INCOME')} />
            <span>Pemasukan</span>
          </label>
          {!transaction && (
            <label>
              <input type="radio" name="type" value="SAVINGS" checked={entryType === 'SAVINGS'} onChange={() => setEntryType('SAVINGS')} />
              <span>Tabungan bersama</span>
            </label>
          )}
        </fieldset>

        {isSavings && (
          <div className="savings-form-fields">
            <label className="field">
              <span>Mau melakukan apa?</span>
              <select value={savingsMode} onChange={(event) => setSavingsMode(event.target.value as SavingsMode)} disabled={optionsLoading}>
                {groups.length > 0 && <option value="EXISTING">Setor ke tabungan yang ada</option>}
                <option value="NEW">Buat tabungan bersama baru</option>
              </select>
            </label>

            {savingsMode === 'EXISTING' ? (
              <label className="field">
                <span>Pilih tabungan</span>
                <select name="groupId" required disabled={optionsLoading}>
                  {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                </select>
                <small>Setoran akan terlihat oleh seluruh anggota tabungan.</small>
              </label>
            ) : (
              <>
                <label className="field">
                  <span>Nama tabungan</span>
                  <input name="groupName" minLength={2} maxLength={60} placeholder="Contoh: Liburan akhir tahun" required />
                </label>
                <label className="field">
                  <span>Nabung bersama siapa?</span>
                  <select name="partnerEmail" required disabled={optionsLoading || candidates.length === 0} defaultValue="">
                    <option value="" disabled>{candidates.length > 0 ? 'Pilih user' : 'Belum ada user lain'}</option>
                    {candidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.email}>@{candidate.username} — {candidate.name} ({candidate.email})</option>
                    ))}
                  </select>
                  <small>User yang muncul adalah akun yang sudah register.</small>
                </label>
                <label className="field">
                  <span>Target tabungan (opsional)</span>
                  <input name="goal" inputMode="numeric" placeholder="10.000.000" onInput={(event) => {
                    event.currentTarget.value = formatRupiahInput(event.currentTarget.value);
                  }} />
                </label>
              </>
            )}
          </div>
        )}

        <label className="field">
          <span>{isSavings ? 'Nominal setoran' : 'Nominal'}</span>
          <input
            key={`amount-${transaction?.id ?? entryType}`}
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

        {isSavings ? (
          <label className="field">
            <span>Catatan setoran (opsional)</span>
            <input name="note" type="text" maxLength={160} placeholder="Setoran minggu ini" />
          </label>
        ) : (
          <>
            <label className="field">
              <span>Tanggal</span>
              <input key={`date-${transaction?.id ?? 'new'}`} name="transactionDate" type="date" defaultValue={transaction?.transactionDate.slice(0, 10) ?? todayInputValue()} required />
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
                placeholder={entryType === 'EXPENSE' ? 'Makan siang' : 'Gaji harian'}
                required
              />
              <small>Singkat saja, misalnya “Es kopi”.</small>
            </label>
          </>
        )}

        {error && <p className="form-error" role="alert">◆ {error}</p>}
        <div className="form-actions">
          <button className="button button--secondary" type="button" onClick={onClose}>Batal</button>
          <button className="button button--primary" type="submit" disabled={loading || (isSavings && optionsLoading)} aria-busy={loading}>
            {loading ? 'Menyimpan…' : transaction ? 'Simpan perubahan' : isSavings ? 'Simpan setoran' : 'Simpan transaksi'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
