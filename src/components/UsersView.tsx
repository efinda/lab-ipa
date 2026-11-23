import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useLab } from '../context/LabContext';
import type { Mapel, User, UserRole } from '../types/database';
import type { UpsertUserPayload } from '../utils/labLogic';

type RoleFilter = 'all' | UserRole;

const ROLE_LABELS: Record<UserRole, string> = {
  kepala_lab: 'Kepala Lab IPA (Admin)',
  guru_ipa: 'Guru IPA',
  kepsek_tu: 'Kepala Sekolah / TU',
  siswa: 'Siswa / Asisten Lab',
};

const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  kepala_lab: 'bg-[#0F2744]/10 text-[#0F2744] border-[#0F2744]/20',
  guru_ipa: 'bg-blue-50 text-blue-800 border-blue-200',
  kepsek_tu: 'bg-amber-50 text-amber-800 border-amber-200',
  siswa: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

const MAPEL_LABEL: Record<Mapel, string> = {
  fisika: 'Fisika',
  kimia: 'Kimia',
  biologi: 'Biologi',
};

const EMPTY_FORM: UpsertUserPayload = {
  nama_lengkap: '',
  email: '',
  role: 'guru_ipa',
  mapel: 'fisika',
  kelas: 'X IPA 1',
  is_active: true,
};

