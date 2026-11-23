import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Clock,
  Download,
  FileUp,
  Save,
  Upload,
} from 'lucide-react';
import { useLab } from '../context/LabContext';
import type { KelasSMA, Mapel } from '../types/database';
import { formatTanggalIndonesia } from '../utils/labLogic';
import { MapelLabel, StatusPengajuanBadge } from './StatusBadge';

type ModulTab = 'katalog' | 'nilai';

export function ModulPraktikumView() {
  const {
    db,
    usePraktikumForPengajuan,
    updatePraktikumLks,
    saveNilaiPraktikumBatch,
    notify,
  } = useLab();

  const [activeTab, setActiveTab] = useState<ModulTab>('katalog');
  const [filterMapel, setFilterMapel] = useState<'all' | Mapel>('all');
  const [filterKelas, setFilterKelas] = useState<'all' | KelasSMA>('all');

  // Upload LKS modal state
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);
  const [uploadFilename, setUploadFilename] = useState('');

  // Nilai Praktikum states
  const eligiblePengajuan = useMemo(
    () =>
      db.pengajuan.filter(
        (p) => p.status === 'disetujui' || p.status === 'disetujui_sebagian' || p.status === 'selesai'
      ),
    [db.pengajuan]
  );

  const [selectedPengajuanId, setSelectedPengajuanId] = useState<string>(
    eligiblePengajuan[0]?.id ?? ''
  );

  const students = useMemo(
    () => db.users.filter((u) => u.role === 'siswa'),
    [db.users]
  );

  const [nilaiDraft, setNilaiDraft] = useState<
    Record<string, { hadir: boolean; nilai: string; catatan: string }>
  >({});

  useEffect(() => {
    if (!selectedPengajuanId) return;
    const existing = db.nilai_praktikum.filter((n) => n.pengajuan_id === selectedPengajuanId);
    const next: Record<string, { hadir: boolean; nilai: string; catatan: string }> = {};
    for (const s of students) {
      const found = existing.find((n) => n.siswa_id === s.id);
      next[s.id] = {
        hadir: found ? found.hadir : true,
        nilai: found && found.nilai !== null ? String(found.nilai) : '85',
        catatan: found?.catatan ?? '',
      };
    }
    setNilaiDraft(next);
  }, [selectedPengajuanId, db.nilai_praktikum, students]);

  const filteredPraktikum = useMemo(() => {
    return db.praktikum.filter((p) => {
      if (filterMapel !== 'all' && p.mapel !== filterMapel) return false;
      if (filterKelas !== 'all' && p.kelas !== filterKelas) return false;
      return true;
    });
  }, [db.praktikum, filterMapel, filterKelas]);

  const handleDownloadLks = (judul: string, lksUrl: string) => {
    const content = [
      'LEMBAR KERJA SISWA (LKS) PRAKTIKUM IPA — SIM-LAB IPA SMA',
      '========================================================',
      `Judul Praktikum : ${judul}`,
      `Nama File LKS   : ${lksUrl}`,
      '',
      'A. TUJUAN PRAKTIKUM',
      '   Memahami konsep dan mempraktikkan prosedur ilmiah sesuai standar K3 Laboratorium.',
      '',
      'B. LANGKAH KERJA RINGKAS',
      '   1. Periksa kelengkapan alat dan bahan bersama asisten laboratorium.',
      '   2. Lakukan pengamatan/pengukuran secara teliti dan catat pada tabel hasil.',
      '   3. Bersihkan alat dan kembalikan ke meja penyerahan setelah selesai.',
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = lksUrl.endsWith('.pdf') ? lksUrl.replace('.pdf', '.txt') : `${lksUrl}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    notify('success', `File LKS "${lksUrl}" berhasil diunduh.`);
  };

  const handleSaveNilai = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPengajuanId) return;
    const entries = students.map((s) => {
      const row = nilaiDraft[s.id] ?? { hadir: true, nilai: '85', catatan: '' };
      const parsed = Number.parseInt(row.nilai, 10);
      return {
        siswa_id: s.id,
        hadir: row.hadir,
        nilai: row.hadir && !Number.isNaN(parsed) ? Math.max(0, Math.min(100, parsed)) : null,
        catatan: row.catatan.trim() || null,
      };
    });
    saveNilaiPraktikumBatch(selectedPengajuanId, entries);
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Modul Praktikum &amp; Penilaian Siswa
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Daftar template praktikum Fisika, Kimia, Biologi beserta LKS dan input absensi/nilai.
          </p>
        </div>

        <div className="inline-flex p-1 bg-slate-200/70 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('katalog')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'katalog'
                ? 'bg-white text-[#0F2744] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Modul Praktikum ({db.praktikum.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('nilai')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'nilai'
                ? 'bg-white text-[#0F2744] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Absensi &amp; Nilai Praktikum
          </button>
        </div>
      </div>

      {/* TAB 1: KATALOG MODUL PRAKTIKUM */}
      {activeTab === 'katalog' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600">Mapel:</span>
              {(['all', 'fisika', 'kimia', 'biologi'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFilterMapel(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    filterMapel === m
                      ? 'bg-[#0F2744] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {m === 'all' ? 'Semua' : m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600">Kelas:</span>
              {(['all', 'X', 'XI', 'XII'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFilterKelas(k)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    filterKelas === k
                      ? 'bg-[#0F2744] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {k === 'all' ? 'Semua Kelas' : `Kelas ${k}`}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPraktikum.map((prk) => {
              const items = db.praktikum_alat.filter((pa) => pa.praktikum_id === prk.id);
              return (
                <article
                  key={prk.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <MapelLabel mapel={prk.mapel} />
                        <span className="font-semibold text-slate-700">Kelas {prk.kelas}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-mono tabular-nums">
                        <Clock className="w-3.5 h-3.5" />
                        {prk.estimasi_waktu_menit} mnt
                      </span>
                    </div>

                    <div>
                      <h2 className="text-sm font-bold text-slate-900 leading-snug">
                        {prk.judul_praktikum}
                      </h2>
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                        {prk.deskripsi}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
                        Kebutuhan Alat &amp; Bahan:
                      </div>
                      <ul className="space-y-1 text-xs text-slate-700">
                        {items.map((pa) => {
                          const alatItem =
                            pa.item_type === 'alat'
                              ? db.alat.find((a) => a.id === pa.item_id)
                              : null;
                          const bahanItem =
                            pa.item_type === 'bahan_kimia'
                              ? db.bahan_kimia.find((b) => b.id === pa.item_id)
                              : null;
                          const name = alatItem?.nama_alat ?? bahanItem?.nama_bahan ?? pa.item_id;
                          const unit = alatItem ? 'unit' : bahanItem?.satuan ?? '';
                          return (
                            <li
                              key={pa.id}
                              className="flex items-center justify-between gap-2 text-[11px]"
                            >
                              <span className="truncate text-slate-700">· {name}</span>
                              <span className="font-mono tabular-nums font-semibold text-slate-900 shrink-0">
                                {pa.jumlah_dibutuhkan} {unit}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadLks(prk.judul_praktikum, prk.lks_url)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-[#0F2744]"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download LKS
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadTargetId(prk.id);
                          setUploadFilename(prk.lks_url);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-[#0F2744]"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Perbarui LKS
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => usePraktikumForPengajuan(prk.id)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F2744] hover:bg-[#1E3A5F] text-white text-xs font-semibold transition-colors"
                    >
                      Gunakan untuk Pengajuan
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: ABSENSI & NILAI PRAKTIKUM PER PENGAJUAN */}
      {activeTab === 'nilai' && (
        <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-200">
            <div className="flex-1 max-w-xl">
              <label
                htmlFor="select-pgj-nilai"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Pilih Sesi Praktikum (Pengajuan Disetujui / Selesai)
              </label>
              <select
                id="select-pgj-nilai"
                value={selectedPengajuanId}
                onChange={(e) => setSelectedPengajuanId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
              >
                {eligiblePengajuan.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.kode_pengajuan} — {p.judul_praktikum} ({formatTanggalIndonesia(p.tanggal_praktikum)})
                  </option>
                ))}
              </select>
            </div>

            {selectedPengajuanId && (
              <div className="flex items-center gap-2">
                {(() => {
                  const pgj = db.pengajuan.find((p) => p.id === selectedPengajuanId);
                  return pgj ? <StatusPengajuanBadge status={pgj.status} /> : null;
                })()}
              </div>
            )}
          </div>

          <form onSubmit={handleSaveNilai} className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[680px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4">Kelas</th>
                    <th className="py-3 px-4">Kehadiran</th>
                    <th className="py-3 px-4">Nilai (0–100)</th>
                    <th className="py-3 px-4">Catatan Penilaian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {students.map((s) => {
                    const row = nilaiDraft[s.id] ?? { hadir: true, nilai: '85', catatan: '' };
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-semibold text-slate-900">{s.nama_lengkap}</td>
                        <td className="py-3 px-4 text-slate-600">{s.kelas ?? '-'}</td>
                        <td className="py-3 px-4">
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={row.hadir}
                              onChange={(e) =>
                                setNilaiDraft((prev) => ({
                                  ...prev,
                                  [s.id]: { ...row, hadir: e.target.checked },
                                }))
                              }
                              className="w-4 h-4 rounded border-slate-300 text-[#0F2744]"
                            />
                            <span className={row.hadir ? 'text-emerald-700 font-medium' : 'text-red-700'}>
                              {row.hadir ? 'Hadir' : 'Tidak Hadir'}
                            </span>
                          </label>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            aria-label={`Nilai ${s.nama_lengkap}`}
                            min={0}
                            max={100}
                            disabled={!row.hadir}
                            value={row.hadir ? row.nilai : ''}
                            onChange={(e) =>
                              setNilaiDraft((prev) => ({
                                ...prev,
                                [s.id]: { ...row, nilai: e.target.value },
                              }))
                            }
                            className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono tabular-nums disabled:bg-slate-100"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            aria-label={`Catatan ${s.nama_lengkap}`}
                            value={row.catatan}
                            onChange={(e) =>
                              setNilaiDraft((prev) => ({
                                ...prev,
                                [s.id]: { ...row, catatan: e.target.value },
                              }))
                            }
                            placeholder="Catatan kinerja / laporan..."
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0F2744] hover:bg-[#1E3A5F] text-white text-xs font-semibold"
              >
                <Save className="w-4 h-4" />
                Simpan Absensi &amp; Nilai
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Modal Simulasi Upload LKS */}
      {uploadTargetId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!uploadFilename.trim()) return;
              updatePraktikumLks(uploadTargetId, uploadFilename.trim());
              setUploadTargetId(null);
            }}
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 space-y-4"
          >
            <div className="flex items-center gap-2.5">
              <FileUp className="w-5 h-5 text-[#0F2744]" />
              <h3 className="text-base font-bold text-slate-900">Upload / Perbarui LKS PDF</h3>
            </div>
            <div className="text-xs space-y-3">
              <div>
                <label htmlFor="lks-file-input" className="block font-semibold text-slate-700 mb-1">
                  Pilih Berkas PDF (Simulasi)
                </label>
                <input
                  id="lks-file-input"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setUploadFilename(file.name);
                  }}
                  className="w-full text-xs text-slate-600"
                />
              </div>
              <div>
                <label htmlFor="lks-name-input" className="block font-semibold text-slate-700 mb-1">
                  Nama Dokumen LKS *
                </label>
                <input
                  id="lks-name-input"
                  required
                  value={uploadFilename}
                  onChange={(e) => setUploadFilename(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setUploadTargetId(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#0F2744] hover:bg-[#1E3A5F] text-white text-xs font-semibold"
              >
                Simpan LKS
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
