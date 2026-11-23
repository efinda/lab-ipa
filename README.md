# SIM-LAB IPA SMA — Sistem Informasi Manajemen Laboratorium IPA

Aplikasi web manajemen Laboratorium IPA SMA (Fisika, Kimia, Biologi) yang responsif untuk laptop maupun perangkat seluler, menggunakan penyimpanan lokal browser (`localStorage`) sebagai simulasi basis data relasional 11 tabel agar seluruh alur kerja dapat langsung dicoba.

## Fitur Utama
1. **Login Multi-Peran (1-Klik Demo)**:
   - **Kepala Lab IPA (Admin)**: Akses penuh untuk menyetujui/menolak/menyetujui sebagian pengajuan, inspeksi pengembalian alat, CRUD inventaris alat & bahan kimia, serta laporan.
   - **Guru IPA (Fisika, Kimia, Biologi)**: Ajukan praktikum dari template atau bebas, validasi stok & jadwal bentrok real-time, selesaikan & kembalikan alat, serta input absensi & nilai praktikum.
   - **Siswa / Asisten Lab**: Melihat katalog inventaris, jadwal pemakaian lab, dan status peminjaman.
   - **Kepala Sekolah / TU**: Akses baca (read-only) untuk dashboard ringkasan, jadwal lab, dan cetak laporan berkop surat sekolah.
2. **Inventaris Alat & Bahan Kimia**: 56 alat (22 Fisika, 17 Kimia, 17 Biologi), 12 bahan kimia dengan deteksi otomatis `stok_menipis` (<10%) & `kadaluarsa` (<30 hari), generator label QR Code SVG, dan unduh MSDS.
3. **Alur Pengajuan Praktikum Lengkap**: Pengajuan Guru → Notifikasi & Persetujuan Kepala Lab (Penuh/Sebagian/Tolak) → Pemotongan stok & pembuatan jadwal lab otomatis → Pengembalian Guru → Inspeksi kerusakan Kepala Lab (pengembalian stok baik / pengurangan total jika rusak).
4. **Jadwal Pakai Lab**: Kalender bulanan interaktif berwarna per mata pelajaran (Fisika = Biru, Kimia = Oranye, Biologi = Hijau).
5. **Modul Praktikum & Penilaian**: 9 template praktikum dengan tombol *Gunakan untuk Pengajuan*, simulasi LKS, serta input absensi & nilai siswa.
6. **Laporan Otomatis Berkop Surat**: Laporan Inventaris Tahunan, Peminjaman Bulanan, Pengajuan Praktikum, dan Surat Usulan Pengadaan Alat Rusak (siap Export CSV dan Print/PDF).

## Petunjuk Instalasi & Menjalankan Secara Lokal

### 1. Prasyarat
- **Node.js** versi `18.x` atau lebih baru
- **npm** versi `9.x` atau lebih baru

### 2. Instalasi Dependensi
Jalankan perintah berikut di direktori proyek:
```bash
npm install
```

### 3. Menjalankan Server Pengembangan
```bash
npm run dev
```
Aplikasi akan berjalan di `http://localhost:3000`.

### 4. Menjalankan Pengujian Logika Bisnis
```bash
npx --yes tsx --test src/utils/labLogic.test.ts
```

### 5. Build untuk Produksi
```bash
npm run build
npm run preview
```

### 6. Catatan Reset Data Demo
Semua perubahan tersimpan di `localStorage` browser (`sim_lab_ipa_sma_db_v1`). Gunakan tombol **Reset Data Demo** di halaman login kapan saja untuk mengembalikan seluruh data contoh awal.