export function UsersView() {
  const { db, currentUser, addUser, updateUser, deleteUser } = useLab();

  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UpsertUserPayload>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const counts = useMemo(() => {
    return {
      total: db.users.length,
      guru: db.users.filter((u) => u.role === 'guru_ipa').length,
      kepsek: db.users.filter((u) => u.role === 'kepsek_tu').length,
      siswa: db.users.filter((u) => u.role === 'siswa').length,
      admin: db.users.filter((u) => u.role === 'kepala_lab').length,
    };
  }, [db.users]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return db.users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.nama_lengkap.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        ROLE_LABELS[u.role].toLowerCase().includes(q) ||
        (u.mapel && MAPEL_LABEL[u.mapel].toLowerCase().includes(q)) ||
        (u.kelas && u.kelas.toLowerCase().includes(q))
      );
    });
  }, [db.users, roleFilter, searchQuery]);

  if (!currentUser || currentUser.role !== 'kepala_lab') {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-lg mx-auto">
        <ShieldAlert className="w-10 h-10 text-amber-600 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900">Akses Terbatas</h2>
        <p className="text-xs text-slate-600 mt-1">
          Hanya Kepala Lab IPA (Admin) yang dapat mengelola daftar akun pengguna laboratorium.
        </p>
      </div>
    );
  }

  const openAddModal = () => {
    setEditingUser(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      nama_lengkap: user.nama_lengkap,
      email: user.email,
      role: user.role,
      mapel: user.mapel ?? 'fisika',
      kelas: user.kelas ?? 'X IPA 1',
      is_active: user.is_active,
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: UpsertUserPayload = {
      nama_lengkap: formData.nama_lengkap,
      email: formData.email,
      role: formData.role,
      mapel: formData.role === 'guru_ipa' ? formData.mapel ?? 'fisika' : null,
      kelas: formData.role === 'siswa' ? formData.kelas ?? '' : null,
      is_active: formData.is_active,
    };

    const result = editingUser
      ? updateUser(editingUser.id, payload)
      : addUser(payload);

    if (!result.ok) {
      setFormError(result.error ?? 'Gagal menyimpan data pengguna.');
      return;
    }

    setFormOpen(false);
    setEditingUser(null);
    setFormError(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingUser) return;
    const res = deleteUser(deletingUser.id);
    if (res.ok) {
      setDeletingUser(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Kelola Pengguna</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tambah, edit, dan hapus akun Guru IPA, Kepala Sekolah / TU, Siswa / Asisten Lab, dan Admin.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0F2744] hover:bg-[#1E3A5F] text-white text-xs font-semibold transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Tambah Pengguna
        </button>
      </div>

      {/* Ringkasan Jumlah Pengguna */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Total Pengguna</div>
          <div className="text-2xl font-bold text-[#0F2744] tabular-nums mt-1">{counts.total}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Guru IPA</div>
          <div className="text-2xl font-bold text-blue-700 tabular-nums mt-1">{counts.guru}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Kepala Sekolah / TU</div>
          <div className="text-2xl font-bold text-amber-700 tabular-nums mt-1">{counts.kepsek}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Siswa / Asisten Lab</div>
          <div className="text-2xl font-bold text-emerald-700 tabular-nums mt-1">{counts.siswa}</div>
        </div>
      </div>

      {/* Filter & Pencarian */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Filter peran pengguna">
            {(
              [
                { key: 'all', label: `Semua (${counts.total})` },
                { key: 'guru_ipa', label: `Guru IPA (${counts.guru})` },
                { key: 'kepsek_tu', label: `Kepala Sekolah / TU (${counts.kepsek})` },
                { key: 'siswa', label: `Siswa (${counts.siswa})` },
                { key: 'kepala_lab', label: `Admin Lab (${counts.admin})` },
              ] as const
            ).map((tab) => {
              const active = roleFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setRoleFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-[#0F2744] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, email, mapel, kelas..."
              aria-label="Cari pengguna"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F2744]"
            />
          </div>
        </div>
      </div>

      {/* Tabel Pengguna */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Peran</th>
                <th className="py-3 px-4">Mapel / Kelas</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Tidak ada pengguna yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isSelf = user.id === currentUser.id;
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#0F2744]/10 text-[#0F2744] font-bold text-xs flex items-center justify-center shrink-0">
                            {user.nama_lengkap.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{user.nama_lengkap}</div>
                            {isSelf && (
                              <span className="text-[10px] font-semibold text-[#0F2744]">
                                Akun sedang aktif
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{user.email}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${ROLE_BADGE_CLASSES[user.role]}`}
                        >
                          {ROLE_LABELS[user.role]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {user.role === 'guru_ipa' && user.mapel
                          ? MAPEL_LABEL[user.mapel]
                          : user.role === 'siswa' && user.kelas
                          ? user.kelas
                          : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            user.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {user.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(user)}
                            aria-label={`Edit ${user.nama_lengkap}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => setDeletingUser(user)}
                            aria-label={`Hapus ${user.nama_lengkap}`}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                              isSelf
                                ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                                : 'border-red-200 text-red-700 hover:bg-red-50'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit Pengguna */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-form-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-[#0F2744] text-white">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                <h2 id="user-form-modal-title" className="text-sm font-bold">
                  {editingUser ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                aria-label="Tutup form pengguna"
                className="p-1 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-4">
              {formError && (
                <div
                  role="alert"
                  className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700"
                >
                  {formError}
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor="user-nama-input" className="block text-xs font-semibold text-slate-700">
                  Nama Lengkap &amp; Gelar
                </label>
                <input
                  id="user-nama-input"
                  type="text"
                  required
                  value={formData.nama_lengkap}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, nama_lengkap: e.target.value }));
                    if (formError) setFormError(null);
                  }}
                  placeholder="Contoh: Siti Aminah, S.Pd"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F2744]"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="user-email-input" className="block text-xs font-semibold text-slate-700">
                  Alamat Email
                </label>
                <input
                  id="user-email-input"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, email: e.target.value }));
                    if (formError) setFormError(null);
                  }}
                  placeholder="nama@sman5garut.sch.id"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F2744]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="user-role-select" className="block text-xs font-semibold text-slate-700">
                    Peran / Role
                  </label>
                  <select
                    id="user-role-select"
                    value={formData.role}
                    onChange={(e) => {
                      const nextRole = e.target.value as UserRole;
                      setFormData((prev) => ({
                        ...prev,
                        role: nextRole,
                        mapel: nextRole === 'guru_ipa' ? prev.mapel ?? 'fisika' : null,
                        kelas: nextRole === 'siswa' ? prev.kelas ?? 'X IPA 1' : null,
                      }));
                      if (formError) setFormError(null);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2744]"
                  >
                    <option value="guru_ipa">Guru IPA</option>
                    <option value="kepsek_tu">Kepala Sekolah / TU</option>
                    <option value="siswa">Siswa / Asisten Lab</option>
                    <option value="kepala_lab">Kepala Lab IPA (Admin)</option>
                  </select>
                </div>

                {formData.role === 'guru_ipa' && (
                  <div className="space-y-1">
                    <label htmlFor="user-mapel-select" className="block text-xs font-semibold text-slate-700">
                      Mata Pelajaran
                    </label>
                    <select
                      id="user-mapel-select"
                      value={formData.mapel ?? 'fisika'}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, mapel: e.target.value as Mapel }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2744]"
                    >
                      <option value="fisika">Fisika</option>
                      <option value="kimia">Kimia</option>
                      <option value="biologi">Biologi</option>
                    </select>
                  </div>
                )}

                {formData.role === 'siswa' && (
                  <div className="space-y-1">
                    <label htmlFor="user-kelas-input" className="block text-xs font-semibold text-slate-700">
                      Kelas
                    </label>
                    <input
                      id="user-kelas-input"
                      type="text"
                      required
                      value={formData.kelas ?? ''}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, kelas: e.target.value }))
                      }
                      placeholder="Contoh: XI IPA 2"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F2744]"
                    />
                  </div>
                )}
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
                  }
                  className="w-4 h-4 rounded border-slate-300 text-[#0F2744] focus:ring-[#0F2744]"
                />
                Akun Aktif (dapat digunakan untuk login)
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#0F2744] hover:bg-[#1E3A5F] text-white text-xs font-semibold"
                >
                  {editingUser ? 'Simpan Perubahan' : 'Simpan Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Pengguna */}
      {deletingUser && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-user-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 id="delete-user-modal-title" className="text-sm font-bold text-slate-900">
                  Hapus Pengguna?
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Anda akan menghapus akun <strong>{deletingUser.nama_lengkap}</strong> (
                  {ROLE_LABELS[deletingUser.role]}). Akun yang dihapus tidak lagi muncul di halaman
                  login.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                Hapus Pengguna
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
