import React, { useEffect, useMemo, useState } from 'react';
import { Award, BookOpen, Save } from 'lucide-react';
import { useLab } from '../context/LabContext';
import { canManagePraktikumRole, formatTanggalIndonesia } from '../utils/labLogic';
import { ModulCatalogSection } from './ModulCatalogSection';
import { StatusPengajuanBadge } from './StatusBadge';

type ModulTab = 'katalog' | 'nilai';

export function ModulPraktikumView() {
  const { db, currentUser, saveNilaiPraktikumBatch } = useLab();

  const canManage = canManagePraktikumRole(currentUser?.role);
  const [activeTab, setActiveTab] = useState<ModulTab>('katalog');

  useEffect(() => {
    if (!canManage && activeTab === 'nilai') {
      setActiveTab('katalog');
    }
  }, [canManage, activeTab]);

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
            {canManage ? 'Modul Praktikum & Penilaian Siswa' : 'Katalog Modul Praktikum'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {canManage
              ? 'Kelola modul praktikum Fisika, Kimia, Biologi beserta LKS dan input absensi/nilai.'
              : 'Daftar modul praktikum Fisika, Kimia, Biologi beserta kebutuhan alat dan file LKS.'}
          </p>
        </div>

        {canManage && (
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
        )}
      </div>

      {/* TAB 1: KATALOG MODUL PRAKTIKUM */}
      {activeTab === 'katalog' && <ModulCatalogSection />}

      {/* TAB 2: ABSENSI & NILAI PRAKTIKUM PER PENGAJUAN */}
      {canManage && activeTab === 'nilai' && (
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
    </div>
  );
}
