'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { ApiError, apiFetch } from '@/lib/api';
import { formatDate, formatRupiah, type SavingsGroupDetail } from '@/lib/types';
import { useAuthGuard } from '@/lib/use-auth-guard';

const USERS_PER_PAGE = 5;
const DEPOSITS_PER_PAGE = 3;

interface AdminSaving {
  userId: string;
  name: string;
  username: string;
  email: string;
  role: 'USER' | 'SUPER_ADMIN';
  income: number;
  expense: number;
  balance: number;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, checking } = useAuthGuard();
  const [users, setUsers] = useState<AdminSaving[]>([]);
  const [groups, setGroups] = useState<SavingsGroupDetail[]>([]);
  const [selectedUserIndex, setSelectedUserIndex] = useState(0);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
  const [depositPage, setDepositPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [editingUser, setEditingUser] = useState<AdminSaving | null>(null);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editError, setEditError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [userData, groupData] = await Promise.all([
        apiFetch<AdminSaving[]>('/admin/savings'),
        apiFetch<SavingsGroupDetail[]>('/admin/shared-savings'),
      ]);
      setUsers(userData);
      setGroups(groupData);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Data admin belum bisa dimuat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (checking || !user) return;
    if (user.role !== 'SUPER_ADMIN') {
      router.replace('/dashboard');
      return;
    }
    void loadData();
  }, [checking, loadData, router, user]);

  const regularUsers = useMemo(() => users.filter((item) => item.role === 'USER'), [users]);
  const selectedUser = regularUsers[selectedUserIndex] ?? null;
  const selectedUserGroups = useMemo(
    () => selectedUser ? groups.filter((group) => group.members.some((member) => member.userId === selectedUser.userId)) : [],
    [groups, selectedUser],
  );
  const selectedGroup = selectedUserGroups[selectedGroupIndex] ?? null;
  const totalShared = useMemo(() => groups.reduce((sum, group) => sum + group.totalDeposited, 0), [groups]);
  const depositPages = Math.max(1, Math.ceil((selectedGroup?.deposits.length ?? 0) / DEPOSITS_PER_PAGE));
  const visibleDeposits = selectedGroup?.deposits.slice(
    (depositPage - 1) * DEPOSITS_PER_PAGE,
    depositPage * DEPOSITS_PER_PAGE,
  ) ?? [];
  const userPages = Math.max(1, Math.ceil(users.length / USERS_PER_PAGE));
  const visibleUsers = users.slice((userPage - 1) * USERS_PER_PAGE, userPage * USERS_PER_PAGE);

  useEffect(() => {
    if (selectedUserIndex >= regularUsers.length) setSelectedUserIndex(Math.max(0, regularUsers.length - 1));
  }, [regularUsers.length, selectedUserIndex]);

  useEffect(() => {
    if (selectedGroupIndex >= selectedUserGroups.length) setSelectedGroupIndex(Math.max(0, selectedUserGroups.length - 1));
  }, [selectedGroupIndex, selectedUserGroups.length]);

  useEffect(() => {
    if (userPage > userPages) setUserPage(userPages);
  }, [userPage, userPages]);

  function selectUser(userId: string) {
    const nextIndex = regularUsers.findIndex((item) => item.userId === userId);
    if (nextIndex < 0) return;
    setSelectedUserIndex(nextIndex);
    setSelectedGroupIndex(0);
    setDepositPage(1);
  }

  function slideGroup(direction: number) {
    if (selectedUserGroups.length === 0) return;
    setSelectedGroupIndex((current) => (current + direction + selectedUserGroups.length) % selectedUserGroups.length);
    setDepositPage(1);
  }

  async function updateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const username = String(data.get('username') ?? '').trim();
    const email = String(data.get('email') ?? '').trim().toLowerCase();
    const password = String(data.get('password') ?? '');
    setEditError('');

    const usernameAlreadyUsed = users.some((item) => item.userId !== editingUser.userId && item.username === username);
    if (usernameAlreadyUsed) {
      setEditError(`Username @${username} sudah digunakan oleh akun lain. Gunakan username berbeda.`);
      (form.elements.namedItem('username') as HTMLInputElement | null)?.focus();
      return;
    }

    const emailAlreadyUsed = users.some((item) => item.userId !== editingUser.userId && item.email.toLowerCase() === email);
    if (emailAlreadyUsed) {
      setEditError(`Email ${email} sudah digunakan oleh akun lain. Gunakan email berbeda.`);
      (form.elements.namedItem('email') as HTMLInputElement | null)?.focus();
      return;
    }

    setSavingUser(true);
    try {
      await apiFetch(`/admin/users/${editingUser.userId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          username,
          email,
          ...(password ? { password } : {}),
        }),
      });
      setEditingUser(null);
      setShowEditPassword(false);
      setNotice(`Akun @${username} berhasil diperbarui.`);
      await loadData();
    } catch (caught) {
      setEditError(caught instanceof ApiError ? caught.message : 'Akun belum bisa diperbarui.');
    } finally {
      setSavingUser(false);
    }
  }

  if (checking || (user && user.role !== 'SUPER_ADMIN')) {
    return <div className="loading-screen" role="status">Memeriksa akses admin…</div>;
  }

  return (
    <AppShell user={user}>
      <main className="admin-shell">
        <section className="page-title-row">
          <div>
            <p className="page-kicker">Akses pemantauan super admin</p>
            <h1>PANTAU SEMUA TABUNGAN.</h1>
          </div>
          <button className="button button--secondary" type="button" onClick={() => void loadData()} disabled={loading}>Muat ulang</button>
        </section>

        {error && <p className="page-error" role="alert">◆ {error}</p>}
        {notice && <p className="page-notice" role="status">◆ {notice}</p>}

        <section className="admin-stats" aria-label="Ringkasan sistem">
          <article><span>Total akun</span><strong>{loading ? '—' : users.length}</strong></article>
          <article><span>Tabungan bersama</span><strong>{loading ? '—' : groups.length}</strong></article>
          <article><span>Dana bersama</span><strong>{loading ? '—' : formatRupiah(totalShared)}</strong></article>
        </section>

        <section className="admin-section" aria-labelledby="shared-admin-title">
          <div className="section-head">
            <div>
              <p className="page-kicker">Pilih user dengan tombol geser</p>
              <h2 id="shared-admin-title">TABUNGAN BERSAMA PER USER.</h2>
            </div>
          </div>

          {regularUsers.length === 0 && !loading ? <p className="muted-copy">Belum ada akun user untuk dipantau.</p> : selectedUser && (
            <>
              <div className="admin-user-picker">
                <label className="field">
                  <span>Pilih user yang ingin dipantau</span>
                  <select value={selectedUser.userId} onChange={(event) => selectUser(event.target.value)}>
                    {regularUsers.map((item) => (
                      <option key={item.userId} value={item.userId}>{item.name} — @{item.username}</option>
                    ))}
                  </select>
                </label>
                <article>
                  <span>User {selectedUserIndex + 1} dari {regularUsers.length}</span>
                  <h3>{selectedUser.name}</h3>
                  <p>@{selectedUser.username} · {selectedUser.email}</p>
                  <strong>Saldo pribadi {formatRupiah(selectedUser.balance)}</strong>
                </article>
              </div>

              {selectedUserGroups.length === 0 ? (
                <div className="empty-state"><span aria-hidden="true">❋</span><p>User ini belum memiliki tabungan bersama.</p></div>
              ) : selectedGroup && (
                <div className="admin-saving-slider">
                  <div className="admin-slider-head">
                    <button type="button" onClick={() => slideGroup(-1)} aria-label="Tabungan sebelumnya">‹</button>
                    <p>Tabungan {selectedGroupIndex + 1} dari {selectedUserGroups.length}</p>
                    <button type="button" onClick={() => slideGroup(1)} aria-label="Tabungan berikutnya">›</button>
                  </div>

                  <article className="admin-group">
                    <header>
                      <div>
                        <h3>{selectedGroup.name}</h3>
                        <p>Dibuat {formatDate(selectedGroup.createdAt)} · {selectedGroup.members.length} anggota</p>
                      </div>
                      <strong>{formatRupiah(selectedGroup.totalDeposited)}</strong>
                    </header>
                    {selectedGroup.goal && (
                      <p className="admin-goal">Target {formatRupiah(selectedGroup.goal)} · {Math.min(100, Math.round(selectedGroup.totalDeposited / selectedGroup.goal * 100))}% tercapai</p>
                    )}
                    <div className="admin-member-table" role="table" aria-label={`Kontribusi anggota ${selectedGroup.name}`}>
                      {selectedGroup.members.map((member) => (
                        <div className="admin-member-row" role="row" key={member.userId} data-selected={member.userId === selectedUser.userId}>
                          <div role="cell"><strong>{member.name}</strong><span>{member.email}</span></div>
                          <b role="cell">{formatRupiah(member.total)}</b>
                        </div>
                      ))}
                    </div>

                    <section className="admin-deposit-history" aria-labelledby="deposit-history-title">
                      <div className="section-head">
                        <h3 id="deposit-history-title">3 RIWAYAT SETORAN.</h3>
                        <span>{selectedGroup.deposits.length} total</span>
                      </div>
                      <div className="admin-deposits">
                        {visibleDeposits.length === 0 ? <p>Belum ada setoran.</p> : visibleDeposits.map((deposit) => (
                          <p key={deposit.id}>
                            <span>{deposit.name} · {formatDate(deposit.createdAt)}{deposit.note ? ` · ${deposit.note}` : ''}</span>
                            <strong>+{formatRupiah(deposit.amount)}</strong>
                          </p>
                        ))}
                      </div>
                      {selectedGroup.deposits.length > DEPOSITS_PER_PAGE && (
                        <nav className="pagination admin-pagination" aria-label="Halaman riwayat setoran">
                          <p>Halaman {depositPage} dari {depositPages}</p>
                          <div className="pagination__controls">
                            <button type="button" onClick={() => setDepositPage((page) => Math.max(1, page - 1))} disabled={depositPage === 1}>‹</button>
                            <button type="button" onClick={() => setDepositPage((page) => Math.min(depositPages, page + 1))} disabled={depositPage === depositPages}>Lihat lainnya ›</button>
                          </div>
                        </nav>
                      )}
                    </section>
                  </article>
                </div>
              )}
            </>
          )}
        </section>

        <section className="admin-section" aria-labelledby="users-admin-title">
          <div className="section-head">
            <div>
              <p className="page-kicker">Scroll, pagination, dan kelola akun</p>
              <h2 id="users-admin-title">RINGKASAN PENGGUNA.</h2>
            </div>
          </div>
          <div className="history-table-wrap admin-user-table" tabIndex={0} aria-label="Tabel pengguna dapat digulir">
            <table className="history-table">
              <thead><tr><th>Pengguna</th><th>Peran</th><th>Pemasukan</th><th>Pengeluaran</th><th>Saldo</th><th>Aksi</th></tr></thead>
              <tbody>
                {visibleUsers.map((item) => (
                  <tr key={item.userId}>
                    <td data-label="Pengguna"><strong>{item.name}</strong><br /><small>@{item.username} · {item.email}</small></td>
                    <td data-label="Peran">{item.role === 'SUPER_ADMIN' ? 'Super admin' : 'User'}</td>
                    <td data-label="Pemasukan" className="amount amount--income">{formatRupiah(item.income)}</td>
                    <td data-label="Pengeluaran" className="amount amount--expense">{formatRupiah(item.expense)}</td>
                    <td data-label="Saldo" className="amount"><strong>{formatRupiah(item.balance)}</strong></td>
                    <td className="row-actions"><button type="button" onClick={() => { setEditingUser(item); setEditError(''); setShowEditPassword(false); }}>Kelola</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className="pagination" aria-label="Halaman daftar pengguna">
            <p>Menampilkan {users.length === 0 ? 0 : (userPage - 1) * USERS_PER_PAGE + 1}–{Math.min(userPage * USERS_PER_PAGE, users.length)} dari {users.length} akun</p>
            <div className="pagination__controls">
              <button type="button" onClick={() => setUserPage((page) => Math.max(1, page - 1))} disabled={userPage === 1}>← Sebelumnya</button>
              <button type="button" aria-current="page">{userPage} / {userPages}</button>
              <button type="button" onClick={() => setUserPage((page) => Math.min(userPages, page + 1))} disabled={userPage === userPages}>Berikutnya →</button>
            </div>
          </nav>
        </section>
      </main>

      {editingUser && (
        <div className="admin-edit-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingUser(null); }}>
          <section className="admin-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
            <div className="dialog-head">
              <div><p className="ornament">◆</p><h2 id="edit-user-title">KELOLA AKUN.</h2></div>
              <button className="close-button" type="button" onClick={() => setEditingUser(null)} aria-label="Tutup form">×</button>
            </div>
            <form className="admin-edit-form" onSubmit={updateAccount}>
              <label className="field">
                <span>Username / nama akun</span>
                <input name="username" type="text" minLength={3} maxLength={30} pattern="[A-Za-z0-9._-]+" defaultValue={editingUser.username} autoComplete="username" required />
                <small>Dipakai sebagai nama tampilan dan untuk login. Huruf besar dan kecil berpengaruh.</small>
              </label>
              <label className="field"><span>Email</span><input name="email" type="email" defaultValue={editingUser.email} required /></label>
              <label className="field">
                <span>Password baru (opsional)</span>
                <span className="password-input">
                  <input name="password" type={showEditPassword ? 'text' : 'password'} minLength={8} autoComplete="new-password" placeholder="Kosongkan jika tidak diubah" />
                  <button type="button" onClick={() => setShowEditPassword((visible) => !visible)} aria-label={showEditPassword ? 'Sembunyikan password' : 'Tampilkan password'}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.75" /></svg>
                  </button>
                </span>
                <small>Minimal 8 karakter. Mengisi kolom ini akan mereset password akun.</small>
              </label>
              {editError && <p className="form-error" role="alert">◆ {editError}</p>}
              <div className="form-actions">
                <button className="button button--secondary" type="button" onClick={() => setEditingUser(null)}>Batal</button>
                <button className="button button--primary" type="submit" disabled={savingUser}>{savingUser ? 'Menyimpan…' : 'Simpan akun'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </AppShell>
  );
}
