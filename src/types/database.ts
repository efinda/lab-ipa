export type UserRole = 'kepala_lab' | 'guru_ipa' | 'siswa' | 'kepsek_tu';
export type Mapel = 'fisika' | 'kimia' | 'biologi';
export type KelasSMA = 'X' | 'XI' | 'XII';
export type KondisiAlat = 'baik' | 'rusak_ringan' | 'rusak_berat';
export type KategoriBahanKimia = 'asam' | 'basa' | 'garam' | 'organik' | 'b3' | 'umum';
export type StatusBahanKimia = 'aman' | 'stok_menipis' | 'kadaluarsa';
export type ItemType = 'alat' | 'bahan_kimia';
export type StatusPengajuan =
  | 'menunggu'
  | 'disetujui'
  | 'disetujui_sebagian'
  | 'ditolak'
  | 'selesai'
  | 'dibatalkan';
export type StatusJadwal = 'booked' | 'selesai' | 'dibatalkan';

export interface User {
  id: string;
  nama_lengkap: string;
  email: string;
  password_hash: string;
  role: UserRole;
  mapel: Mapel | null;
  kelas: string | null;
  foto_profil: string;
  is_active: boolean;
  created_at: string;
}

export interface Lab {
  id: string;
  nama_lab: string;
  lokasi: string;
  kapasitas: number;
  penanggung_jawab_id: string;
}

export interface KategoriAlat {
  id: string;
  nama_kategori: string;
}

export interface Alat {
  id: string;
  kode_inventaris: string;
  nama_alat: string;
  kategori_id: string;
  lab_id: string;
  merk: string;
  jumlah_total: number;
  jumlah_tersedia: number;
  jumlah_dipinjam: number;
  kondisi: KondisiAlat;
  lokasi_penyimpanan: string;
  foto_url: string;
  qr_code: string;
  tahun_pengadaan: number;
  harga: number;
  created_at: string;
}

export interface BahanKimia {
  id: string;
  kode_bahan: string;
  nama_bahan: string;
  kategori: KategoriBahanKimia;
  satuan: string;
  stok_awal: number;
  stok_sisa: number;
  tanggal_kadaluarsa: string;
  msds_url: string;
  lokasi_penyimpanan: string;
  status: StatusBahanKimia;
  lab_id: string;
}

export interface Praktikum {
  id: string;
  judul_praktikum: string;
  mapel: Mapel;
  kelas: KelasSMA;
  deskripsi: string;
  lks_url: string;
  dibuat_oleh: string;
  estimasi_waktu_menit: number;
}

export interface PraktikumAlat {
  id: string;
  praktikum_id: string;
  item_type: ItemType;
  item_id: string;
  jumlah_dibutuhkan: number;
}

export interface Pengajuan {
  id: string;
  kode_pengajuan: string;
  guru_id: string;
  praktikum_id: string | null;
  judul_praktikum: string;
  mapel: Mapel;
  kelas: string;
  lab_id: string;
  tanggal_praktikum: string;
  jam_mulai: string;
  jam_selesai: string;
  catatan_guru: string;
  status: StatusPengajuan;
  alasan_penolakan: string | null;
  disetujui_oleh: string | null;
  tanggal_disetujui: string | null;
  created_at: string;
  // Flag menandakan guru sudah klik "Selesaikan & Kembalikan" dan menunggu verifikasi kondisi oleh Kepala Lab
  pengembalian_diajukan?: boolean;
}

export interface PengajuanDetail {
  id: string;
  pengajuan_id: string;
  item_type: ItemType;
  item_id: string;
  nama_item_snapshot: string;
  jumlah_diajukan: number;
  jumlah_disetujui: number | null;
  jumlah_dikembalikan: number | null;
  kondisi_kembali: KondisiAlat | null;
  catatan_kerusakan: string | null;
}

export interface JadwalLab {
  id: string;
  lab_id: string;
  pengajuan_id: string | null;
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
  kegiatan: string;
  status: StatusJadwal;
}

export interface NilaiPraktikum {
  id: string;
  pengajuan_id: string;
  siswa_id: string;
  hadir: boolean;
  nilai: number | null;
  catatan: string | null;
}

export interface LabDatabaseState {
  users: User[];
  labs: Lab[];
  kategori_alat: KategoriAlat[];
  alat: Alat[];
  bahan_kimia: BahanKimia[];
  praktikum: Praktikum[];
  praktikum_alat: PraktikumAlat[];
  pengajuan: Pengajuan[];
  pengajuan_detail: PengajuanDetail[];
  jadwal_lab: JadwalLab[];
  nilai_praktikum: NilaiPraktikum[];
}
