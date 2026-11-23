import React, { useMemo, useState } from 'react';
import {
  Download,
  Edit3,
  FileText,
  FlaskConical,
  Package,
  Plus,
  Printer,
  QrCode,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useLab } from '../context/LabContext';
import type { Alat, BahanKimia, KategoriBahanKimia, KondisiAlat } from '../types/database';
import { formatRupiah, formatTanggalIndonesia } from '../utils/labLogic';
import { QrCodeSvg } from './QrCodeSvg';
import { KondisiBadge, StatusBahanBadge } from './StatusBadge';

type TabKey = 'alat' | 'bahan';

export function InventarisView() {
  const {
    db,
    currentUser,
    addAlat,
    updateAlat,
    deleteAlat,
    addBahanKimia,
    updateBahanKimia,
    deleteBahanKimia,
    notify,
  } = useLab();

  const canManage = currentUser?.role === 'kepala_lab';
  const [activeTab, setActiveTab] = useState<TabKey>('alat');

  // Filter Alat
  const [searchAlat, setSearchAlat] = useState('');
  const [filterKategori, setFilterKategori] = useState('all');
  const [filterKondisi, setFilterKondisi] = useState<'all' | KondisiAlat>('all');
  const [filterLabAlat, setFilterLabAlat] = useState('all');

  // Filter Bahan Kimia
  const [searchBahan, setSearchBahan] = useState('');
  const [filterStatusBahan, setFilterStatusBahan] = useState<'all' | BahanKimia['status']>('all');

  // Modals
  const [qrAlat, setQrAlat] = useState<Alat | null>(null);
  const [msdsBahan, setMsdsBahan] = useState<BahanKimia | null>(null);
  const [alatFormModal, setAlatFormModal] = useState<{ mode: 'add' | 'edit'; item?: Alat } | null>(null);
  const [bahanFormModal, setBahanFormModal] = useState<{ mode: 'add' | 'edit'; item?: BahanKimia } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'alat' | 'bahan'; id: string; name: string } | null>(null);

  // Alat form state
  const [fKode, setFKode] = useState('');
  const [fNama, setFNama] = useState('');
  const [fKatId, setFKatId] = useState(db.kategori_alat[0]?.id ?? '');
  const [fLabId, setFLabId] = useState(db.labs[0]?.id ?? 'lab-fisika');
  const [fMerk, setFMerk] = useState('');
  const [fTotal, setFTotal] = useState(10);
  const [fTersedia, setFTersedia] = useState(10);
  const [fKondisi, setFKondisi] = useState<KondisiAlat>('baik');
  const [fLokasi, setFLokasi] = useState('');
  const [fTahun, setFTahun] = useState(2025);
  const [fHarga, setFHarga] = useState(250000);

  // Bahan form state
  const [bKode, setBKode] = useState('');
  const [bNama, setBNama] = useState('');
  const [bKategori, setBKategori] = useState<KategoriBahanKimia>('asam');
  const [bSatuan, setBSatuan] = useState('mL');
  const [bStokAwal, setBStokAwal] = useState(1000);
  const [bStokSisa, setBStokSisa] = useState(1000);
  const [bExp, setBExp] = useState('2027-12-31');
  const [bLokasi, setBLokasi] = useState('');
  const [bLabId, setBLabId] = useState('lab-kimia');

  const filteredAlat = useMemo(() => {
    const q = searchAlat.trim().toLowerCase();
    return db.alat.filter((a) => {
      if (filterKategori !== 'all' && a.kategori_id !== filterKategori) return false;
      if (filterKondisi !== 'all' && a.kondisi !== filterKondisi) return false;
      if (filterLabAlat !== 'all' && a.lab_id !== filterLabAlat) return false;
      if (!q) return true;
      return (
        a.nama_alat.toLowerCase().includes(q) ||
        a.kode_inventaris.toLowerCase().includes(q) ||
        a.merk.toLowerCase().includes(q) ||
        a.lokasi_penyimpanan.toLowerCase().includes(q)
      );
    });
  }, [db.alat, searchAlat, filterKategori, filterKondisi, filterLabAlat]);

  const filteredBahan = useMemo(() => {
    const q = searchBahan.trim().toLowerCase();
    return db.bahan_kimia.filter((b) => {
      if (filterStatusBahan !== 'all' && b.status !== filterStatusBahan) return false;
      if (!q) return true;
      return (
        b.nama_bahan.toLowerCase().includes(q) ||
        b.kode_bahan.toLowerCase().includes(q) ||
        b.lokasi_penyimpanan.toLowerCase().includes(q)
      );
    });
  }, [db.bahan_kimia, searchBahan, filterStatusBahan]);

  const openAddAlat = () => {
    setFKode(`LAB-2026-${String(db.alat.length + 1).padStart(3, '0')}`);
    setFNama('');
    setFKatId(db.kategori_alat[0]?.id ?? '');
    setFLabId(db.labs[0]?.id ?? 'lab-fisika');
    setFMerk('Pudak Scientific');
    setFTotal(10);
    setFTersedia(10);
    setFKondisi('baik');
    setFLokasi('Lemari Utama A1');
    setFTahun(2026);
    setFHarga(250000);
    setAlatFormModal({ mode: 'add' });
  };

  const openEditAlat = (item: Alat) => {
    setFKode(item.kode_inventaris);
    setFNama(item.nama_alat);
    setFKatId(item.kategori_id);
    setFLabId(item.lab_id);
    setFMerk(item.merk);
    setFTotal(item.jumlah_total);
    setFTersedia(item.jumlah_tersedia);
    setFKondisi(item.kondisi);
    setFLokasi(item.lokasi_penyimpanan);
    setFTahun(item.tahun_pengadaan);
    setFHarga(item.harga);
    setAlatFormModal({ mode: 'edit', item });
  };

  const handleSaveAlat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fNama.trim() || !fKode.trim()) return;
    const fotoUrl =
      fLabId === 'lab-fisika'
        ? '/src/assets/images/lab_fisika_equip_1795437857033.jpg'
        : fLabId === 'lab-kimia'
        ? '/src/assets/images/lab_kimia_equip_1795437857340.jpg'
        : '/src/assets/images/lab_biologi_equip_1795437856740.jpg';

    if (alatFormModal?.mode === 'edit' && alatFormModal.item) {
      const dipinjam = alatFormModal.item.jumlah_dipinjam;
      const clampedTotal = Math.max(dipinjam, fTotal);
      const clampedTersedia = Math.max(0, Math.min(clampedTotal - dipinjam, fTersedia));
      updateAlat(alatFormModal.item.id, {
        kode_inventaris: fKode.trim(),
        nama_alat: fNama.trim(),
        kategori_id: fKatId,
        lab_id: fLabId,
        merk: fMerk.trim(),
        jumlah_total: clampedTotal,
        jumlah_tersedia: clampedTersedia,
        kondisi: fKondisi,
        lokasi_penyimpanan: fLokasi.trim(),
        tahun_pengadaan: fTahun,
        harga: fHarga,
        foto_url: fotoUrl,
      });
    } else {
      addAlat({
        kode_inventaris: fKode.trim(),
        nama_alat: fNama.trim(),
        kategori_id: fKatId,
        lab_id: fLabId,
        merk: fMerk.trim(),
        jumlah_total: fTotal,
        jumlah_tersedia: Math.min(fTotal, fTersedia),
        jumlah_dipinjam: 0,
        kondisi: fKondisi,
        lokasi_penyimpanan: fLokasi.trim(),
        foto_url: fotoUrl,
        tahun_pengadaan: fTahun,
        harga: fHarga,
      });
    }
    setAlatFormModal(null);
  };

  const openAddBahan = () => {
    setBKode(`BHK-${String(db.bahan_kimia.length + 1).padStart(3, '0')}`);
    setBNama('');
    setBKategori('asam');
    setBSatuan('mL');
    setBStokAwal(1000);
    setBStokSisa(1000);
    setBExp('2027-12-31');
    setBLokasi('Lemari Reagen K-1');
    setBLabId('lab-kimia');
    setBahanFormModal({ mode: 'add' });
  };

  const openEditBahan = (item: BahanKimia) => {
    setBKode(item.kode_bahan);
    setBNama(item.nama_bahan);
    setBKategori(item.kategori);
    setBSatuan(item.satuan);
    setBStokAwal(item.stok_awal);
    setBStokSisa(item.stok_sisa);
    setBExp(item.tanggal_kadaluarsa);
    setBLokasi(item.lokasi_penyimpanan);
    setBLabId(item.lab_id);
    setBahanFormModal({ mode: 'edit', item });
  };

  const handleSaveBahan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bNama.trim() || !bKode.trim()) return;
    if (bahanFormModal?.mode === 'edit' && bahanFormModal.item) {
      updateBahanKimia(bahanFormModal.item.id, {
        kode_bahan: bKode.trim(),
        nama_bahan: bNama.trim(),
        kategori: bKategori,
        satuan: bSatuan.trim(),
        stok_awal: bStokAwal,
        stok_sisa: bStokSisa,
        tanggal_kadaluarsa: bExp,
        lokasi_penyimpanan: bLokasi.trim(),
        lab_id: bLabId,
        msds_url: `https://simlab.sman5garut.sch.id/msds/${bKode.trim().toLowerCase()}.pdf`,
      });
    } else {
      addBahanKimia({
        kode_bahan: bKode.trim(),
        nama_bahan: bNama.trim(),
        kategori: bKategori,
        satuan: bSatuan.trim(),
        stok_awal: bStokAwal,
        stok_sisa: bStokSisa,
        tanggal_kadaluarsa: bExp,
        lokasi_penyimpanan: bLokasi.trim(),
        lab_id: bLabId,
        msds_url: `https://simlab.sman5garut.sch.id/msds/${bKode.trim().toLowerCase()}.pdf`,
      });
    }
    setBahanFormModal(null);
  };

  const handleDownloadMsdsFile = (bahan: BahanKimia) => {
    const content = [
      'LEMBAR DATA KESELAMATAN BAHAN (MSDS) — SIM-LAB IPA SMA',
      '======================================================',
      `Kode Bahan          : ${bahan.kode_bahan}`,
      `Nama Bahan          : ${bahan.nama_bahan}`,
      `Kategori            : ${bahan.kategori.toUpperCase()}`,
      `Lokasi Penyimpanan  : ${bahan.lokasi_penyimpanan}`,
      `Tanggal Kadaluarsa  : ${formatTanggalIndonesia(bahan.tanggal_kadaluarsa)}`,
      '',
      '1. IDENTIFIKASI BAHAYA & PENANGANAN:',
      '- Wajib menggunakan jas laboratorium, sarung tangan nitril, dan kacamata pelindung.',
      '- Hindari kontak langsung dengan kulit, mata, dan saluran pernapasan.',
      '- Gunakan di dalam lemari asam apabila bersifat korosif/asam pekat/B3.',
      '',
      '2. PERTOLONGAN PERTAMA (P3K):',
      '- Terkena mata/kulit: Bilas dengan air mengalir selama minimal 15 menit.',
      '- Tertelan: Jangan memicu muntah, segera bawa ke UKS / fasilitas medis terdekat.',
      '',
      '3. PENYIMPANAN & PEMBUANGAN LIMBAH:',
      '- Simpan tertutup rapat sesuai kelompok kompatibilitas bahan kimia.',
      '- Limbah reaksi dinetralkan atau dikumpulkan pada jerigen limbah B3 berlabel.',
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MSDS-${bahan.kode_bahan}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    notify('success', `Dokumen MSDS ${bahan.kode_bahan} berhasil diunduh.`);
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Inventaris Alat &amp; Bahan Kimia
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Katalog aset Laboratorium Fisika, Kimia, dan Biologi beserta status ketersediaan real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 bg-slate-200/70 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('alat')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'alat'
                  ? 'bg-white text-[#0F2744] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Alat Lab ({db.alat.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bahan')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'bahan'
                  ? 'bg-white text-[#0F2744] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              Bahan Kimia ({db.bahan_kimia.length})
            </button>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={activeTab === 'alat' ? openAddAlat : openAddBahan}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F2744] hover:bg-[#1E3A5F] text-white text-xs font-semibold transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              {activeTab === 'alat' ? 'Tambah Alat' : 'Tambah Bahan'}
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: INVENTARIS ALAT */}
      {activeTab === 'alat' && (
        <div className="space-y-4">
          {/* Bar Pencarian & Filter */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label htmlFor="search-alat" className="block text-[11px] font-semibold text-slate-600 mb-1">
                Cari Alat / Kode / Merk
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="search-alat"
                  type="text"
                  value={searchAlat}
                  onChange={(e) => setSearchAlat(e.target.value)}
                  placeholder="Contoh: Mikroskop, FIS-2024..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F2744]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="filter-lab-alat" className="block text-[11px] font-semibold text-slate-600 mb-1">
                Laboratorium
              </label>
              <select
                id="filter-lab-alat"
                value={filterLabAlat}
                onChange={(e) => setFilterLabAlat(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2744]"
              >
                <option value="all">Semua Laboratorium</option>
                {db.labs.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nama_lab}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-kat-alat" className="block text-[11px] font-semibold text-slate-600 mb-1">
                Kategori Alat
              </label>
              <select
                id="filter-kat-alat"
                value={filterKategori}
                onChange={(e) => setFilterKategori(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2744]"
              >
                <option value="all">Semua Kategori</option>
                {db.kategori_alat.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama_kategori}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-kondisi-alat" className="block text-[11px] font-semibold text-slate-600 mb-1">
                Kondisi Alat
              </label>
              <select
                id="filter-kondisi-alat"
                value={filterKondisi}
                onChange={(e) => setFilterKondisi(e.target.value as 'all' | KondisiAlat)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2744]"
              >
                <option value="all">Semua Kondisi</option>
                <option value="baik">Baik</option>
                <option value="rusak_ringan">Rusak Ringan</option>
                <option value="rusak_berat">Rusak Berat</option>
              </select>
            </div>
          </div>

          {/* Tabel Alat */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Foto</th>
                    <th className="py-3 px-4">Kode Inventaris</th>
                    <th className="py-3 px-4">Nama Alat &amp; Merk</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4 text-right">Tersedia / Total</th>
                    <th className="py-3 px-4">Kondisi</th>
                    <th className="py-3 px-4">Lokasi</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredAlat.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 px-4 text-center text-slate-500">
                        Tidak ditemukan alat yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredAlat.map((alat) => {
                      const kat = db.kategori_alat.find((k) => k.id === alat.kategori_id);
                      const lab = db.labs.find((l) => l.id === alat.lab_id);
                      return (
                        <tr key={alat.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-4">
                            <img
                              src={alat.foto_url}
                              alt={alat.nama_alat}
                              referrerPolicy="no-referrer"
                              className="w-11 h-9 rounded-md object-cover border border-slate-200 bg-slate-100"
                            />
                          </td>
                          <td className="py-2.5 px-4 font-mono font-semibold text-[#0F2744] whitespace-nowrap">
                            {alat.kode_inventaris}
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-slate-900">{alat.nama_alat}</div>
                            <div className="text-[11px] text-slate-500">
                              {alat.merk} · Thn {alat.tahun_pengadaan} · {formatRupiah(alat.harga)}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-slate-600">
                            <div>{kat?.nama_kategori ?? '-'}</div>
                            <div className="text-[11px] text-slate-400">{lab?.nama_lab}</div>
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                            <span className="font-bold text-slate-900">{alat.jumlah_tersedia}</span>
                            <span className="text-slate-400"> / {alat.jumlah_total}</span>
                            {alat.jumlah_dipinjam > 0 && (
                              <div className="text-[11px] text-sky-700">
                                ({alat.jumlah_dipinjam} dipinjam)
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <KondisiBadge kondisi={alat.kondisi} />
                          </td>
                          <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">
                            {alat.lokasi_penyimpanan}
                          </td>
                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setQrAlat(alat)}
                                title={`Lihat QR Code ${alat.kode_inventaris}`}
                                aria-label={`Lihat QR Code ${alat.nama_alat}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                QR
                              </button>
                              {canManage && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openEditAlat(alat)}
                                    aria-label={`Edit ${alat.nama_alat}`}
                                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDeleteConfirm({ type: 'alat', id: alat.id, name: alat.nama_alat })
                                    }
                                    aria-label={`Hapus ${alat.nama_alat}`}
                                    className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-700"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
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
          </div>
        </div>
      )}

      {/* TAB 2: BAHAN KIMIA */}
      {activeTab === 'bahan' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="search-bahan" className="block text-[11px] font-semibold text-slate-600 mb-1">
                Cari Nama Bahan / Kode / Lokasi
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="search-bahan"
                  type="text"
                  value={searchBahan}
                  onChange={(e) => setSearchBahan(e.target.value)}
                  placeholder="Contoh: HCl, NaOH, Biuret..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F2744]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="filter-status-bahan" className="block text-[11px] font-semibold text-slate-600 mb-1">
                Filter Status Keamanan &amp; Stok
              </label>
              <select
                id="filter-status-bahan"
                value={filterStatusBahan}
                onChange={(e) =>
                  setFilterStatusBahan(e.target.value as 'all' | BahanKimia['status'])
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2744]"
              >
                <option value="all">Semua Status</option>
                <option value="aman">Aman</option>
                <option value="stok_menipis">Stok Menipis (&lt; 10%)</option>
                <option value="kadaluarsa">Kadaluarsa (&lt; 30 hari)</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[820px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Kode</th>
                    <th className="py-3 px-4">Nama Bahan Kimia</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4 text-right">Stok Sisa</th>
                    <th className="py-3 px-4">Satuan</th>
                    <th className="py-3 px-4">Tanggal Kadaluarsa</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">MSDS &amp; Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredBahan.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 px-4 text-center text-slate-500">
                        Tidak ditemukan bahan kimia sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredBahan.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono font-semibold text-[#0F2744] whitespace-nowrap">
                          {b.kode_bahan}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{b.nama_bahan}</div>
                          <div className="text-[11px] text-slate-500">{b.lokasi_penyimpanan}</div>
                        </td>
                        <td className="py-3 px-4 uppercase text-[11px] font-semibold text-slate-600">
                          {b.kategori}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                          <span className="font-bold text-slate-900">{b.stok_sisa}</span>
                          <span className="text-slate-400"> / {b.stok_awal}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{b.satuan}</td>
                        <td className="py-3 px-4 text-slate-700 tabular-nums whitespace-nowrap">
                          {formatTanggalIndonesia(b.tanggal_kadaluarsa)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <StatusBahanBadge status={b.status} />
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setMsdsBahan(b)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              MSDS
                            </button>
                            {canManage && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEditBahan(b)}
                                  aria-label={`Edit ${b.nama_bahan}`}
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteConfirm({ type: 'bahan', id: b.id, name: b.nama_bahan })
                                  }
                                  aria-label={`Hapus ${b.nama_bahan}`}
                                  className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-700"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal QR Code Alat */}
      {qrAlat && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Label QR Code Inventaris</h3>
              <button
                type="button"
                onClick={() => setQrAlat(null)}
                aria-label="Tutup modal QR Code"
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center text-center space-y-3">
              <QrCodeSvg value={qrAlat.qr_code} size={172} />
              <div>
                <div className="font-mono text-sm font-bold text-[#0F2744]">
                  {qrAlat.kode_inventaris}
                </div>
                <div className="text-xs font-semibold text-slate-900 mt-0.5">
                  {qrAlat.nama_alat}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {qrAlat.lokasi_penyimpanan} · {qrAlat.merk}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Label
              </button>
              <button
                type="button"
                onClick={() => setQrAlat(null)}
                className="px-4 py-2 rounded-lg bg-[#0F2744] text-white text-xs font-semibold hover:bg-[#1E3A5F]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal MSDS Bahan Kimia */}
      {msdsBahan && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Lembar Data Keselamatan Bahan (MSDS)
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {msdsBahan.kode_bahan} · {msdsBahan.nama_bahan}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMsdsBahan(null)}
                aria-label="Tutup modal MSDS"
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 space-y-2.5">
              <div>
                <span className="font-semibold text-slate-900">Kategori Bahaya:</span>{' '}
                <span className="uppercase">{msdsBahan.kategori}</span> · Lokasi:{' '}
                {msdsBahan.lokasi_penyimpanan}
              </div>
              <div>
                <span className="font-semibold text-slate-900">APD Wajib:</span> Jas laboratorium,
                sarung tangan nitril, kacamata pelindung (goggles).
              </div>
              <div>
                <span className="font-semibold text-slate-900">Penanganan Tumpahan &amp; P3K:</span>{' '}
                Bilas area terkena dengan air mengalir minimal 15 menit. Netralkan tumpahan sesuai
                SOP Laboratorium Kimia SMA.
              </div>
              <div>
                <span className="font-semibold text-slate-900">Masa Berlaku:</span>{' '}
                {formatTanggalIndonesia(msdsBahan.tanggal_kadaluarsa)}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => handleDownloadMsdsFile(msdsBahan)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F2744] hover:bg-[#1E3A5F] text-white text-xs font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                Download MSDS
              </button>
              <button
                type="button"
                onClick={() => setMsdsBahan(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah/Edit Alat */}
      {alatFormModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveAlat}
            className="bg-white border border-slate-200 rounded-xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {alatFormModal.mode === 'add' ? 'Tambah Alat Baru' : 'Edit Data Alat'}
              </h3>
              <button
                type="button"
                onClick={() => setAlatFormModal(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label htmlFor="alat-kode" className="block font-semibold text-slate-700 mb-1">
                  Kode Inventaris *
                </label>
                <input
                  id="alat-kode"
                  required
                  value={fKode}
                  onChange={(e) => setFKode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label htmlFor="alat-nama" className="block font-semibold text-slate-700 mb-1">
                  Nama Alat *
                </label>
                <input
                  id="alat-nama"
                  required
                  value={fNama}
                  onChange={(e) => setFNama(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label htmlFor="alat-lab" className="block font-semibold text-slate-700 mb-1">
                  Laboratorium
                </label>
                <select
                  id="alat-lab"
                  value={fLabId}
                  onChange={(e) => setFLabId(e.target.value)}
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
                <label htmlFor="alat-kat" className="block font-semibold text-slate-700 mb-1">
                  Kategori
                </label>
                <select
                  id="alat-kat"
                  value={fKatId}
                  onChange={(e) => setFKatId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  {db.kategori_alat.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama_kategori}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="alat-merk" className="block font-semibold text-slate-700 mb-1">
                  Merk / Produsen
                </label>
                <input
                  id="alat-merk"
                  value={fMerk}
                  onChange={(e) => setFMerk(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label htmlFor="alat-lokasi" className="block font-semibold text-slate-700 mb-1">
                  Lokasi Penyimpanan
                </label>
                <input
                  id="alat-lokasi"
                  required
                  value={fLokasi}
                  onChange={(e) => setFLokasi(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label htmlFor="alat-total" className="block font-semibold text-slate-700 mb-1">
                  Jumlah Total
                </label>
                <input
                  id="alat-total"
                  type="number"
                  min={1}
                  value={fTotal}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setFTotal(v);
                    if (alatFormModal.mode === 'add') setFTersedia(v);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label htmlFor="alat-tersedia" className="block font-semibold text-slate-700 mb-1">
                  Jumlah Tersedia
                </label>
                <input
                  id="alat-tersedia"
                  type="number"
                  min={0}
                  max={fTotal}
                  value={fTersedia}
                  onChange={(e) => setFTersedia(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label htmlFor="alat-kondisi" className="block font-semibold text-slate-700 mb-1">
                  Kondisi
                </label>
                <select
                  id="alat-kondisi"
                  value={fKondisi}
                  onChange={(e) => setFKondisi(e.target.value as KondisiAlat)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="baik">Baik</option>
                  <option value="rusak_ringan">Rusak Ringan</option>
                  <option value="rusak_berat">Rusak Berat</option>
                </select>
              </div>
              <div>
                <label htmlFor="alat-tahun" className="block font-semibold text-slate-700 mb-1">
                  Tahun Pengadaan &amp; Harga (Rp)
                </label>
                <div className="flex gap-2">
                  <input
                    id="alat-tahun"
                    type="number"
                    value={fTahun}
                    onChange={(e) => setFTahun(Number(e.target.value))}
                    className="w-24 px-2 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                  <input
                    aria-label="Harga satuan"
                    type="number"
                    min={0}
                    step={1000}
                    value={fHarga}
                    onChange={(e) => setFHarga(Number(e.target.value))}
                    className="flex-1 px-2 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAlatFormModal(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-white"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#0F2744] hover:bg-[#1E3A5F] text-white text-xs font-semibold"
              >
                Simpan Alat
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Tambah/Edit Bahan Kimia */}
      {bahanFormModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveBahan}
            className="bg-white border border-slate-200 rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {bahanFormModal.mode === 'add' ? 'Tambah Bahan Kimia' : 'Edit Bahan Kimia'}
              </h3>
              <button
                type="button"
                onClick={() => setBahanFormModal(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label htmlFor="bhn-kode" className="block font-semibold text-slate-700 mb-1">
                  Kode Bahan *
                </label>
                <input
                  id="bhn-kode"
                  required
                  value={bKode}
                  onChange={(e) => setBKode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label htmlFor="bhn-nama" className="block font-semibold text-slate-700 mb-1">
                  Nama Bahan Kimia *
                </label>
                <input
                  id="bhn-nama"
                  required
                  value={bNama}
                  onChange={(e) => setBNama(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label htmlFor="bhn-kat" className="block font-semibold text-slate-700 mb-1">
                  Kategori
                </label>
                <select
                  id="bhn-kat"
                  value={bKategori}
                  onChange={(e) => setBKategori(e.target.value as KategoriBahanKimia)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="asam">Asam</option>
                  <option value="basa">Basa</option>
                  <option value="garam">Garam</option>
                  <option value="organik">Organik</option>
                  <option value="b3">B3 (Berbahaya &amp; Beracun)</option>
                  <option value="umum">Umum</option>
                </select>
              </div>
              <div>
                <label htmlFor="bhn-satuan" className="block font-semibold text-slate-700 mb-1">
                  Satuan (mL / gram)
                </label>
                <input
                  id="bhn-satuan"
                  required
                  value={bSatuan}
                  onChange={(e) => setBSatuan(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label htmlFor="bhn-awal" className="block font-semibold text-slate-700 mb-1">
                  Stok Awal
                </label>
                <input
                  id="bhn-awal"
                  type="number"
                  min={1}
                  value={bStokAwal}
                  onChange={(e) => setBStokAwal(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label htmlFor="bhn-sisa" className="block font-semibold text-slate-700 mb-1">
                  Stok Sisa
                </label>
                <input
                  id="bhn-sisa"
                  type="number"
                  min={0}
                  value={bStokSisa}
                  onChange={(e) => setBStokSisa(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label htmlFor="bhn-exp" className="block font-semibold text-slate-700 mb-1">
                  Tanggal Kadaluarsa
                </label>
                <input
                  id="bhn-exp"
                  type="date"
                  required
                  value={bExp}
                  onChange={(e) => setBExp(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label htmlFor="bhn-lokasi" className="block font-semibold text-slate-700 mb-1">
                  Lokasi Penyimpanan
                </label>
                <input
                  id="bhn-lokasi"
                  required
                  value={bLokasi}
                  onChange={(e) => setBLokasi(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBahanFormModal(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-white"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#0F2744] hover:bg-[#1E3A5F] text-white text-xs font-semibold"
              >
                Simpan Bahan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Konfirmasi Hapus */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Hapus Data Inventaris</h3>
            <p className="text-xs text-slate-600">
              Apakah Anda yakin ingin menghapus <strong>{deleteConfirm.name}</strong> dari daftar
              inventaris?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirm.type === 'alat') deleteAlat(deleteConfirm.id);
                  else deleteBahanKimia(deleteConfirm.id);
                  setDeleteConfirm(null);
                }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
