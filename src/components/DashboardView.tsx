import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Clock,
  FlaskConical,
  Package,
  ShieldAlert,
  Wrench,
  X,
} from 'lucide-react';
import { useLab } from '../context/LabContext';
import {
  computeMonthlyLabUsage,
  formatTanggalIndonesia,
  getTodayIso,
} from '../utils/labLogic';
import { MapelLabel, StatusBahanBadge, StatusPengajuanBadge } from './StatusBadge';

export function DashboardView() {
  const {
    db,
    currentUser,
    setActivePage,
    approvePengajuan,
    rejectPengajuan,
    openPengajuanDetail,
  } = useLab();

  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const isKepalaLab = currentUser?.role === 'kepala_lab';
  const todayIso = getTodayIso();

  // 5 Kartu Ringkasan
  const totalAlatUnit = useMemo(
    () => db.alat.reduce((sum, a) => sum + a.jumlah_total, 0),
    [db.alat]
  );

  // Alat dipinjam hari ini (pengajuan disetujui/disetujui_sebagian yang tanggalnya hari ini atau aktif dipinjam)
  const alatDipinjamHariIni = useMemo(() => {
    const todayActiveIds = new Set(
      db.pengajuan
        .filter(
          (p) =>
            (p.status === 'disetujui' || p.status === 'disetujui_sebagian') &&
            p.tanggal_praktikum === todayIso
        )
        .map((p) => p.id)
    );
    const todayQty = db.pengajuan_detail
      .filter((d) => todayActiveIds.has(d.pengajuan_id) && d.item_type === 'alat')
      .reduce((sum, d) => sum + (d.jumlah_disetujui ?? d.jumlah_diajukan), 0);
    // Fallback jika user membuka pada tanggal lain selain 2026-11-23, tampilkan juga total sedang dipinjam
    const totalSedangDipinjam = db.alat.reduce((sum, a) => sum + a.jumlah_dipinjam, 0);
    return { todayQty, totalSedangDipinjam };
  }, [db.alat, db.pengajuan, db.pengajuan_detail, todayIso]);

  const alatRusakCount = useMemo(
    () => db.alat.filter((a) => a.kondisi === 'rusak_ringan' || a.kondisi === 'rusak_berat').length,
    [db.alat]
  );

  const bahanBermasalah = useMemo(
    () => db.bahan_kimia.filter((b) => b.status === 'kadaluarsa' || b.status === 'stok_menipis'),
    [db.bahan_kimia]
  );

  const bahanMauKadaluarsaCount = useMemo(
    () => db.bahan_kimia.filter((b) => b.status === 'kadaluarsa').length,
    [db.bahan_kimia]
  );

  const pendingPengajuan = useMemo(
    () => db.pengajuan.filter((p) => p.status === 'menunggu'),
    [db.pengajuan]
  );

  const monthlyUsage = useMemo(
    () => computeMonthlyLabUsage(db.jadwal_lab, db.labs, 2026),
    [db.jadwal_lab, db.labs]
  );

  const maxMonthlyTotal = Math.max(4, ...monthlyUsage.map((m) => m.total));

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalId) return;
    const res = rejectPengajuan(rejectModalId, rejectReason);
    if (res.ok) {
      setRejectModalId(null);
      setRejectReason('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Sambutan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Ringkasan Operasional Laboratorium IPA
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pemantauan aset alat, bahan kimia, jadwal praktikum, dan persetujuan pengajuan guru.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentUser?.role === 'guru_ipa' && (
            <button
              type="button"
              onClick={() => setActivePage('pengajuan')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F2744] text-white text-xs font-semibold hover:bg-[#1E3A5F] transition-colors whitespace-nowrap"
            >
              Ajukan Praktikum
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setActivePage('laporan')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            Buka Laporan
          </button>
        </div>
      </div>

      {/* 5 Kartu Ringkasan KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Alat</span>
            <Package className="w-4 h-4 text-[#0F2744]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {totalAlatUnit}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 tabular-nums">
            {db.alat.length} jenis inventaris tercatat
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Alat Dipinjam Hari Ini</span>
            <FlaskConical className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {alatDipinjamHariIni.todayQty > 0
              ? alatDipinjamHariIni.todayQty
              : alatDipinjamHariIni.totalSedangDipinjam}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 tabular-nums">
            Total sedang dipinjam: {alatDipinjamHariIni.totalSedangDipinjam} unit
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Alat Rusak</span>
            <Wrench className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700 tabular-nums">
            {alatRusakCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Perlu perbaikan / pengadaan ulang
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Bahan Mau Kadaluarsa</span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-red-700 tabular-nums">
            {bahanMauKadaluarsaCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 tabular-nums">
            {bahanBermasalah.length} bahan perlu perhatian (&lt;30 hr / menipis)
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Menunggu Persetujuan</span>
            <Clock className="w-4 h-4 text-[#0F2744]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#0F2744] tabular-nums">
            {pendingPengajuan.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Pengajuan praktikum baru
          </div>
        </div>
      </div>

      {/* Grafik Bar Chart + Peringatan Bahan Kimia */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bar Chart Pemakaian Lab per Bulan */}
        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Grafik Pemakaian Laboratorium per Bulan (2026)
              </h2>
              <p className="text-xs text-slate-500">
                Jumlah sesi praktikum terjadwal berdasarkan mata pelajaran
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#1D4ED8]" />
                Fisika
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#EA580C]" />
                Kimia
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#16A34A]" />
                Biologi
              </span>
            </div>
          </div>

          <div className="h-56 flex items-end gap-3 sm:gap-5 pt-4 pb-2 border-b border-slate-200">
            {monthlyUsage.map((datum) => {
              const barPx = 152;
              const fisPx = datum.fisika > 0 ? Math.max(12, Math.round((datum.fisika / maxMonthlyTotal) * barPx)) : 0;
              const kimPx = datum.kimia > 0 ? Math.max(12, Math.round((datum.kimia / maxMonthlyTotal) * barPx)) : 0;
              const bioPx = datum.biologi > 0 ? Math.max(12, Math.round((datum.biologi / maxMonthlyTotal) * barPx)) : 0;
              return (
                <div key={datum.monthKey} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div className="text-[11px] font-mono font-semibold text-slate-700 tabular-nums mb-1.5">
                    {datum.total}
                  </div>
                  <div className="w-full max-w-[54px] flex items-end justify-center gap-1">
                    <div
                      title={`Fisika: ${datum.fisika}`}
                      style={{ height: `${fisPx}px` }}
                      className="flex-1 bg-[#1D4ED8] rounded-t-sm"
                    />
                    <div
                      title={`Kimia: ${datum.kimia}`}
                      style={{ height: `${kimPx}px` }}
                      className="flex-1 bg-[#EA580C] rounded-t-sm"
                    />
                    <div
                      title={`Biologi: ${datum.biologi}`}
                      style={{ height: `${bioPx}px` }}
                      className="flex-1 bg-[#16A34A] rounded-t-sm"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 sm:gap-5 pt-2">
            {monthlyUsage.map((datum) => (
              <div
                key={`lbl-${datum.monthKey}`}
                className="flex-1 text-center text-xs font-medium text-slate-600"
              >
                {datum.label}
              </div>
            ))}
          </div>
        </section>

        {/* Peringatan Bahan Kimia */}
        <section className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-base font-bold text-slate-900">Peringatan Bahan Kimia</h2>
            {currentUser?.role !== 'kepsek_tu' && (
              <button
                type="button"
                onClick={() => setActivePage('inventaris')}
                className="text-xs font-semibold text-[#0F2744] hover:underline"
              >
                Lihat Semua
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Stok &lt; 10% dari stok awal atau kadaluarsa &lt; 30 hari
          </p>

          <div className="space-y-3 flex-1">
            {bahanBermasalah.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 text-center">
                Seluruh bahan kimia dalam kondisi aman.
              </div>
            ) : (
              bahanBermasalah.map((b) => (
                <div
                  key={b.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs font-semibold text-slate-900">{b.nama_bahan}</div>
                    <StatusBahanBadge status={b.status} />
                  </div>
                  <div className="text-[11px] text-slate-600 font-mono tabular-nums">
                    Sisa: {b.stok_sisa} / {b.stok_awal} {b.satuan} · Exp:{' '}
                    {formatTanggalIndonesia(b.tanggal_kadaluarsa)}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Tabel Pengajuan Terbaru Berstatus Menunggu */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Pengajuan Terbaru Menunggu Persetujuan
            </h2>
            <p className="text-xs text-slate-500">
              Tinjau pengajuan alat &amp; bahan praktikum dari Guru IPA
            </p>
          </div>
          {currentUser?.role !== 'kepsek_tu' && (
            <button
              type="button"
              onClick={() => setActivePage('pengajuan')}
              className="text-xs font-semibold text-[#0F2744] hover:underline self-start sm:self-auto"
            >
              Kelola Semua Pengajuan
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Kode</th>
                <th className="py-3 px-4">Guru IPA</th>
                <th className="py-3 px-4">Judul Praktikum</th>
                <th className="py-3 px-4">Mapel &amp; Kelas</th>
                <th className="py-3 px-4">Jadwal</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {pendingPengajuan.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 px-4 text-center text-slate-500">
                    Tidak ada pengajuan baru berstatus menunggu saat ini.
                  </td>
                </tr>
              ) : (
                pendingPengajuan.map((pgj) => {
                  const guru = db.users.find((u) => u.id === pgj.guru_id);
                  const lab = db.labs.find((l) => l.id === pgj.lab_id);
                  return (
                    <tr key={pgj.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-semibold text-[#0F2744] whitespace-nowrap">
                        {pgj.kode_pengajuan}
                      </td>
                      <td className="py-3 px-4 text-slate-800 whitespace-nowrap">
                        {guru?.nama_lengkap ?? '-'}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        <div>{pgj.judul_praktikum}</div>
                        <div className="text-[11px] text-slate-500">{lab?.nama_lab}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <MapelLabel mapel={pgj.mapel} />
                          <span className="text-slate-600 font-medium">{pgj.kelas}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 tabular-nums whitespace-nowrap">
                        <div>{formatTanggalIndonesia(pgj.tanggal_praktikum)}</div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {pgj.jam_mulai}–{pgj.jam_selesai}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusPengajuanBadge status={pgj.status} />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {isKepalaLab && (
                            <>
                              <button
                                type="button"
                                onClick={() => approvePengajuan(pgj.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Setujui
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectModalId(pgj.id);
                                  setRejectReason('');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                                Tolak
                              </button>
                            </>
                          )}
                          {currentUser?.role !== 'kepsek_tu' && (
                            <button
                              type="button"
                              onClick={() => openPengajuanDetail(pgj.id)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors"
                            >
                              Detail
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Tolak Cepat */}
      {rejectModalId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmReject}
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Tolak Pengajuan Praktikum</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Wajib mengisi alasan penolakan agar guru mendapatkan kejelasan tindak lanjut.
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="dash-reject-reason" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Alasan Penolakan *
              </label>
              <textarea
                id="dash-reject-reason"
                required
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Contoh: Alat sedang dikalibrasi atau jadwal lab digunakan untuk ujian."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2744]"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModalId(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                Konfirmasi Tolak
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
