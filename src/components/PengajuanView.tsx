import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ClipboardList,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { useLab } from '../context/LabContext';
import type {
  ItemType,
  KondisiAlat,
  Mapel,
  StatusPengajuan,
} from '../types/database';
import {
  checkScheduleConflict,
  formatTanggalIndonesia,
  validateItemStock,
  type RequestedItemInput,
  type ReturnInspectionInput,
} from '../utils/labLogic';
import { KondisiBadge, MapelLabel, StatusPengajuanBadge } from './StatusBadge';

const LAB_BY_MAPEL: Record<Mapel, string> = {
  fisika: 'lab-fisika',
  kimia: 'lab-kimia',
  biologi: 'lab-biologi',
};

export function PengajuanView() {
  const {
    db,
    currentUser,
    prefillPraktikumId,
    setPrefillPraktikumId,
    openPengajuanForm,
    setOpenPengajuanForm,
    selectedPengajuanId,
    setSelectedPengajuanId,
    submitPengajuan,
    approvePengajuan,
    rejectPengajuan,
    submitReturnByGuru,
    completePengajuanInspection,
    cancelPengajuan,
  } = useLab();

  const isKepalaLab = currentUser?.role === 'kepala_lab';
  const isGuru = currentUser?.role === 'guru_ipa';
  const isSiswa = currentUser?.role === 'siswa';
  const canCreate = isGuru || isKepalaLab;

  // List filter states
  const [filterStatus, setFilterStatus] = useState<'all' | StatusPengajuan>('all');
  const [filterMapel, setFilterMapel] = useState<'all' | Mapel>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form Pengajuan states
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [mapel, setMapel] = useState<Mapel>(currentUser?.mapel ?? 'fisika');
  const [kelas, setKelas] = useState('XI IPA 1');
  const [labId, setLabId] = useState(LAB_BY_MAPEL[currentUser?.mapel ?? 'fisika']);
  const [tanggal, setTanggal] = useState('2026-11-29');
  const [jamMulai, setJamMulai] = useState('08:00');
  const [jamSelesai, setJamSelesai] = useState('09:30');
  const [judul, setJudul] = useState('');
  const [catatanGuru, setCatatanGuru] = useState('');
  const [cartItems, setCartItems] = useState<RequestedItemInput[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogTab, setCatalogTab] = useState<'alat' | 'bahan_kimia'>('alat');
  const [formError, setFormError] = useState<string | null>(null);

  // Detail & Approval states
  const [partialQuantities, setPartialQuantities] = useState<Record<string, number>>({});
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [inspectionRows, setInspectionRows] = useState<Record<string, ReturnInspectionInput>>({});

  const applyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const prk = db.praktikum.find((p) => p.id === templateId);
    if (!prk) return;
    setMapel(prk.mapel);
    setKelas(`${prk.kelas} IPA 1`);
    setLabId(LAB_BY_MAPEL[prk.mapel]);
    setJudul(`${prk.judul_praktikum} (${prk.kelas} IPA 1)`);
    const needed = db.praktikum_alat
      .filter((pa) => pa.praktikum_id === prk.id)
      .map((pa) => ({
        item_type: pa.item_type,
        item_id: pa.item_id,
        jumlah: pa.jumlah_dibutuhkan,
      }));
    setCartItems(needed);
    setFormError(null);
  };

  useEffect(() => {
    if (prefillPraktikumId) {
      applyTemplate(prefillPraktikumId);
      setOpenPengajuanForm(true);
      setPrefillPraktikumId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillPraktikumId]);

  const selectedPengajuan = useMemo(
    () => db.pengajuan.find((p) => p.id === selectedPengajuanId) ?? null,
    [db.pengajuan, selectedPengajuanId]
  );

  const selectedDetails = useMemo(
    () =>
      selectedPengajuan
        ? db.pengajuan_detail.filter((d) => d.pengajuan_id === selectedPengajuan.id)
        : [],
    [db.pengajuan_detail, selectedPengajuan]
  );

  // Initialize approval quantities & inspection rows when opening a detail
  useEffect(() => {
    if (!selectedPengajuan) return;
    const nextQty: Record<string, number> = {};
    const nextInsp: Record<string, ReturnInspectionInput> = {};
    for (const d of selectedDetails) {
      const approved = d.jumlah_disetujui ?? d.jumlah_diajukan;
      nextQty[d.id] = approved;
      nextInsp[d.id] = {
        detail_id: d.id,
        jumlah_dikembalikan: d.item_type === 'alat' ? approved : 0,
        kondisi_kembali: 'baik',
        jumlah_rusak: 1,
        catatan_kerusakan: '',
      };
    }
    setPartialQuantities(nextQty);
    setInspectionRows(nextInsp);
    setShowRejectBox(false);
    setRejectReason('');
    setShowInspectionForm(false);
  }, [selectedPengajuan, selectedDetails]);

  // Real-time validation in Form Pengajuan
  const stockIssues = useMemo(
    () => validateItemStock(cartItems, db.alat, db.bahan_kimia),
    [cartItems, db.alat, db.bahan_kimia]
  );

  const stockIssueMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const issue of stockIssues) {
      map.set(`${issue.item_type}:${issue.item_id}`, issue.message);
    }
    return map;
  }, [stockIssues]);

  const scheduleConflict = useMemo(
    () => checkScheduleConflict(db.jadwal_lab, labId, tanggal, jamMulai, jamSelesai),
    [db.jadwal_lab, labId, tanggal, jamMulai, jamSelesai]
  );

  // Filtered Pengajuan list
  const filteredPengajuan = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return db.pengajuan.filter((p) => {
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (filterMapel !== 'all' && p.mapel !== filterMapel) return false;
      if (!q) return true;
      const guru = db.users.find((u) => u.id === p.guru_id);
      return (
        p.kode_pengajuan.toLowerCase().includes(q) ||
        p.judul_praktikum.toLowerCase().includes(q) ||
        (guru?.nama_lengkap.toLowerCase().includes(q) ?? false)
      );
    });
  }, [db.pengajuan, db.users, filterStatus, filterMapel, searchQuery]);

  // Catalog items for Form Picker
  const catalogAlat = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return db.alat.filter(
      (a) =>
        !q ||
        a.nama_alat.toLowerCase().includes(q) ||
        a.kode_inventaris.toLowerCase().includes(q)
    );
  }, [db.alat, catalogSearch]);

  const catalogBahan = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return db.bahan_kimia.filter(
      (b) =>
        !q ||
        b.nama_bahan.toLowerCase().includes(q) ||
        b.kode_bahan.toLowerCase().includes(q)
    );
  }, [db.bahan_kimia, catalogSearch]);

  const handleAddItemToCart = (itemType: ItemType, itemId: string) => {
    setCartItems((prev) => {
      const idx = prev.findIndex((i) => i.item_type === itemType && i.item_id === itemId);
      if (idx >= 0) {
        return prev.map((it, i) =>
          i === idx ? { ...it, jumlah: it.jumlah + (itemType === 'alat' ? 1 : 50) } : it
        );
      }
      return [...prev, { item_type: itemType, item_id: itemId, jumlah: itemType === 'alat' ? 1 : 50 }];
    });
  };

  const handleUpdateCartQty = (itemType: ItemType, itemId: string, qty: number) => {
    setCartItems((prev) =>
      prev.map((it) =>
        it.item_type === itemType && it.item_id === itemId
          ? { ...it, jumlah: Math.max(0, qty) }
          : it
      )
    );
  };

  const handleRemoveCartItem = (itemType: ItemType, itemId: string) => {
    setCartItems((prev) =>
      prev.filter((it) => !(it.item_type === itemType && it.item_id === itemId))
    );
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (scheduleConflict.conflict) {
      setFormError(scheduleConflict.message || 'Jadwal Bentrok');
      return;
    }
    if (stockIssues.length > 0) {
      setFormError(stockIssues[0].message);
      return;
    }
    const res = submitPengajuan({
      praktikum_id: selectedTemplateId || null,
      judul_praktikum: judul,
      mapel,
      kelas,
      lab_id: labId,
      tanggal_praktikum: tanggal,
      jam_mulai: jamMulai,
      jam_selesai: jamSelesai,
      catatan_guru: catatanGuru,
      items: cartItems,
    });
    if (!res.ok) {
      setFormError(res.error ?? 'Gagal mengirim pengajuan.');
      return;
    }
    // Reset and show detail
    setOpenPengajuanForm(false);
    setSelectedTemplateId('');
    setJudul('');
    setCatatanGuru('');
    setCartItems([]);
    if (res.createdId) {
      setSelectedPengajuanId(res.createdId);
    }
  };

  const openNewForm = () => {
    setSelectedPengajuanId(null);
    setSelectedTemplateId('');
    const defaultMapel = currentUser?.mapel ?? 'fisika';
    setMapel(defaultMapel);
    setLabId(LAB_BY_MAPEL[defaultMapel]);
    setJudul('');
    setCatatanGuru('');
    setCartItems([]);
    setFormError(null);
    setOpenPengajuanForm(true);
  };

  // ==============================================================
  // VIEW 1: DETAIL & PERSETUJUAN / PENGEMBALIAN PENGAJUAN
  // ==============================================================
  if (selectedPengajuan && !openPengajuanForm) {
    const guru = db.users.find((u) => u.id === selectedPengajuan.guru_id);
    const lab = db.labs.find((l) => l.id === selectedPengajuan.lab_id);
    const approver = selectedPengajuan.disetujui_oleh
      ? db.users.find((u) => u.id === selectedPengajuan.disetujui_oleh)
      : null;

    const isPending = selectedPengajuan.status === 'menunggu';
    const isRunning =
      selectedPengajuan.status === 'disetujui' ||
      selectedPengajuan.status === 'disetujui_sebagian';
    const hasPartialEdit = selectedDetails.some(
      (d) => (partialQuantities[d.id] ?? d.jumlah_diajukan) < d.jumlah_diajukan
    );

    const conflictOnApprove = isPending
      ? checkScheduleConflict(
          db.jadwal_lab,
          selectedPengajuan.lab_id,
          selectedPengajuan.tanggal_praktikum,
          selectedPengajuan.jam_mulai,
          selectedPengajuan.jam_selesai,
          selectedPengajuan.id
        )
      : { conflict: false };

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedPengajuanId(null)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#0F2744] hover:underline self-start"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Daftar Pengajuan
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {/* Guru cancel while waiting */}
            {isPending && (isGuru || isKepalaLab) && (
              <button
                type="button"
                onClick={() => cancelPengajuan(selectedPengajuan.id)}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
              >
                Batalkan Pengajuan
              </button>
            )}

            {/* Guru "Selesaikan & Kembalikan" */}
            {isRunning && !selectedPengajuan.pengembalian_diajukan && (isGuru || isKepalaLab) && (
              <button
                type="button"
                onClick={() => submitReturnByGuru(selectedPengajuan.id)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F2744] hover:bg-[#1E3A5F] text-white text-xs font-semibold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Selesaikan &amp; Kembalikan
              </button>
            )}

            {/* Kepala Lab Inspect & Complete */}
            {isRunning && isKepalaLab && (
              <button
                type="button"
                onClick={() => setShowInspectionForm((v) => !v)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {showInspectionForm ? 'Tutup Form Inspeksi' : 'Inspeksi & Selesaikan Pengembalian'}
              </button>
            )}
          </div>
        </div>

        {/* Info Ringkas Pengajuan */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-mono font-bold text-[#0F2744]">
                  {selectedPengajuan.kode_pengajuan}
                </span>
                <span>·</span>
                <MapelLabel mapel={selectedPengajuan.mapel} />
                <span>·</span>
                <span>Kelas {selectedPengajuan.kelas}</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                {selectedPengajuan.judul_praktikum}
              </h1>
            </div>
            <StatusPengajuanBadge
              status={selectedPengajuan.status}
              pengembalianDiajukan={selectedPengajuan.pengembalian_diajukan}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block">Guru Pengaju</span>
              <span className="font-semibold text-slate-900 mt-0.5 block">
                {guru?.nama_lengkap ?? '-'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Laboratorium</span>
              <span className="font-semibold text-slate-900 mt-0.5 block">
                {lab?.nama_lab ?? '-'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Tanggal &amp; Jam Praktikum</span>
              <span className="font-semibold text-slate-900 mt-0.5 block tabular-nums">
                {formatTanggalIndonesia(selectedPengajuan.tanggal_praktikum)} ·{' '}
                {selectedPengajuan.jam_mulai}–{selectedPengajuan.jam_selesai}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Persetujuan Kepala Lab</span>
              <span className="font-semibold text-slate-900 mt-0.5 block">
                {approver ? approver.nama_lengkap : 'Belum diproses'}
              </span>
            </div>
          </div>

          {selectedPengajuan.catatan_guru && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <span className="font-semibold text-slate-900">Catatan Guru: </span>
              {selectedPengajuan.catatan_guru}
            </div>
          )}

          {selectedPengajuan.status === 'ditolak' && selectedPengajuan.alasan_penolakan && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900">
              <span className="font-bold">Alasan Penolakan: </span>
              {selectedPengajuan.alasan_penolakan}
            </div>
          )}

          {isPending && isKepalaLab && conflictOnApprove.conflict && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{conflictOnApprove.message}</span>
            </div>
          )}
        </section>

        {/* Tabel Item Alat & Bahan */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Daftar Alat &amp; Bahan yang Diajukan
            </h2>
            {isPending && isKepalaLab && (
              <span className="text-xs text-slate-500">
                Ubah kolom &ldquo;Disetujui&rdquo; untuk persetujuan sebagian
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[780px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Nama Item</th>
                  <th className="py-3 px-4">Jenis</th>
                  <th className="py-3 px-4 text-right">Stok Saat Ini</th>
                  <th className="py-3 px-4 text-right">Diajukan</th>
                  <th className="py-3 px-4 text-right">Disetujui</th>
                  <th className="py-3 px-4 text-right">Dikembalikan</th>
                  <th className="py-3 px-4">Kondisi Kembali</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {selectedDetails.map((d) => {
                  const alatItem =
                    d.item_type === 'alat' ? db.alat.find((a) => a.id === d.item_id) : null;
                  const bahanItem =
                    d.item_type === 'bahan_kimia'
                      ? db.bahan_kimia.find((b) => b.id === d.item_id)
                      : null;
                  const currentStock = alatItem
                    ? `${alatItem.jumlah_tersedia} unit`
                    : bahanItem
                    ? `${bahanItem.stok_sisa} ${bahanItem.satuan}`
                    : '-';
                  const rawAvailable = alatItem
                    ? alatItem.jumlah_tersedia
                    : bahanItem
                    ? bahanItem.stok_sisa
                    : 0;
                  const editedQty = partialQuantities[d.id] ?? d.jumlah_diajukan;
                  const overStock = isPending && editedQty > rawAvailable;

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {d.nama_item_snapshot}
                        {d.catatan_kerusakan && (
                          <div className="text-[11px] font-normal text-red-700 mt-0.5">
                            Catatan: {d.catatan_kerusakan}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {d.item_type === 'alat' ? 'Alat Lab' : 'Bahan Kimia'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                        {currentStock}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                        {d.jumlah_diajukan}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {isPending && isKepalaLab ? (
                          <div className="inline-flex flex-col items-end">
                            <input
                              type="number"
                              aria-label={`Jumlah disetujui untuk ${d.nama_item_snapshot}`}
                              min={0}
                              max={d.jumlah_diajukan}
                              value={editedQty}
                              onChange={(e) =>
                                setPartialQuantities((prev) => ({
                                  ...prev,
                                  [d.id]: Math.max(
                                    0,
                                    Math.min(d.jumlah_diajukan, Number(e.target.value))
                                  ),
                                }))
                              }
                              className={`w-20 px-2 py-1 rounded border text-right font-mono ${
                                overStock
                                  ? 'border-red-400 bg-red-50 text-red-800'
                                  : 'border-slate-300'
                              }`}
                            />
                            {overStock && (
                              <span className="text-[10px] text-red-600 font-sans mt-0.5">
                                Stok Tidak Cukup
                              </span>
                            )}
                          </div>
                        ) : (
                          <span>{d.jumlah_disetujui ?? '-'}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {d.jumlah_dikembalikan ?? '-'}
                      </td>
                      <td className="py-3 px-4">
                        {d.kondisi_kembali ? (
                          <KondisiBadge kondisi={d.kondisi_kembali} />
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Aksi Persetujuan Kepala Lab */}
          {isPending && isKepalaLab && (
            <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-600">
                  Pilih tindakan persetujuan untuk pengajuan ini:
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => approvePengajuan(selectedPengajuan.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                  >
                    <Check className="w-4 h-4" />
                    Setujui Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => approvePengajuan(selectedPengajuan.id, partialQuantities)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      hasPartialEdit
                        ? 'bg-[#0F2744] hover:bg-[#1E3A5F] text-white border-[#0F2744]'
                        : 'bg-white hover:bg-slate-100 text-[#0F2744] border-slate-300'
                    }`}
                  >
                    Setujui Sebagian (Sesuai Input)
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRejectBox((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold"
                  >
                    <XCircle className="w-4 h-4" />
                    Tolak
                  </button>
                </div>
              </div>

              {showRejectBox && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    rejectPengajuan(selectedPengajuan.id, rejectReason);
                  }}
                  className="p-4 rounded-xl border border-red-200 bg-white space-y-3"
                >
                  <label
                    htmlFor="detail-reject-reason"
                    className="block text-xs font-bold text-red-800"
                  >
                    Alasan Penolakan (Wajib diisi) *
                  </label>
                  <textarea
                    id="detail-reject-reason"
                    required
                    rows={2}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Tuliskan alasan penolakan secara jelas..."
                    className="w-full px-3 py-2 rounded-lg border border-red-200 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRejectBox(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
                    >
                      Konfirmasi Tolak Pengajuan
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </section>

        {/* Form Inspeksi Pengembalian Kepala Lab */}
        {isRunning && isKepalaLab && showInspectionForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const list = selectedDetails.map(
                (d) =>
                  inspectionRows[d.id] ?? {
                    detail_id: d.id,
                    jumlah_dikembalikan: d.jumlah_disetujui ?? d.jumlah_diajukan,
                    kondisi_kembali: 'baik' as KondisiAlat,
                    jumlah_rusak: 0,
                    catatan_kerusakan: '',
                  }
              );
              const res = completePengajuanInspection(selectedPengajuan.id, list);
              if (res.ok) setShowInspectionForm(false);
            }}
            className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
          >
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Form Inspeksi Pengembalian Alat &amp; Bahan
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Periksa kondisi setiap alat yang dikembalikan. Jika ada alat berstatus Rusak Ringan /
                Rusak Berat, jumlah total inventaris otomatis berkurang sesuai jumlah unit rusak.
              </p>
            </div>

            <div className="space-y-3">
              {selectedDetails.map((d) => {
                const approvedQty = d.jumlah_disetujui ?? d.jumlah_diajukan;
                const row = inspectionRows[d.id] ?? {
                  detail_id: d.id,
                  jumlah_dikembalikan: d.item_type === 'alat' ? approvedQty : 0,
                  kondisi_kembali: 'baik' as KondisiAlat,
                  jumlah_rusak: 1,
                  catatan_kerusakan: '',
                };

                return (
                  <div
                    key={`insp-${d.id}`}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 grid grid-cols-1 md:grid-cols-12 gap-3 items-end text-xs"
                  >
                    <div className="md:col-span-4">
                      <div className="font-bold text-slate-900">{d.nama_item_snapshot}</div>
                      <div className="text-[11px] text-slate-500">
                        {d.item_type === 'alat' ? 'Alat Lab' : 'Bahan Habis Pakai'} · Disetujui:{' '}
                        {approvedQty}
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Jml Kembali
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={approvedQty}
                        value={row.jumlah_dikembalikan}
                        onChange={(e) =>
                          setInspectionRows((prev) => ({
                            ...prev,
                            [d.id]: {
                              ...row,
                              jumlah_dikembalikan: Math.max(
                                0,
                                Math.min(approvedQty, Number(e.target.value))
                              ),
                            },
                          }))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Kondisi Kembali
                      </label>
                      <select
                        value={row.kondisi_kembali}
                        onChange={(e) =>
                          setInspectionRows((prev) => ({
                            ...prev,
                            [d.id]: {
                              ...row,
                              kondisi_kembali: e.target.value as KondisiAlat,
                            },
                          }))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="baik">Baik</option>
                        <option value="rusak_ringan">Rusak Ringan</option>
                        <option value="rusak_berat">Rusak Berat</option>
                      </select>
                    </div>

                    {d.item_type === 'alat' && row.kondisi_kembali !== 'baik' && (
                      <div className="md:col-span-1">
                        <label className="block text-[11px] font-semibold text-red-700 mb-1">
                          Unit Rusak
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={Math.max(1, row.jumlah_dikembalikan)}
                          value={row.jumlah_rusak ?? 1}
                          onChange={(e) =>
                            setInspectionRows((prev) => ({
                              ...prev,
                              [d.id]: {
                                ...row,
                                jumlah_rusak: Math.max(1, Number(e.target.value)),
                              },
                            }))
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-red-300 bg-white font-mono"
                        />
                      </div>
                    )}

                    <div
                      className={
                        d.item_type === 'alat' && row.kondisi_kembali !== 'baik'
                          ? 'md:col-span-3'
                          : 'md:col-span-4'
                      }
                    >
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Catatan Kerusakan / Keterangan
                      </label>
                      <input
                        type="text"
                        value={row.catatan_kerusakan ?? ''}
                        onChange={(e) =>
                          setInspectionRows((prev) => ({
                            ...prev,
                            [d.id]: { ...row, catatan_kerusakan: e.target.value },
                          }))
                        }
                        placeholder="Opsional..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowInspectionForm(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                Simpan Inspeksi &amp; Selesaikan Praktikum
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  // ==============================================================
  // VIEW 2: FORM PENGAJUAN BARU (GURU IPA)
  // ==============================================================
  if (openPengajuanForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setOpenPengajuanForm(false)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#0F2744] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Daftar Pengajuan
          </button>
        </div>

        <form onSubmit={handleSubmitForm} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Kolom Kiri: Data Praktikum & Jadwal */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                Form Pengajuan Alat &amp; Bahan Praktikum
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih template praktikum untuk mengisi daftar alat otomatis atau isi secara bebas.
              </p>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {scheduleConflict.conflict && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-300 text-xs font-semibold text-red-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{scheduleConflict.message}</span>
              </div>
            )}

            <div>
              <label htmlFor="pgj-template" className="block text-xs font-semibold text-slate-700 mb-1">
                Template Modul Praktikum (Opsional)
              </label>
              <select
                id="pgj-template"
                value={selectedTemplateId}
                onChange={(e) => applyTemplate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
              >
                <option value="">-- Pengajuan Bebas (Pilih Alat Manual) --</option>
                {db.praktikum.map((prk) => (
                  <option key={prk.id} value={prk.id}>
                    [{prk.mapel.toUpperCase()} · Kelas {prk.kelas}] {prk.judul_praktikum}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label htmlFor="pgj-mapel" className="block font-semibold text-slate-700 mb-1">
                  Mata Pelajaran *
                </label>
                <select
                  id="pgj-mapel"
                  value={mapel}
                  onChange={(e) => {
                    const nextMapel = e.target.value as Mapel;
                    setMapel(nextMapel);
                    setLabId(LAB_BY_MAPEL[nextMapel]);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="fisika">Fisika</option>
                  <option value="kimia">Kimia</option>
                  <option value="biologi">Biologi</option>
                </select>
              </div>

              <div>
                <label htmlFor="pgj-kelas" className="block font-semibold text-slate-700 mb-1">
                  Kelas *
                </label>
                <input
                  id="pgj-kelas"
                  required
                  value={kelas}
                  onChange={(e) => setKelas(e.target.value)}
                  placeholder="Contoh: XI IPA 1"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label htmlFor="pgj-lab" className="block font-semibold text-slate-700 mb-1">
                  Laboratorium *
                </label>
                <select
                  id="pgj-lab"
                  value={labId}
                  onChange={(e) => setLabId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  {db.labs.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nama_lab}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="pgj-tanggal" className="block font-semibold text-slate-700 mb-1">
                  Tanggal Praktikum *
                </label>
                <input
                  id="pgj-tanggal"
                  type="date"
                  required
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label htmlFor="pgj-mulai" className="block font-semibold text-slate-700 mb-1">
                  Jam Mulai *
                </label>
                <input
                  id="pgj-mulai"
                  type="time"
                  required
                  value={jamMulai}
                  onChange={(e) => setJamMulai(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label htmlFor="pgj-selesai" className="block font-semibold text-slate-700 mb-1">
                  Jam Selesai *
                </label>
                <input
                  id="pgj-selesai"
                  type="time"
                  required
                  value={jamSelesai}
                  onChange={(e) => setJamSelesai(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>
            </div>

            <div className="text-xs">
              <label htmlFor="pgj-judul" className="block font-semibold text-slate-700 mb-1">
                Judul Praktikum *
              </label>
              <input
                id="pgj-judul"
                required
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder="Contoh: Titrasi Asam Basa HCl dengan NaOH"
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>

            <div className="text-xs">
              <label htmlFor="pgj-catatan" className="block font-semibold text-slate-700 mb-1">
                Catatan Guru untuk Laboran / Kepala Lab
              </label>
              <textarea
                id="pgj-catatan"
                rows={2}
                value={catatanGuru}
                onChange={(e) => setCatatanGuru(e.target.value)}
                placeholder="Tambahkan catatan kebutuhan meja, kelompok, atau persiapan bahan..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>

            {/* Daftar Item Terpilih */}
            <div className="pt-2 border-t border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">
                  Alat &amp; Bahan Dipilih ({cartItems.length})
                </h2>
                {stockIssues.length > 0 && (
                  <span className="text-xs font-bold text-red-600">Stok Tidak Cukup</span>
                )}
              </div>

              {cartItems.length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                  Belum ada item dipilih. Pilih dari katalog di sebelah kanan atau pilih template
                  praktikum.
                </div>
              ) : (
                <div className="space-y-2">
                  {cartItems.map((it) => {
                    const alatItem =
                      it.item_type === 'alat' ? db.alat.find((a) => a.id === it.item_id) : null;
                    const bahanItem =
                      it.item_type === 'bahan_kimia'
                        ? db.bahan_kimia.find((b) => b.id === it.item_id)
                        : null;
                    const nama = alatItem?.nama_alat ?? bahanItem?.nama_bahan ?? it.item_id;
                    const tersediaLabel = alatItem
                      ? `Tersedia: ${alatItem.jumlah_tersedia} unit`
                      : bahanItem
                      ? `Sisa: ${bahanItem.stok_sisa} ${bahanItem.satuan}`
                      : '-';
                    const issueMsg = stockIssueMap.get(`${it.item_type}:${it.item_id}`);

                    return (
                      <div
                        key={`${it.item_type}-${it.item_id}`}
                        className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                          issueMsg ? 'border-red-300 bg-red-50/70' : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{nama}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{tersediaLabel}</div>
                          {issueMsg && (
                            <div className="text-[11px] font-bold text-red-700 mt-0.5">
                              Stok Tidak Cukup
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="number"
                            aria-label={`Jumlah ${nama}`}
                            min={1}
                            value={it.jumlah}
                            onChange={(e) =>
                              handleUpdateCartQty(it.item_type, it.item_id, Number(e.target.value))
                            }
                            className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-right"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveCartItem(it.item_type, it.item_id)}
                            aria-label={`Hapus ${nama}`}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpenPengajuanForm(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={scheduleConflict.conflict || stockIssues.length > 0}
                className="px-5 py-2 rounded-lg bg-[#0F2744] hover:bg-[#1E3A5F] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold"
              >
                Kirim Pengajuan Praktikum
              </button>
            </div>
          </div>

          {/* Kolom Kanan: Katalog Pencarian Alat & Bahan */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Pilih dari Katalog Lab</h2>
              <p className="text-xs text-slate-500">
                Klik tambah untuk memasukkan alat atau bahan ke daftar pengajuan.
              </p>
            </div>

            <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setCatalogTab('alat')}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold ${
                  catalogTab === 'alat' ? 'bg-white text-[#0F2744] shadow-xs' : 'text-slate-600'
                }`}
              >
                Alat Lab ({db.alat.length})
              </button>
              <button
                type="button"
                onClick={() => setCatalogTab('bahan_kimia')}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold ${
                  catalogTab === 'bahan_kimia'
                    ? 'bg-white text-[#0F2744] shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                Bahan Kimia ({db.bahan_kimia.length})
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label="Cari katalog alat atau bahan"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Cari nama atau kode..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs"
              />
            </div>

            <div className="max-h-[440px] overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {catalogTab === 'alat'
                ? catalogAlat.map((a) => (
                    <div
                      key={a.id}
                      className="p-3 flex items-center justify-between gap-2 text-xs hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{a.nama_alat}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {a.kode_inventaris} · Tersedia: {a.jumlah_tersedia}/{a.jumlah_total}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddItemToCart('alat', a.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#0F2744]/10 hover:bg-[#0F2744] text-[#0F2744] hover:text-white text-xs font-semibold shrink-0 transition-colors"
                      >
                        + Tambah
                      </button>
                    </div>
                  ))
                : catalogBahan.map((b) => (
                    <div
                      key={b.id}
                      className="p-3 flex items-center justify-between gap-2 text-xs hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{b.nama_bahan}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {b.kode_bahan} · Sisa: {b.stok_sisa} {b.satuan}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddItemToCart('bahan_kimia', b.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#0F2744]/10 hover:bg-[#0F2744] text-[#0F2744] hover:text-white text-xs font-semibold shrink-0 transition-colors"
                      >
                        + Tambah
                      </button>
                    </div>
                  ))}
            </div>
          </div>
        </form>
      </div>
    );
  }

  // ==============================================================
  // VIEW 3: DAFTAR PENGAJUAN (TABEL & FILTER)
  // ==============================================================
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Pengajuan Alat &amp; Bahan Praktikum
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isSiswa
              ? 'Pantau status persetujuan dan peminjaman praktikum yang sedang berjalan.'
              : 'Kelola pengajuan praktikum guru, persetujuan Kepala Lab, hingga pengembalian alat.'}
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={openNewForm}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F2744] hover:bg-[#1E3A5F] text-white text-xs font-semibold whitespace-nowrap self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Ajukan Praktikum Baru
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="search-pgj" className="block text-[11px] font-semibold text-slate-600 mb-1">
            Cari Kode / Judul / Guru
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="search-pgj"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Contoh: PGJ-2026-005, Titrasi..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs"
            />
          </div>
        </div>

        <div>
          <label htmlFor="filter-status-pgj" className="block text-[11px] font-semibold text-slate-600 mb-1">
            Filter Status
          </label>
          <select
            id="filter-status-pgj"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | StatusPengajuan)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
          >
            <option value="all">Semua Status</option>
            <option value="menunggu">Menunggu</option>
            <option value="disetujui">Disetujui</option>
            <option value="disetujui_sebagian">Disetujui Sebagian</option>
            <option value="ditolak">Ditolak</option>
            <option value="selesai">Selesai</option>
            <option value="dibatalkan">Dibatalkan</option>
          </select>
        </div>

        <div>
          <label htmlFor="filter-mapel-pgj" className="block text-[11px] font-semibold text-slate-600 mb-1">
            Filter Mata Pelajaran
          </label>
          <select
            id="filter-mapel-pgj"
            value={filterMapel}
            onChange={(e) => setFilterMapel(e.target.value as 'all' | Mapel)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
          >
            <option value="all">Semua Mapel</option>
            <option value="fisika">Fisika</option>
            <option value="kimia">Kimia</option>
            <option value="biologi">Biologi</option>
          </select>
        </div>
      </div>

      {/* Tabel Daftar Pengajuan */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Kode</th>
                <th className="py-3 px-4">Guru</th>
                <th className="py-3 px-4">Judul Praktikum</th>
                <th className="py-3 px-4">Mapel &amp; Kelas</th>
                <th className="py-3 px-4">Tanggal &amp; Jam</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredPengajuan.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 px-4 text-center text-slate-500">
                    <ClipboardList className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                    Tidak ada data pengajuan yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredPengajuan.map((pgj) => {
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
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{pgj.judul_praktikum}</div>
                        <div className="text-[11px] text-slate-500">{lab?.nama_lab}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <MapelLabel mapel={pgj.mapel} />
                          <span className="text-slate-600 font-medium">{pgj.kelas}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 tabular-nums whitespace-nowrap">
                        <div className="text-slate-800">
                          {formatTanggalIndonesia(pgj.tanggal_praktikum)}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {pgj.jam_mulai}–{pgj.jam_selesai}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusPengajuanBadge
                          status={pgj.status}
                          pengembalianDiajukan={pgj.pengembalian_diajukan}
                        />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedPengajuanId(pgj.id)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-[#0F2744] hover:text-white hover:border-[#0F2744] text-slate-700 text-xs font-semibold transition-colors"
                        >
                          {isKepalaLab && pgj.status === 'menunggu'
                            ? 'Tinjau & Setujui'
                            : 'Lihat Detail'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
