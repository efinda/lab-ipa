import React, { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import { useLab } from '../context/LabContext';
import type { Mapel } from '../types/database';
import { formatRupiah, formatTanggalIndonesia } from '../utils/labLogic';

type ReportType = 'inventaris' | 'peminjaman' | 'pengajuan' | 'usulan_rusak';

const BULAN_OPTIONS = [
  { value: 'all', label: 'Semua Bulan (2026)' },
  { value: '2026-11', label: 'November 2026' },
  { value: '2026-10', label: 'Oktober 2026' },
  { value: '2026-09', label: 'September 2026' },
  { value: '2026-08', label: 'Agustus 2026' },
];

export function LaporanView() {
  const { db, notify } = useLab();

  const [reportType, setReportType] = useState<ReportType>('inventaris');
  const [filterBulan, setFilterBulan] = useState('2026-11');
  const [filterMapel, setFilterMapel] = useState<'all' | Mapel>('all');
  const [filterKelas, setFilterKelas] = useState('all');

  const kepalaLab = db.users.find((u) => u.role === 'kepala_lab');
  const kepsek = db.users.find((u) => u.role === 'kepsek_tu');

  const filteredAlat = useMemo(() => {
    return db.alat.filter((a) => {
      if (filterMapel === 'fisika' && a.lab_id !== 'lab-fisika') return false;
      if (filterMapel === 'kimia' && a.lab_id !== 'lab-kimia') return false;
      if (filterMapel === 'biologi' && a.lab_id !== 'lab-biologi') return false;
      return true;
    });
  }, [db.alat, filterMapel]);

  const damagedAlat = useMemo(
    () => filteredAlat.filter((a) => a.kondisi === 'rusak_ringan' || a.kondisi === 'rusak_berat'),
    [filteredAlat]
  );

  const filteredPengajuan = useMemo(() => {
    return db.pengajuan.filter((p) => {
      if (filterBulan !== 'all' && !p.tanggal_praktikum.startsWith(filterBulan)) return false;
      if (filterMapel !== 'all' && p.mapel !== filterMapel) return false;
      if (filterKelas !== 'all' && !p.kelas.startsWith(filterKelas)) return false;
      return true;
    });
  }, [db.pengajuan, filterBulan, filterMapel, filterKelas]);

  const filteredPeminjaman = useMemo(
    () =>
      filteredPengajuan.filter(
        (p) =>
          p.status === 'disetujui' ||
          p.status === 'disetujui_sebagian' ||
          p.status === 'selesai'
      ),
    [filteredPengajuan]
  );

  const handlePrintPdf = () => {
    window.print();
  };

  const handleExportCsv = () => {
    let csv = '';
    if (reportType === 'inventaris' || reportType === 'usulan_rusak') {
      const rows = reportType === 'inventaris' ? filteredAlat : damagedAlat;
      csv = [
        'Kode Inventaris,Nama Alat,Merk,Total,Tersedia,Kondisi,Lokasi,Harga',
        ...rows.map(
          (a) =>
            `"${a.kode_inventaris}","${a.nama_alat}","${a.merk}",${a.jumlah_total},${a.jumlah_tersedia},"${a.kondisi}","${a.lokasi_penyimpanan}",${a.harga}`
        ),
      ].join('\n');
    } else {
      const rows = reportType === 'peminjaman' ? filteredPeminjaman : filteredPengajuan;
      csv = [
        'Kode Pengajuan,Judul Praktikum,Mapel,Kelas,Tanggal,Jam,Status',
        ...rows.map(
          (p) =>
            `"${p.kode_pengajuan}","${p.judul_praktikum}","${p.mapel}","${p.kelas}","${p.tanggal_praktikum}","${p.jam_mulai}-${p.jam_selesai}","${p.status}"`
        ),
      ].join('\n');
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan-${reportType}-${filterBulan}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    notify('success', `Berkas CSV laporan ${reportType} berhasil diunduh.`);
  };

  const reportTitles: Record<ReportType, string> = {
    inventaris: 'LAPORAN INVENTARIS TAHUNAN LABORATORIUM IPA',
    peminjaman: 'LAPORAN PEMINJAMAN ALAT & PEMAKAIAN LAB BULANAN',
    pengajuan: 'REKAPITULASI PENGAJUAN PRAKTIKUM GURU IPA',
    usulan_rusak: 'SURAT USULAN PENGADAAN & PERBAIKAN ALAT RUSAK',
  };

  return (
    <div className="space-y-6">
      {/* Kontrol Laporan (Disembunyikan saat Print) */}
      <div className="space-y-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Laporan Otomatis</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Pratinjau laporan formal berkop surat sekolah siap cetak atau simpan ke PDF.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={handlePrintPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F2744] hover:bg-[#1E3A5F] text-white text-xs font-semibold"
            >
              <Printer className="w-4 h-4" />
              Export PDF / Print
            </button>
          </div>
        </div>

        {/* Pilihan Jenis Laporan & Filter */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {(
              [
                { id: 'inventaris', label: 'Laporan Inventaris Tahunan' },
                { id: 'peminjaman', label: 'Laporan Peminjaman Bulanan' },
                { id: 'pengajuan', label: 'Laporan Pengajuan Praktikum' },
                { id: 'usulan_rusak', label: 'Surat Usulan Alat Rusak' },
              ] as const
            ).map((rt) => (
              <button
                key={rt.id}
                type="button"
                onClick={() => setReportType(rt.id)}
                className={`px-3 py-2.5 rounded-lg border text-xs font-semibold text-left flex items-center gap-2 transition-colors ${
                  reportType === rt.id
                    ? 'border-[#0F2744] bg-[#0F2744] text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <span>{rt.label}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
            <div>
              <label htmlFor="lap-bulan" className="block font-semibold text-slate-600 mb-1">
                Bulan / Periode
              </label>
              <select
                id="lap-bulan"
                value={filterBulan}
                onChange={(e) => setFilterBulan(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                {BULAN_OPTIONS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="lap-mapel" className="block font-semibold text-slate-600 mb-1">
                Mata Pelajaran
              </label>
              <select
                id="lap-mapel"
                value={filterMapel}
                onChange={(e) => setFilterMapel(e.target.value as 'all' | Mapel)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="all">Semua Mapel (Fisika, Kimia, Biologi)</option>
                <option value="fisika">Fisika</option>
                <option value="kimia">Kimia</option>
                <option value="biologi">Biologi</option>
              </select>
            </div>

            <div>
              <label htmlFor="lap-kelas" className="block font-semibold text-slate-600 mb-1">
                Jenjang Kelas
              </label>
              <select
                id="lap-kelas"
                value={filterKelas}
                onChange={(e) => setFilterKelas(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="all">Semua Kelas (X, XI, XII)</option>
                <option value="X ">Kelas X</option>
                <option value="XI ">Kelas XI</option>
                <option value="XII ">Kelas XII</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* AREA KERTAS LAPORAN RESMI DENGAN KOP SURAT SEKOLAH */}
      <article className="bg-white border border-slate-300 rounded-xl p-6 sm:p-10 print-only-area">
        {/* KOP SURAT SEKOLAH */}
        <header className="border-b-4 border-double border-slate-900 pb-4 mb-6 text-center">
          <div className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-slate-700">
            Pemerintah Provinsi · Dinas Pendidikan dan Kebudayaan
          </div>
          <div className="text-lg sm:text-xl font-bold tracking-tight uppercase text-slate-900 mt-0.5">
            SMAN 5 Garut
          </div>
          <div className="text-xs sm:text-sm font-semibold text-[#0F2744]">
            UNIT PENGELOLA LABORATORIUM IPA TERPADU (FISIKA · KIMIA · BIOLOGI)
          </div>
          <div className="text-[11px] text-slate-600 mt-1">
            Kabupaten Garut, Jawa Barat · Email: lab.ipa@sman5garut.sch.id
          </div>
        </header>

        {/* Judul Dokumen */}
        <div className="text-center mb-6">
          <h2 className="text-sm sm:text-base font-bold underline uppercase text-slate-900">
            {reportTitles[reportType]}
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Periode:{' '}
            {BULAN_OPTIONS.find((b) => b.value === filterBulan)?.label ?? filterBulan} · Mapel:{' '}
            {filterMapel === 'all' ? 'Semua Mapel' : filterMapel.toUpperCase()}
          </p>
        </div>

        {/* Surat Pembuka Khusus Usulan Pengadaan */}
        {reportType === 'usulan_rusak' && (
          <div className="text-xs text-slate-800 space-y-2 mb-5 leading-relaxed">
            <div className="flex justify-between">
              <span>Nomor: 421.3/118/LAB-IPA/XI/2026</span>
              <span>23 November 2026</span>
            </div>
            <div>
              Yth. <strong>Kepala SMAN 5 Garut</strong>
              <br />
              di Tempat
            </div>
            <p className="pt-1">
              Dengan hormat, berdasarkan hasil inventarisasi dan inspeksi berkala peralatan
              Laboratorium IPA, bersama ini kami mengajukan usulan perbaikan serta pengadaan ulang
              alat yang mengalami kerusakan agar kegiatan praktikum siswa tetap berjalan optimal:
            </p>
          </div>
        )}

        {/* TABEL ISI LAPORAN */}
        <div className="overflow-x-auto">
          {reportType === 'inventaris' && (
            <table className="w-full text-left border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800">
                  <th className="border border-slate-300 py-2 px-2.5 text-center w-10">No</th>
                  <th className="border border-slate-300 py-2 px-2.5">Kode Inventaris</th>
                  <th className="border border-slate-300 py-2 px-2.5">Nama Alat &amp; Merk</th>
                  <th className="border border-slate-300 py-2 px-2.5 text-right">Total</th>
                  <th className="border border-slate-300 py-2 px-2.5 text-right">Tersedia</th>
                  <th className="border border-slate-300 py-2 px-2.5">Kondisi</th>
                  <th className="border border-slate-300 py-2 px-2.5 text-right">Nilai Aset</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlat.map((a, idx) => (
                  <tr key={a.id}>
                    <td className="border border-slate-300 py-1.5 px-2.5 text-center font-mono tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-300 py-1.5 px-2.5 font-mono">
                      {a.kode_inventaris}
                    </td>
                    <td className="border border-slate-300 py-1.5 px-2.5">
                      {a.nama_alat} ({a.merk})
                    </td>
                    <td className="border border-slate-300 py-1.5 px-2.5 text-right font-mono tabular-nums">
                      {a.jumlah_total}
                    </td>
                    <td className="border border-slate-300 py-1.5 px-2.5 text-right font-mono tabular-nums">
                      {a.jumlah_tersedia}
                    </td>
                    <td className="border border-slate-300 py-1.5 px-2.5 capitalize">
                      {a.kondisi.replace('_', ' ')}
                    </td>
                    <td className="border border-slate-300 py-1.5 px-2.5 text-right font-mono tabular-nums">
                      {formatRupiah(a.harga * a.jumlah_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={3} className="border border-slate-300 py-2 px-2.5 text-right">
                    Total Rekapitulasi
                  </td>
                  <td className="border border-slate-300 py-2 px-2.5 text-right font-mono tabular-nums">
                    {filteredAlat.reduce((s, a) => s + a.jumlah_total, 0)}
                  </td>
                  <td className="border border-slate-300 py-2 px-2.5 text-right font-mono tabular-nums">
                    {filteredAlat.reduce((s, a) => s + a.jumlah_tersedia, 0)}
                  </td>
                  <td className="border border-slate-300 py-2 px-2.5" />
                  <td className="border border-slate-300 py-2 px-2.5 text-right font-mono tabular-nums">
                    {formatRupiah(
                      filteredAlat.reduce((s, a) => s + a.harga * a.jumlah_total, 0)
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}

          {(reportType === 'peminjaman' || reportType === 'pengajuan') && (
            <table className="w-full text-left border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800">
                  <th className="border border-slate-300 py-2 px-2.5 text-center w-10">No</th>
                  <th className="border border-slate-300 py-2 px-2.5">Kode</th>
                  <th className="border border-slate-300 py-2 px-2.5">Guru Pengaju</th>
                  <th className="border border-slate-300 py-2 px-2.5">Judul Praktikum</th>
                  <th className="border border-slate-300 py-2 px-2.5">Mapel / Kelas</th>
                  <th className="border border-slate-300 py-2 px-2.5">Tanggal</th>
                  <th className="border border-slate-300 py-2 px-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {(reportType === 'peminjaman' ? filteredPeminjaman : filteredPengajuan).length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="border border-slate-300 py-6 px-4 text-center text-slate-500"
                    >
                      Tidak ada data pada filter periode/mapel/kelas ini.
                    </td>
                  </tr>
                ) : (
                  (reportType === 'peminjaman' ? filteredPeminjaman : filteredPengajuan).map(
                    (p, idx) => {
                      const guru = db.users.find((u) => u.id === p.guru_id);
                      return (
                        <tr key={p.id}>
                          <td className="border border-slate-300 py-1.5 px-2.5 text-center font-mono">
                            {idx + 1}
                          </td>
                          <td className="border border-slate-300 py-1.5 px-2.5 font-mono">
                            {p.kode_pengajuan}
                          </td>
                          <td className="border border-slate-300 py-1.5 px-2.5">
                            {guru?.nama_lengkap ?? '-'}
                          </td>
                          <td className="border border-slate-300 py-1.5 px-2.5">
                            {p.judul_praktikum}
                          </td>
                          <td className="border border-slate-300 py-1.5 px-2.5 capitalize">
                            {p.mapel} · {p.kelas}
                          </td>
                          <td className="border border-slate-300 py-1.5 px-2.5 tabular-nums">
                            {formatTanggalIndonesia(p.tanggal_praktikum)} ({p.jam_mulai}–{p.jam_selesai})
                          </td>
                          <td className="border border-slate-300 py-1.5 px-2.5 capitalize">
                            {p.status.replace('_', ' ')}
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          )}

          {reportType === 'usulan_rusak' && (
            <table className="w-full text-left border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800">
                  <th className="border border-slate-300 py-2 px-2.5 text-center w-10">No</th>
                  <th className="border border-slate-300 py-2 px-2.5">Kode Inventaris</th>
                  <th className="border border-slate-300 py-2 px-2.5">Nama Alat</th>
                  <th className="border border-slate-300 py-2 px-2.5">Kondisi Saat Ini</th>
                  <th className="border border-slate-300 py-2 px-2.5 text-right">Usulan Unit</th>
                  <th className="border border-slate-300 py-2 px-2.5 text-right">Estimasi Biaya</th>
                </tr>
              </thead>
              <tbody>
                {damagedAlat.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="border border-slate-300 py-6 px-4 text-center text-slate-500"
                    >
                      Tidak ada alat berstatus rusak pada filter ini.
                    </td>
                  </tr>
                ) : (
                  damagedAlat.map((a, idx) => {
                    const qtyUsulan = Math.max(1, Math.ceil(a.jumlah_total * 0.25));
                    return (
                      <tr key={a.id}>
                        <td className="border border-slate-300 py-1.5 px-2.5 text-center font-mono">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-300 py-1.5 px-2.5 font-mono">
                          {a.kode_inventaris}
                        </td>
                        <td className="border border-slate-300 py-1.5 px-2.5">
                          {a.nama_alat} ({a.merk})
                        </td>
                        <td className="border border-slate-300 py-1.5 px-2.5 capitalize">
                          {a.kondisi.replace('_', ' ')}
                        </td>
                        <td className="border border-slate-300 py-1.5 px-2.5 text-right font-mono tabular-nums">
                          {qtyUsulan} unit
                        </td>
                        <td className="border border-slate-300 py-1.5 px-2.5 text-right font-mono tabular-nums">
                          {formatRupiah(qtyUsulan * a.harga)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={5} className="border border-slate-300 py-2 px-2.5 text-right">
                    Total Estimasi Anggaran Pengadaan / Perbaikan
                  </td>
                  <td className="border border-slate-300 py-2 px-2.5 text-right font-mono tabular-nums">
                    {formatRupiah(
                      damagedAlat.reduce(
                        (sum, a) => sum + Math.max(1, Math.ceil(a.jumlah_total * 0.25)) * a.harga,
                        0
                      )
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Blok Tanda Tangan Resmi */}
        <footer className="mt-10 grid grid-cols-2 gap-8 text-xs text-slate-800">
          <div className="text-center">
            <div>Mengetahui,</div>
            <div className="font-semibold">Kepala SMAN 5 Garut</div>
            <div className="h-16" />
            <div className="font-bold underline">{kepsek?.nama_lengkap ?? 'Effen Heryana, M.Pd'}</div>
            <div className="text-[11px] text-slate-600">NIP. 19710412 199802 1 003</div>
          </div>
          <div className="text-center">
            <div>Garut, 23 November 2026</div>
            <div className="font-semibold">Kepala Laboratorium IPA</div>
            <div className="h-16" />
            <div className="font-bold underline">
              {kepalaLab?.nama_lengkap ?? 'Efinda Nurdiansah, M.Pd'}
            </div>
            <div className="text-[11px] text-slate-600">NIP. 19750819 200312 1 002</div>
          </div>
        </footer>
      </article>
    </div>
  );
}
