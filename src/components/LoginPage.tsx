import React, { useState } from 'react';
import {
  ArrowRight,
  Atom,
  BookOpen,
  Building2,
  FlaskConical,
  GraduationCap,
  Lock,
  LogIn,
  Microscope,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useLab } from '../context/LabContext';
import type { User } from '../types/database';
import { roleRequiresPassword } from '../utils/labLogic';
import { ModulCatalogSection } from './ModulCatalogSection';
import { PasswordModal } from './PasswordModal';

export function LoginPage() {
  const { db, loginAs, toasts, dismissToast } = useLab();
  const [publicTab, setPublicTab] = useState<'login' | 'modul'>('login');
  const [selectedKepalaLabId, setSelectedKepalaLabId] = useState<string>('usr-kalab-1');
  const [selectedGuruId, setSelectedGuruId] = useState<string>('usr-guru-fis');
  const [selectedSiswaId, setSelectedSiswaId] = useState<string>('usr-siswa-1');
  const [selectedKepsekId, setSelectedKepsekId] = useState<string>('usr-kepsek-1');
  const [pendingLoginUser, setPendingLoginUser] = useState<User | null>(null);

  const kepalaLabList = db.users.filter((u) => u.role === 'kepala_lab' && u.is_active);
  const guruList = db.users.filter((u) => u.role === 'guru_ipa' && u.is_active);
  const siswaList = db.users.filter((u) => u.role === 'siswa' && u.is_active);
  const kepsekList = db.users.filter((u) => u.role === 'kepsek_tu' && u.is_active);

  const activeKepalaLab =
    kepalaLabList.find((u) => u.id === selectedKepalaLabId) ?? kepalaLabList[0];
  const activeGuru = guruList.find((g) => g.id === selectedGuruId) ?? guruList[0];
  const activeSiswa = siswaList.find((s) => s.id === selectedSiswaId) ?? siswaList[0];
  const activeKepsek = kepsekList.find((k) => k.id === selectedKepsekId) ?? kepsekList[0];

  const handleSelectRoleLogin = (user: User) => {
    if (roleRequiresPassword(user.role)) {
      setPendingLoginUser(user);
      return;
    }
    loginAs(user.id);
  };

  const totalAlatUnit = db.alat.reduce((sum, a) => sum + a.jumlah_total, 0);
  const pendingCount = db.pengajuan.filter((p) => p.status === 'menunggu').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header Instansi */}
      <header className="bg-[#0F2744] text-white border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
                SIM-LAB IPA SMA
              </h1>
              <p className="text-xs text-slate-300">
                Sistem Informasi Manajemen Laboratorium IPA Terpadu
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-2" aria-label="Navigasi publik">
            <button
              type="button"
              onClick={() => setPublicTab('login')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                publicTab === 'login'
                  ? 'bg-white text-[#0F2744]'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Masuk Sistem
            </button>
            <button
              type="button"
              onClick={() => setPublicTab('modul')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                publicTab === 'modul'
                  ? 'bg-white text-[#0F2744]'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Modul Praktikum ({db.praktikum.length})
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-8 py-8 sm:py-12">
        {publicTab === 'modul' ? (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#1E3A5F]">
                  SMAN 5 Garut · Akses Terbuka Tanpa Login
                </p>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
                  Katalog Modul Praktikum IPA ({db.praktikum.length})
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Semua pengunjung dapat melihat daftar praktikum, kebutuhan alat/bahan, dan mengunduh LKS secara langsung tanpa login.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPublicTab('login')}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#0F2744] hover:bg-[#1E3A5F] text-white text-xs font-semibold whitespace-nowrap shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                Masuk untuk Kelola / Ajukan
              </button>
            </div>

            <ModulCatalogSection isPublic />
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Kolom Kiri: Pengantar & Ringkasan Lab */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <p className="text-xs font-semibold tracking-wide text-[#1E3A5F] mb-2">
                SMAN 5 Garut
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance">
                Kelola Inventaris, Pengajuan Praktikum, dan Jadwal Lab dalam Satu Sistem
              </h2>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Pilih peran pengguna di sebelah kanan dan masukkan password akses untuk masuk ke
                sistem manajemen laboratorium IPA SMAN 5 Garut.
              </p>
            </div>

            {/* Galeri 3 Laboratorium */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <img
                  src="/src/assets/images/lab_fisika_equip_1795437857033.jpg"
                  alt="Peralatan Laboratorium Fisika"
                  referrerPolicy="no-referrer"
                  className="w-full h-24 object-cover"
                />
                <div className="p-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                    <Atom className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    Fisika
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                    {db.alat.filter((a) => a.lab_id === 'lab-fisika').length} jenis alat
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <img
                  src="/src/assets/images/lab_kimia_equip_1795437857340.jpg"
                  alt="Peralatan Laboratorium Kimia"
                  referrerPolicy="no-referrer"
                  className="w-full h-24 object-cover"
                />
                <div className="p-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                    <FlaskConical className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    Kimia
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                    {db.alat.filter((a) => a.lab_id === 'lab-kimia').length} alat · {db.bahan_kimia.length} bahan
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <img
                  src="/src/assets/images/lab_biologi_equip_1795437856740.jpg"
                  alt="Peralatan Laboratorium Biologi"
                  referrerPolicy="no-referrer"
                  className="w-full h-24 object-cover"
                />
                <div className="p-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                    <Microscope className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Biologi
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                    {db.alat.filter((a) => a.lab_id === 'lab-biologi').length} jenis alat
                  </p>
                </div>
              </div>
            </div>

            {/* Ringkasan Statistik Basis Data */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-3 gap-4 divide-x divide-slate-200">
              <div>
                <p className="text-xs text-slate-500">Total Unit Alat</p>
                <p className="text-xl font-bold text-[#0F2744] tabular-nums mt-0.5">
                  {totalAlatUnit}
                </p>
              </div>
              <div className="pl-4">
                <p className="text-xs text-slate-500">Modul Praktikum</p>
                <p className="text-xl font-bold text-[#0F2744] tabular-nums mt-0.5">
                  {db.praktikum.length}
                </p>
              </div>
              <div className="pl-4">
                <p className="text-xs text-slate-500">Menunggu Acc</p>
                <p className="text-xl font-bold text-amber-700 tabular-nums mt-0.5">
                  {pendingCount}
                </p>
              </div>
            </div>

            {/* Akses Publik Modul Praktikum */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <BookOpen className="w-4 h-4 text-[#0F2744] shrink-0" />
                  Katalog Modul Praktikum Terbuka
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Lihat {db.praktikum.length} modul praktikum dan unduh LKS tanpa perlu login.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPublicTab('modul')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#0F2744] text-[#0F2744] hover:bg-[#0F2744] hover:text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                Lihat Modul
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Kolom Kanan: Pilihan Role Login (Klik Langsung Masuk) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
              <h3 className="text-base font-bold text-slate-900">
                Masuk Berdasarkan Peran
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-5">
                Klik salah satu kartu peran di bawah untuk masuk ke dashboard sesuai hak akses.
              </p>

              <div className="space-y-3.5">
                {/* 1. Kepala Lab IPA (Admin) */}
                {activeKepalaLab && (
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                    <button
                      type="button"
                      onClick={() => handleSelectRoleLogin(activeKepalaLab)}
                      className="w-full text-left flex items-start justify-between gap-4 group"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-lg bg-[#0F2744] text-white flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              1. Kepala Lab IPA (Admin)
                            </span>
                            <span className="text-xs text-slate-500">·</span>
                            <span className="text-xs font-medium text-[#1E3A5F]">
                              {activeKepalaLab.nama_lengkap}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            Akses penuh: setujui/tolak pengajuan, inspeksi pengembalian, kelola inventaris alat &amp; bahan, kelola pengguna, lihat seluruh laporan.
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F2744] text-white text-xs font-semibold shrink-0 group-hover:bg-[#1E3A5F] whitespace-nowrap">
                        <Lock className="w-3 h-3" />
                        Masuk
                      </span>
                    </button>

                    {kepalaLabList.length > 1 && (
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <span className="block text-xs font-medium text-slate-600">
                          Pilih akun Admin ({kepalaLabList.length} akun):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {kepalaLabList.map((admin) => {
                            const active = admin.id === activeKepalaLab.id;
                            return (
                              <button
                                key={admin.id}
                                type="button"
                                onClick={() => setSelectedKepalaLabId(admin.id)}
                                className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                                  active
                                    ? 'border-[#0F2744] bg-[#0F2744]/5 text-[#0F2744] font-semibold'
                                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                                }`}
                              >
                                <div className="truncate font-semibold">{admin.nama_lengkap}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Guru IPA (Fisika, Kimia, Biologi) */}
                {activeGuru ? (
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-[#0F2744] flex items-center justify-center shrink-0">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-slate-900">
                            2. Guru IPA (Fisika, Kimia, Biologi)
                          </span>
                          <p className="text-xs text-slate-600 mt-1">
                            Ajukan praktikum, pinjam alat &amp; bahan, booking jadwal lab, selesaikan pengembalian, dan input absensi serta nilai siswa.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectRoleLogin(activeGuru)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F2744] hover:bg-[#1E3A5F] text-white text-xs font-semibold shrink-0 whitespace-nowrap"
                      >
                        <Lock className="w-3 h-3" />
                        Masuk Guru
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-2.5">
                      <span className="block text-xs font-medium text-slate-600">
                        Pilih akun Guru IPA ({guruList.length} guru):
                      </span>
                      {(['fisika', 'kimia', 'biologi'] as const).map((m) => {
                        const group = guruList.filter((g) => g.mapel === m);
                        if (group.length === 0) return null;
                        return (
                          <div key={m} className="space-y-1">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Guru {m}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {group.map((guru) => {
                                const active = guru.id === activeGuru.id;
                                return (
                                  <button
                                    key={guru.id}
                                    type="button"
                                    onClick={() => setSelectedGuruId(guru.id)}
                                    className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                                      active
                                        ? 'border-[#0F2744] bg-[#0F2744]/5 text-[#0F2744] font-semibold'
                                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                                    }`}
                                  >
                                    <div className="truncate font-semibold">{guru.nama_lengkap}</div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                    Belum ada akun Guru IPA aktif. Hubungi Kepala Lab IPA (Admin) untuk menambahkan akun.
                  </div>
                )}

                {/* 3. Siswa / Asisten Lab */}
                {activeSiswa ? (
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
                          <GraduationCap className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              3. Siswa / Asisten Lab
                            </span>
                            <span className="text-xs text-slate-500">·</span>
                            <span className="text-xs font-medium text-slate-600">
                              {activeSiswa.nama_lengkap}
                              {activeSiswa.kelas ? ` (${activeSiswa.kelas})` : ''}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            Melihat katalog alat &amp; bahan lab, jadwal pakai lab, serta memantau status pengajuan pinjaman praktikum.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectRoleLogin(activeSiswa)}
                        className="px-3 py-1.5 rounded-lg bg-[#0F2744] hover:bg-[#1E3A5F] text-white text-xs font-semibold shrink-0 whitespace-nowrap"
                      >
                        Masuk Siswa
                      </button>
                    </div>

                    {siswaList.length > 1 && (
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <span className="block text-xs font-medium text-slate-600">
                          Pilih akun Siswa ({siswaList.length} siswa):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {siswaList.map((siswa) => {
                            const active = siswa.id === activeSiswa.id;
                            return (
                              <button
                                key={siswa.id}
                                type="button"
                                onClick={() => setSelectedSiswaId(siswa.id)}
                                className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                                  active
                                    ? 'border-[#0F2744] bg-[#0F2744]/5 text-[#0F2744] font-semibold'
                                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                                }`}
                              >
                                <div className="truncate font-semibold">
                                  {siswa.nama_lengkap}
                                  {siswa.kelas ? ` (${siswa.kelas})` : ''}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                    Belum ada akun Siswa aktif.
                  </div>
                )}

                {/* 4. Kepala Sekolah / TU */}
                {activeKepsek ? (
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                    <button
                      type="button"
                      onClick={() => handleSelectRoleLogin(activeKepsek)}
                      className="w-full text-left flex items-start justify-between gap-4 group"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              4. Kepala Sekolah / Tata Usaha
                            </span>
                            <span className="text-xs text-slate-500">·</span>
                            <span className="text-xs font-medium text-slate-600">
                              {activeKepsek.nama_lengkap}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            Akses baca (read-only) untuk memantau dashboard ringkasan, jadwal lab, dan mencetak laporan otomatis berkop surat.
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F2744] text-white text-xs font-semibold shrink-0 group-hover:bg-[#1E3A5F] whitespace-nowrap">
                        <Lock className="w-3 h-3" />
                        Masuk
                      </span>
                    </button>

                    {kepsekList.length > 1 && (
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <span className="block text-xs font-medium text-slate-600">
                          Pilih akun Kepala Sekolah / TU ({kepsekList.length} akun):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {kepsekList.map((k) => {
                            const active = k.id === activeKepsek.id;
                            return (
                              <button
                                key={k.id}
                                type="button"
                                onClick={() => setSelectedKepsekId(k.id)}
                                className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                                  active
                                    ? 'border-[#0F2744] bg-[#0F2744]/5 text-[#0F2744] font-semibold'
                                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                                }`}
                              >
                                <div className="truncate font-semibold">{k.nama_lengkap}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                    Belum ada akun Kepala Sekolah / TU aktif.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>SIM-LAB IPA SMA · Manajemen Laboratorium Fisika, Kimia &amp; Biologi</span>
          <span>SMAN 5 Garut</span>
        </div>
      </footer>

      <PasswordModal
        user={pendingLoginUser}
        onClose={() => setPendingLoginUser(null)}
        onSubmitPassword={(user, password) => loginAs(user.id, password)}
      />

      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`px-4 py-3 rounded-xl border shadow-md flex items-start justify-between gap-3 text-xs font-medium ${
                toast.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : toast.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <span>{toast.text}</span>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Tutup notifikasi"
                className="text-slate-400 hover:text-slate-700 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
