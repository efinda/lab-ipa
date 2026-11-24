import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Clock,
  Download,
  FileUp,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useLab } from '../context/LabContext';
import type { ItemType, KelasSMA, Mapel, Praktikum } from '../types/database';
import { canManagePraktikumRole, type PraktikumItemPayload } from '../utils/labLogic';
import { MapelLabel } from './StatusBadge';

interface ModulCatalogSectionProps {
  isPublic?: boolean;
}

interface ModulFormState {
  judul_praktikum: string;
  mapel: Mapel;
  kelas: KelasSMA;
  estimasi_waktu_menit: string;
  lks_url: string;
  deskripsi: string;
  items: PraktikumItemPayload[];
}

export function ModulCatalogSection({ isPublic = false }: ModulCatalogSectionProps) {
  const {
    db,
    currentUser,
    addPraktikum,
    updatePraktikum,
    updatePraktikumLks,
    usePraktikumForPengajuan,
    notify,
  } = useLab();

  const canManage = !isPublic && canManagePraktikumRole(currentUser?.role);

  const [filterMapel, setFilterMapel] = useState<'all' | Mapel>('all');
  const [filterKelas, setFilterKelas] = useState<'all' | KelasSMA>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Tambah / Edit Modul
  const [modulModalOpen, setModulModalOpen] = useState(false);
  const [editingPraktikum, setEditingPraktikum] = useState<Praktikum | null>(null);
  const [formState, setFormState] = useState<ModulFormState>({
    judul_praktikum: '',
    mapel: 'fisika',
    kelas: 'X',
    estimasi_waktu_menit: '90',
    lks_url: '',
    deskripsi: '',
    items: [],
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Modal Upload LKS cepat
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);
  const [uploadFilename, setUploadFilename] = useState('');

  const sortedAlat = useMemo(
    () => [...db.alat].sort((a, b) => a.nama_alat.localeCompare(b.nama_alat, 'id')),
    [db.alat]
  );

  const sortedBahan = useMemo(
    () => [...db.bahan_kimia].sort((a, b) => a.nama_bahan.localeCompare(b.nama_bahan, 'id')),
    [db.bahan_kimia]
  );

  useEffect(() => {
    if (!modulModalOpen && !uploadTargetId) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModulModalOpen(false);
        setUploadTargetId(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [modulModalOpen, uploadTargetId]);

  const filteredPraktikum = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return db.praktikum.filter((p) => {
      if (filterMapel !== 'all' && p.mapel !== filterMapel) return false;
      if (filterKelas !== 'all' && p.kelas !== filterKelas) return false;
      if (!q) return true;
      const author = db.users.find((u) => u.id === p.dibuat_oleh)?.nama_lengkap ?? '';
      return (
        p.judul_praktikum.toLowerCase().includes(q) ||
        p.deskripsi.toLowerCase().includes(q) ||
        author.toLowerCase().includes(q)
      );
    });
  }, [db.praktikum, db.users, filterMapel, filterKelas, searchQuery]);

  const getDefaultItem = (type: ItemType): PraktikumItemPayload => ({
    item_type: type,
    item_id: type === 'alat' ? sortedAlat[0]?.id ?? '' : sortedBahan[0]?.id ?? '',
    jumlah_dibutuhkan: 1,
  });

  const openAddModal = () => {
    const defaultMapel: Mapel = currentUser?.mapel ?? 'fisika';
    setEditingPraktikum(null);
    setFormState({
      judul_praktikum: '',
      mapel: defaultMapel,
      kelas: 'X',
      estimasi_waktu_menit: '90',
      lks_url: '',
      deskripsi: '',
      items: [getDefaultItem('alat')],
    });
    setFormError(null);
    setModulModalOpen(true);
  };

  const openEditModal = (prk: Praktikum) => {
    const currentItems = db.praktikum_alat
      .filter((pa) => pa.praktikum_id === prk.id)
      .map((pa) => ({
        item_type: pa.item_type,
        item_id: pa.item_id,
        jumlah_dibutuhkan: pa.jumlah_dibutuhkan,
      }));
    setEditingPraktikum(prk);
    setFormState({
      judul_praktikum: prk.judul_praktikum,
      mapel: prk.mapel,
      kelas: prk.kelas,
      estimasi_waktu_menit: String(prk.estimasi_waktu_menit),
      lks_url: prk.lks_url,
      deskripsi: prk.deskripsi,
      items: currentItems.length > 0 ? currentItems : [getDefaultItem('alat')],
    });
    setFormError(null);
    setModulModalOpen(true);
  };

  const handleAddRow = () => {
    setFormState((prev) => ({
      ...prev,
      items: [...prev.items, getDefaultItem('alat')],
    }));
  };

  const handleRemoveRow = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  const handleChangeRowType = (index: number, nextType: ItemType) => {
    const defaultId = nextType === 'alat' ? sortedAlat[0]?.id ?? '' : sortedBahan[0]?.id ?? '';
    setFormState((prev) => ({
      ...prev,
      items: prev.items.map((row, idx) =>
        idx === index ? { ...row, item_type: nextType, item_id: defaultId } : row
      ),
    }));
  };

  const handleSaveModul = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      judul_praktikum: formState.judul_praktikum,
      mapel: formState.mapel,
      kelas: formState.kelas,
      deskripsi: formState.deskripsi,
      lks_url: formState.lks_url,
      estimasi_waktu_menit: Number.parseInt(formState.estimasi_waktu_menit, 10),
      items: formState.items,
    };

    const res = editingPraktikum
      ? updatePraktikum(editingPraktikum.id, payload)
      : addPraktikum(payload);

    if (!res.ok) {
      setFormError(res.error ?? 'Gagal menyimpan modul praktikum.');
      return;
    }

    setModulModalOpen(false);
    setEditingPraktikum(null);
    setFormError(null);
  };

  const handleDownloadLks = (judul: string, lksUrl: string) => {
    const content = [
      'LEMBAR KERJA SISWA (LKS) PRAKTIKUM IPA — SIM-LAB IPA SMAN 5 GARUT',
      '==================================================================',
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

  return (
    <div className="space-y-4">
      {/* Toolbar Filter, Pencarian, & Tombol Tambah (Admin / Guru) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-semibold text-slate-600 mr-1">Mapel:</span>
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

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-semibold text-slate-600 mr-1">Kelas:</span>
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

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari judul modul atau penyusun..."
                aria-label="Cari modul praktikum"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F2744]"
              />
            </div>

            {canManage && (
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F2744] hover:bg-[#1E3A5F] text-white text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Tambah Modul
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Daftar Kartu Modul */}
      {filteredPraktikum.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500 text-xs">
          <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          Tidak ada modul praktikum yang sesuai dengan filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPraktikum.map((prk) => {
            const items = db.praktikum_alat.filter((pa) => pa.praktikum_id === prk.id);
            const creator = db.users.find((u) => u.id === prk.dibuat_oleh);
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
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{prk.deskripsi}</p>
                    {creator && (
                      <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-500">
                        <UserIcon className="w-3 h-3" />
                        <span>Penyusun: {creator.nama_lengkap}</span>
                      </div>
                    )}
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

                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadLks(prk.judul_praktikum, prk.lks_url)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-[#0F2744]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download LKS
                    </button>

                    {canManage && (
                      <div className="flex items-center gap-3">
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
                        <button
                          type="button"
                          onClick={() => openEditModal(prk)}
                          aria-label={`Edit modul ${prk.judul_praktikum}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F2744] hover:underline"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      </div>
                    )}
                  </div>

                  {canManage && (
                    <button
                      type="button"
                      onClick={() => usePraktikumForPengajuan(prk.id)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F2744] hover:bg-[#1E3A5F] text-white text-xs font-semibold transition-colors"
                    >
                      Gunakan untuk Pengajuan
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal Tambah / Edit Modul Praktikum */}
      {canManage && modulModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modul-form-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-[#0F2744] text-white">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <h2 id="modul-form-title" className="text-sm font-bold">
                  {editingPraktikum ? 'Edit Modul Praktikum' : 'Tambah Modul Praktikum Baru'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModulModalOpen(false)}
                aria-label="Tutup form modul"
                className="p-1 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModul} className="p-5 overflow-y-auto space-y-4 text-xs">
              {formError && (
                <div
                  role="alert"
                  className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700"
                >
                  {formError}
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor="modul-judul-input" className="block font-semibold text-slate-700">
                  Judul Praktikum *
                </label>
                <input
                  id="modul-judul-input"
                  type="text"
                  required
                  value={formState.judul_praktikum}
                  onChange={(e) => {
                    setFormState((prev) => ({ ...prev, judul_praktikum: e.target.value }));
                    if (formError) setFormError(null);
                  }}
                  placeholder="Contoh: Percobaan Ayunan Bandul Sederhana"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F2744]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label htmlFor="modul-mapel-select" className="block font-semibold text-slate-700">
                    Mata Pelajaran *
                  </label>
                  <select
                    id="modul-mapel-select"
                    value={formState.mapel}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, mapel: e.target.value as Mapel }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2744]"
                  >
                    <option value="fisika">Fisika</option>
                    <option value="kimia">Kimia</option>
                    <option value="biologi">Biologi</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="modul-kelas-select" className="block font-semibold text-slate-700">
                    Jenjang Kelas *
                  </label>
                  <select
                    id="modul-kelas-select"
                    value={formState.kelas}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, kelas: e.target.value as KelasSMA }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2744]"
                  >
                    <option value="X">Kelas X</option>
                    <option value="XI">Kelas XI</option>
                    <option value="XII">Kelas XII</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="modul-waktu-input" className="block font-semibold text-slate-700">
                    Estimasi Waktu (Menit) *
                  </label>
                  <input
                    id="modul-waktu-input"
                    type="number"
                    min={10}
                    max={480}
                    required
                    value={formState.estimasi_waktu_menit}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, estimasi_waktu_menit: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0F2744]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="modul-deskripsi-input" className="block font-semibold text-slate-700">
                  Deskripsi &amp; Tujuan Praktikum *
                </label>
                <textarea
                  id="modul-deskripsi-input"
                  rows={3}
                  required
                  value={formState.deskripsi}
                  onChange={(e) => {
                    setFormState((prev) => ({ ...prev, deskripsi: e.target.value }));
                    if (formError) setFormError(null);
                  }}
                  placeholder="Jelaskan tujuan, metode singkat, dan capaian praktikum..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F2744]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="modul-lks-input" className="block font-semibold text-slate-700">
                    Nama File / Tautan LKS
                  </label>
                  <input
                    id="modul-lks-input"
                    type="text"
                    value={formState.lks_url}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, lks_url: e.target.value }))
                    }
                    placeholder="Contoh: LKS-FIS-BANDUL.pdf"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F2744]"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="modul-lks-file" className="block font-semibold text-slate-700">
                    Pilih Berkas LKS (Opsional)
                  </label>
                  <input
                    id="modul-lks-file"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormState((prev) => ({ ...prev, lks_url: file.name }));
                      }
                    }}
                    className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-200 file:bg-slate-50 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-100"
                  />
                </div>
              </div>

              {/* Kebutuhan Alat & Bahan */}
              <div className="pt-2 border-t border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">
                    Daftar Kebutuhan Alat &amp; Bahan *
                  </span>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Baris
                  </button>
                </div>

                {formState.items.length === 0 ? (
                  <div className="p-3 rounded-lg border border-dashed border-slate-300 text-center text-slate-500">
                    Belum ada alat atau bahan yang dipilih. Klik &ldquo;Tambah Baris&rdquo;.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formState.items.map((row, index) => {
                      const list = row.item_type === 'alat' ? sortedAlat : sortedBahan;
                      return (
                        <div
                          key={`${index}-${row.item_type}`}
                          className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200"
                        >
                          <div className="col-span-4 sm:col-span-3">
                            <select
                              aria-label={`Tipe item baris ${index + 1}`}
                              value={row.item_type}
                              onChange={(e) =>
                                handleChangeRowType(index, e.target.value as ItemType)
                              }
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                            >
                              <option value="alat">Alat Lab</option>
                              <option value="bahan_kimia">Bahan Kimia</option>
                            </select>
                          </div>

                          <div className="col-span-8 sm:col-span-6">
                            <select
                              aria-label={`Nama alat atau bahan baris ${index + 1}`}
                              value={row.item_id}
                              onChange={(e) =>
                                setFormState((prev) => ({
                                  ...prev,
                                  items: prev.items.map((it, idx) =>
                                    idx === index ? { ...it, item_id: e.target.value } : it
                                  ),
                                }))
                              }
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                            >
                              {list.map((item) => {
                                const label =
                                  row.item_type === 'alat'
                                    ? `${(item as (typeof sortedAlat)[number]).nama_alat} (Tersedia: ${(item as (typeof sortedAlat)[number]).jumlah_tersedia})`
                                    : `${(item as (typeof sortedBahan)[number]).nama_bahan} (${(item as (typeof sortedBahan)[number]).satuan})`;
                                return (
                                  <option key={item.id} value={item.id}>
                                    {label}
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          <div className="col-span-9 sm:col-span-2">
                            <input
                              type="number"
                              min={1}
                              aria-label={`Jumlah baris ${index + 1}`}
                              value={row.jumlah_dibutuhkan}
                              onChange={(e) => {
                                const val = Number.parseFloat(e.target.value);
                                setFormState((prev) => ({
                                  ...prev,
                                  items: prev.items.map((it, idx) =>
                                    idx === index
                                      ? { ...it, jumlah_dibutuhkan: Number.isNaN(val) ? 1 : val }
                                      : it
                                  ),
                                }));
                              }}
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono tabular-nums"
                            />
                          </div>

                          <div className="col-span-3 sm:col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(index)}
                              aria-label={`Hapus baris item ${index + 1}`}
                              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModulModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#0F2744] hover:bg-[#1E3A5F] text-white text-xs font-semibold"
                >
                  {editingPraktikum ? 'Simpan Perubahan' : 'Simpan Modul'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Simulasi Upload LKS */}
      {canManage && uploadTargetId && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lks-modal-title"
        >
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
              <h3 id="lks-modal-title" className="text-base font-bold text-slate-900">
                Upload / Perbarui LKS PDF
              </h3>
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
