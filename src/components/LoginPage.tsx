import React, { useState } from 'react';
import {
  Atom,
  BookOpen,
  Building2,
  FlaskConical,
  GraduationCap,
  Microscope,
  RotateCcw,
  ShieldCheck,
  Terminal,
  UserCheck,
  X,
} from 'lucide-react';
import { useLab } from '../context/LabContext';

export function LoginPage() {
  const { db, loginAs, resetDemoData } = useLab();
  const [selectedGuruId, setSelectedGuruId] = useState<string>('usr-guru-fis');
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  const kepalaLab = db.users.find((u) => u.role === 'kepala_lab');
  const guruList = db.users.filter((u) => u.role === 'guru_ipa');
  const siswa = db.users.find((u) => u.role === 'siswa');
  const kepsek = db.users.find((u) => u.role === 'kepsek_tu');
  const activeGuru = guruList.find((g) => g.id === selectedGuruId) ?? guruList[0];

  const totalAlatUnit = db.alat.reduce((sum, a) => sum + a.jumlah_total, 0);
  const pendingCount = db.pengajuan.filter((p) => p.status === 'menunggu').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header Instansi */}
      <header className="bg-[#0F2744] text-white border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
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

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowInstallGuide(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-colors whitespace-nowrap"
            >
              <Terminal className="w-3.5 h-3.5" />
              Petunjuk Instalasi
            </button>
            <button
              type="button"
              onClick={resetDemoData}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-white/20 hover:bg-white/10 text-slate-100 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Data Demo
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-8 py-8 sm:py-12">
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
                Pilih salah satu peran pengguna di sebelah kanan untuk masuk ke simulasi lengkap
                berbasis penyimpanan lokal browser tanpa perlu kata sandi.
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
          </div>

          {/* Kolom Kanan: Pilihan Role Login (Klik Langsung Masuk) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
              <h3 className="text-base font-bold text-slate-900">
                Masuk Cepat Berdasarkan Peran (Demo Interaktif)
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-5">
                Klik salah satu kartu peran di bawah untuk langsung masuk ke dashboard sesuai hak akses.
              </p>

              <div className="space-y-3.5">
                {/* 1. Kepala Lab IPA (Admin) */}
                {kepalaLab && (
                  <button
                    type="button"
                    onClick={() => loginAs(kepalaLab.id)}
                    className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-[#0F2744] hover:bg-slate-50 transition-colors flex items-start justify-between gap-4 group"
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
                            {kepalaLab.nama_lengkap}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Akses penuh: setujui/tolak pengajuan, inspeksi pengembalian, kelola inventaris alat &amp; bahan, lihat seluruh laporan.
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 rounded-lg bg-[#0F2744] text-white text-xs font-semibold shrink-0 group-hover:bg-[#1E3A5F] whitespace-nowrap">
                      Masuk
                    </span>
                  </button>
                )}

                {/* 2. Guru IPA (Fisika, Kimia, Biologi) */}
                {activeGuru && (
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
                        onClick={() => loginAs(activeGuru.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#0F2744] hover:bg-[#1E3A5F] text-white text-xs font-semibold shrink-0 whitespace-nowrap"
                      >
                        Masuk Guru
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-2.5">
                      <span className="block text-xs font-medium text-slate-600">
                        Pilih akun Guru IPA ({guruList.length} guru):
                      </span>
                      {(['fisika', 'kimia', 'biologi'] as const).map((m) => {
                        const group = guruList.filter((g) => g.mapel === m);
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
                )}

                {/* 3. Siswa / Asisten Lab */}
                {siswa && (
                  <button
                    type="button"
                    onClick={() => loginAs(siswa.id)}
                    className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-[#0F2744] hover:bg-slate-50 transition-colors flex items-start justify-between gap-4 group"
                  >
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
                            {siswa.nama_lengkap} ({siswa.kelas})
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Melihat katalog alat &amp; bahan lab, jadwal pakai lab, serta memantau status pengajuan pinjaman praktikum.
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 rounded-lg bg-[#0F2744] text-white text-xs font-semibold shrink-0 group-hover:bg-[#1E3A5F] whitespace-nowrap">
                      Masuk
                    </span>
                  </button>
                )}

                {/* 4. Kepala Sekolah / TU */}
                {kepsek && (
                  <button
                    type="button"
                    onClick={() => loginAs(kepsek.id)}
                    className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-[#0F2744] hover:bg-slate-50 transition-colors flex items-start justify-between gap-4 group"
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
                            {kepsek.nama_lengkap}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Akses baca (read-only) untuk memantau dashboard ringkasan, jadwal lab, dan mencetak laporan otomatis berkop surat.
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 rounded-lg bg-[#0F2744] text-white text-xs font-semibold shrink-0 group-hover:bg-[#1E3A5F] whitespace-nowrap">
                      Masuk
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>SIM-LAB IPA SMA · Manajemen Laboratorium Fisika, Kimia &amp; Biologi</span>
          <span className="inline-flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-[#0F2744]" />
            Penyimpanan lokal browser aktif (LocalStorage)
          </span>
        </div>
      </footer>

      {/* Modal Petunjuk Instalasi */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Petunjuk Instalasi &amp; Menjalankan Aplikasi (SIM-LAB IPA SMA)
              </h3>
              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                aria-label="Tutup petunjuk instalasi"
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 text-sm text-slate-700">
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">1. Prasyarat Sistem</h4>
                <p className="text-xs text-slate-600">
                  Pastikan Node.js versi 18+ dan npm sudah terpasang di komputer Anda.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">2. Instalasi Dependensi</h4>
                <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs font-mono overflow-x-auto">
{`npm install`}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">3. Menjalankan Mode Pengembangan</h4>
                <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs font-mono overflow-x-auto">
{`npm run dev`}
                </pre>
                <p className="text-xs text-slate-600 mt-1">
                  Buka browser dan akses alamat <span className="font-mono">http://localhost:3000</span>.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">4. Build Produksi</h4>
                <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs font-mono overflow-x-auto">
{`npm run build
npm run preview`}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">5. Alur Pengujian End-to-End</h4>
                <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1">
                  <li>Masuk sebagai <strong>Guru IPA</strong> lalu ajukan praktikum baru (pilih template atau manual).</li>
                  <li>Ganti peran ke <strong>Kepala Lab IPA</strong>, buka notifikasi / menu Pengajuan, klik Setujui Semua atau Setujui Sebagian.</li>
                  <li>Cek stok di Inventaris otomatis berkurang dan jadwal lab otomatis terbuat.</li>
                  <li>Masuk kembali sebagai <strong>Guru IPA</strong>, klik <em>Selesaikan &amp; Kembalikan</em> setelah praktikum selesai.</li>
                  <li>Masuk sebagai <strong>Kepala Lab IPA</strong>, klik <em>Inspeksi &amp; Selesaikan</em> untuk memeriksa kondisi kembali dan mengembalikan stok.</li>
                </ol>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="px-4 py-2 rounded-lg bg-[#0F2744] text-white text-xs font-semibold hover:bg-[#1E3A5F]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
