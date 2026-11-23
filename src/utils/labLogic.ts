import type {
  Alat,
  BahanKimia,
  JadwalLab,
  KondisiAlat,
  LabDatabaseState,
  Mapel,
  Pengajuan,
  PengajuanDetail,
  StatusBahanKimia,
  StatusPengajuan,
} from '../types/database';

export function getTodayIso(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function daysUntilDate(targetDateIso: string, referenceDateIso: string = getTodayIso()): number {
  const target = new Date(`${targetDateIso}T00:00:00`);
  const ref = new Date(`${referenceDateIso}T00:00:00`);
  const diffMs = target.getTime() - ref.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Aturan bisnis Bahan Kimia:
 * - jika tanggal_kadaluarsa < 30 hari dari referensi -> 'kadaluarsa' (merah)
 * - jika stok_sisa < 10% dari stok_awal -> 'stok_menipis' (kuning)
 * - selain itu -> 'aman' (hijau)
 */
export function computeChemicalStatus(
  stokAwal: number,
  stokSisa: number,
  tanggalKadaluarsa: string,
  referenceDateIso: string = getTodayIso()
): StatusBahanKimia {
  const daysLeft = daysUntilDate(tanggalKadaluarsa, referenceDateIso);
  if (daysLeft < 30) {
    return 'kadaluarsa';
  }
  if (stokAwal > 0 && stokSisa < stokAwal * 0.1) {
    return 'stok_menipis';
  }
  return 'aman';
}

export interface ConflictCheckResult {
  conflict: boolean;
  conflictingSchedule?: JadwalLab;
  message?: string;
}

/**
 * Cek jadwal bentrok pada lab, tanggal, dan rentang jam yang tumpang tindih
 * terhadap jadwal berstatus 'booked'.
 */
export function checkScheduleConflict(
  jadwalList: JadwalLab[],
  labId: string,
  tanggal: string,
  jamMulai: string,
  jamSelesai: string,
  excludePengajuanId?: string | null
): ConflictCheckResult {
  if (!labId || !tanggal || !jamMulai || !jamSelesai) {
    return { conflict: false };
  }
  if (jamMulai >= jamSelesai) {
    return {
      conflict: true,
      message: 'Jam selesai harus lebih besar dari jam mulai.',
    };
  }

  const found = jadwalList.find((j) => {
    if (j.status !== 'booked') return false;
    if (j.lab_id !== labId) return false;
    if (j.tanggal !== tanggal) return false;
    if (excludePengajuanId && j.pengajuan_id === excludePengajuanId) return false;
    return jamMulai < j.jam_selesai && jamSelesai > j.jam_mulai;
  });

  if (found) {
    return {
      conflict: true,
      conflictingSchedule: found,
      message: `Jadwal Bentrok dengan "${found.kegiatan}" (${found.jam_mulai}–${found.jam_selesai}).`,
    };
  }

  return { conflict: false };
}

export interface RequestedItemInput {
  item_type: 'alat' | 'bahan_kimia';
  item_id: string;
  jumlah: number;
}

export interface StockIssue {
  item_type: 'alat' | 'bahan_kimia';
  item_id: string;
  nama: string;
  diminta: number;
  tersedia: number;
  message: string;
}

export function validateItemStock(
  items: RequestedItemInput[],
  alatList: Alat[],
  bahanList: BahanKimia[]
): StockIssue[] {
  const issues: StockIssue[] = [];
  for (const item of items) {
    if (item.jumlah <= 0) {
      issues.push({
        item_type: item.item_type,
        item_id: item.item_id,
        nama: item.item_id,
        diminta: item.jumlah,
        tersedia: 0,
        message: 'Jumlah harus lebih dari 0.',
      });
      continue;
    }

    if (item.item_type === 'alat') {
      const alat = alatList.find((a) => a.id === item.item_id);
      if (!alat) continue;
      if (item.jumlah > alat.jumlah_tersedia) {
        issues.push({
          item_type: 'alat',
          item_id: alat.id,
          nama: alat.nama_alat,
          diminta: item.jumlah,
          tersedia: alat.jumlah_tersedia,
          message: `Stok Tidak Cukup (${alat.nama_alat}: tersedia ${alat.jumlah_tersedia}, diajukan ${item.jumlah}).`,
        });
      }
    } else {
      const bahan = bahanList.find((b) => b.id === item.item_id);
      if (!bahan) continue;
      if (item.jumlah > bahan.stok_sisa) {
        issues.push({
          item_type: 'bahan_kimia',
          item_id: bahan.id,
          nama: bahan.nama_bahan,
          diminta: item.jumlah,
          tersedia: bahan.stok_sisa,
          message: `Stok Tidak Cukup (${bahan.nama_bahan}: sisa ${bahan.stok_sisa} ${bahan.satuan}, diajukan ${item.jumlah} ${bahan.satuan}).`,
        });
      }
    }
  }
  return issues;
}

export interface CreatePengajuanPayload {
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
  items: RequestedItemInput[];
}

export interface TransitionResult {
  ok: boolean;
  error?: string;
  state: LabDatabaseState;
  createdId?: string;
}

export function generateNextPengajuanCode(existing: Pengajuan[], year: number = 2026): string {
  let maxNum = 0;
  const prefix = `PGJ-${year}-`;
  for (const p of existing) {
    if (p.kode_pengajuan.startsWith(prefix)) {
      const num = Number.parseInt(p.kode_pengajuan.slice(prefix.length), 10);
      if (!Number.isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
}

export function createPengajuanState(
  state: LabDatabaseState,
  payload: CreatePengajuanPayload,
  nowIso: string = new Date().toISOString()
): TransitionResult {
  if (!payload.judul_praktikum.trim()) {
    return { ok: false, error: 'Judul praktikum wajib diisi.', state };
  }
  if (!payload.items.length) {
    return { ok: false, error: 'Pilih minimal 1 alat atau bahan kimia.', state };
  }

  const stockIssues = validateItemStock(payload.items, state.alat, state.bahan_kimia);
  if (stockIssues.length > 0) {
    return { ok: false, error: stockIssues[0].message, state };
  }

  const conflictCheck = checkScheduleConflict(
    state.jadwal_lab,
    payload.lab_id,
    payload.tanggal_praktikum,
    payload.jam_mulai,
    payload.jam_selesai
  );
  if (conflictCheck.conflict) {
    return { ok: false, error: conflictCheck.message || 'Jadwal Bentrok', state };
  }

  const pengajuanId = `pgj-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const kode = generateNextPengajuanCode(state.pengajuan, Number.parseInt(payload.tanggal_praktikum.slice(0, 4), 10) || 2026);

  const newPengajuan: Pengajuan = {
    id: pengajuanId,
    kode_pengajuan: kode,
    guru_id: payload.guru_id,
    praktikum_id: payload.praktikum_id,
    judul_praktikum: payload.judul_praktikum.trim(),
    mapel: payload.mapel,
    kelas: payload.kelas,
    lab_id: payload.lab_id,
    tanggal_praktikum: payload.tanggal_praktikum,
    jam_mulai: payload.jam_mulai,
    jam_selesai: payload.jam_selesai,
    catatan_guru: payload.catatan_guru.trim(),
    status: 'menunggu',
    alasan_penolakan: null,
    disetujui_oleh: null,
    tanggal_disetujui: null,
    created_at: nowIso,
    pengembalian_diajukan: false,
  };

  const newDetails: PengajuanDetail[] = payload.items.map((item, idx) => {
    let namaSnapshot = item.item_id;
    if (item.item_type === 'alat') {
      const a = state.alat.find((x) => x.id === item.item_id);
      if (a) namaSnapshot = a.nama_alat;
    } else {
      const b = state.bahan_kimia.find((x) => x.id === item.item_id);
      if (b) namaSnapshot = b.nama_bahan;
    }
    return {
      id: `pgd-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
      pengajuan_id: pengajuanId,
      item_type: item.item_type,
      item_id: item.item_id,
      nama_item_snapshot: namaSnapshot,
      jumlah_diajukan: item.jumlah,
      jumlah_disetujui: null,
      jumlah_dikembalikan: null,
      kondisi_kembali: null,
      catatan_kerusakan: null,
    };
  });

  return {
    ok: true,
    createdId: pengajuanId,
    state: {
      ...state,
      pengajuan: [newPengajuan, ...state.pengajuan],
      pengajuan_detail: [...newDetails, ...state.pengajuan_detail],
    },
  };
}

/**
 * Setujui Semua atau Setujui Sebagian:
 * - Memvalidasi jadwal bentrok & ketersediaan stok sesuai jumlah_disetujui.
 * - Mengurangi jumlah_tersedia & menambah jumlah_dipinjam untuk alat.
 * - Mengurangi stok_sisa & memperbarui status untuk bahan_kimia.
 * - Otomatis membuat entri di jadwal_lab dengan status 'booked'.
 */
export function approvePengajuanState(
  state: LabDatabaseState,
  pengajuanId: string,
  approverId: string,
  approvedQuantitiesByDetailId?: Record<string, number>,
  referenceDateIso: string = getTodayIso(),
  nowIso: string = new Date().toISOString()
): TransitionResult {
  const target = state.pengajuan.find((p) => p.id === pengajuanId);
  if (!target) {
    return { ok: false, error: 'Data pengajuan tidak ditemukan.', state };
  }
  if (target.status !== 'menunggu') {
    return { ok: false, error: 'Hanya pengajuan berstatus menunggu yang dapat disetujui.', state };
  }

  const conflictCheck = checkScheduleConflict(
    state.jadwal_lab,
    target.lab_id,
    target.tanggal_praktikum,
    target.jam_mulai,
    target.jam_selesai,
    target.id
  );
  if (conflictCheck.conflict) {
    return { ok: false, error: conflictCheck.message || 'Jadwal Bentrok', state };
  }

  const details = state.pengajuan_detail.filter((d) => d.pengajuan_id === pengajuanId);
  if (!details.length) {
    return { ok: false, error: 'Detail item pengajuan kosong.', state };
  }

  const effectiveApprovals: Record<string, number> = {};
  let totalApproved = 0;
  let isPartial = false;

  for (const d of details) {
    const qty = approvedQuantitiesByDetailId
      ? Math.max(0, Math.min(d.jumlah_diajukan, approvedQuantitiesByDetailId[d.id] ?? d.jumlah_diajukan))
      : d.jumlah_diajukan;
    effectiveApprovals[d.id] = qty;
    totalApproved += qty;
    if (qty < d.jumlah_diajukan) {
      isPartial = true;
    }
  }

  if (totalApproved === 0) {
    return {
      ok: false,
      error: 'Jumlah disetujui seluruh item tidak boleh 0. Gunakan tombol Tolak jika ingin menolak pengajuan.',
      state,
    };
  }

  // Validate stock for approved quantities
  const requestedToValidate: RequestedItemInput[] = details
    .filter((d) => effectiveApprovals[d.id] > 0)
    .map((d) => ({
      item_type: d.item_type,
      item_id: d.item_id,
      jumlah: effectiveApprovals[d.id],
    }));

  const stockIssues = validateItemStock(requestedToValidate, state.alat, state.bahan_kimia);
  if (stockIssues.length > 0) {
    return { ok: false, error: stockIssues[0].message, state };
  }

  // Deduct stock
  const nextAlat = state.alat.map((a) => {
    const matchingDetails = details.filter(
      (d) => d.item_type === 'alat' && d.item_id === a.id
    );
    if (!matchingDetails.length) return a;
    const sumApprove = matchingDetails.reduce((acc, d) => acc + effectiveApprovals[d.id], 0);
    return {
      ...a,
      jumlah_tersedia: Math.max(0, a.jumlah_tersedia - sumApprove),
      jumlah_dipinjam: a.jumlah_dipinjam + sumApprove,
    };
  });

  const nextBahan = state.bahan_kimia.map((b) => {
    const matchingDetails = details.filter(
      (d) => d.item_type === 'bahan_kimia' && d.item_id === b.id
    );
    if (!matchingDetails.length) return b;
    const sumApprove = matchingDetails.reduce((acc, d) => acc + effectiveApprovals[d.id], 0);
    const nextSisa = Math.max(0, Number((b.stok_sisa - sumApprove).toFixed(2)));
    return {
      ...b,
      stok_sisa: nextSisa,
      status: computeChemicalStatus(b.stok_awal, nextSisa, b.tanggal_kadaluarsa, referenceDateIso),
    };
  });

  const nextStatus: StatusPengajuan = isPartial ? 'disetujui_sebagian' : 'disetujui';

  const nextPengajuan = state.pengajuan.map((p) =>
    p.id === pengajuanId
      ? {
          ...p,
          status: nextStatus,
          disetujui_oleh: approverId,
          tanggal_disetujui: nowIso,
          alasan_penolakan: null,
        }
      : p
  );

  const nextDetails = state.pengajuan_detail.map((d) =>
    d.pengajuan_id === pengajuanId
      ? { ...d, jumlah_disetujui: effectiveApprovals[d.id] }
      : d
  );

  const guru = state.users.find((u) => u.id === target.guru_id);
  const jadwalEntry: JadwalLab = {
    id: `jdw-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    lab_id: target.lab_id,
    pengajuan_id: target.id,
    tanggal: target.tanggal_praktikum,
    jam_mulai: target.jam_mulai,
    jam_selesai: target.jam_selesai,
    kegiatan: `${target.judul_praktikum} (${target.kelas}${guru ? ` · ${guru.nama_lengkap}` : ''})`,
    status: 'booked',
  };

  return {
    ok: true,
    state: {
      ...state,
      alat: nextAlat,
      bahan_kimia: nextBahan,
      pengajuan: nextPengajuan,
      pengajuan_detail: nextDetails,
      jadwal_lab: [jadwalEntry, ...state.jadwal_lab],
    },
  };
}

export function rejectPengajuanState(
  state: LabDatabaseState,
  pengajuanId: string,
  approverId: string,
  alasanPenolakan: string,
  nowIso: string = new Date().toISOString()
): TransitionResult {
  const target = state.pengajuan.find((p) => p.id === pengajuanId);
  if (!target) {
    return { ok: false, error: 'Data pengajuan tidak ditemukan.', state };
  }
  if (target.status !== 'menunggu') {
    return { ok: false, error: 'Hanya pengajuan berstatus menunggu yang dapat ditolak.', state };
  }
  if (!alasanPenolakan.trim()) {
    return { ok: false, error: 'Alasan penolakan wajib diisi.', state };
  }

  return {
    ok: true,
    state: {
      ...state,
      pengajuan: state.pengajuan.map((p) =>
        p.id === pengajuanId
          ? {
              ...p,
              status: 'ditolak',
              alasan_penolakan: alasanPenolakan.trim(),
              disetujui_oleh: approverId,
              tanggal_disetujui: nowIso,
            }
          : p
      ),
    },
  };
}

export function requestReturnByGuruState(
  state: LabDatabaseState,
  pengajuanId: string
): TransitionResult {
  const target = state.pengajuan.find((p) => p.id === pengajuanId);
  if (!target) {
    return { ok: false, error: 'Data pengajuan tidak ditemukan.', state };
  }
  if (target.status !== 'disetujui' && target.status !== 'disetujui_sebagian') {
    return { ok: false, error: 'Pengajuan belum berstatus disetujui.', state };
  }

  return {
    ok: true,
    state: {
      ...state,
      pengajuan: state.pengajuan.map((p) =>
        p.id === pengajuanId ? { ...p, pengembalian_diajukan: true } : p
      ),
    },
  };
}

export interface ReturnInspectionInput {
  detail_id: string;
  jumlah_dikembalikan: number;
  kondisi_kembali: KondisiAlat;
  catatan_kerusakan: string | null;
  jumlah_rusak?: number;
}

/**
 * Selesaikan & Kembalikan (Inspeksi Kepala Lab):
 * - Mengurangi jumlah_dipinjam sesuai jumlah_disetujui.
 * - Kembalikan stok yang baik ke jumlah_tersedia.
 * - Jika kondisi rusak ('rusak_ringan' / 'rusak_berat'), jumlah_total alat berkurang
 *   sesuai jumlah unit yang rusak (default 1 jika tidak ditentukan) + unit hilang.
 * - Bahan kimia: jika ada sisa yang dikembalikan (>0), tambahkan kembali ke stok_sisa.
 * - Status pengajuan & jadwal_lab menjadi 'selesai'.
 */
export function completePengajuanState(
  state: LabDatabaseState,
  pengajuanId: string,
  inspections: ReturnInspectionInput[],
  referenceDateIso: string = getTodayIso()
): TransitionResult {
  const target = state.pengajuan.find((p) => p.id === pengajuanId);
  if (!target) {
    return { ok: false, error: 'Data pengajuan tidak ditemukan.', state };
  }
  if (target.status !== 'disetujui' && target.status !== 'disetujui_sebagian') {
    return { ok: false, error: 'Hanya pengajuan yang sedang berjalan yang dapat diselesaikan.', state };
  }

  const inspectionMap = new Map<string, ReturnInspectionInput>();
  for (const ins of inspections) {
    inspectionMap.set(ins.detail_id, ins);
  }

  const nextDetails = state.pengajuan_detail.map((d) => {
    if (d.pengajuan_id !== pengajuanId) return d;
    const approvedQty = d.jumlah_disetujui ?? d.jumlah_diajukan;
    const ins = inspectionMap.get(d.id);
    const defaultReturned = d.item_type === 'alat' ? approvedQty : 0;
    const returnedQty = ins
      ? Math.max(0, Math.min(approvedQty, ins.jumlah_dikembalikan))
      : defaultReturned;
    const kondisi: KondisiAlat = ins ? ins.kondisi_kembali : 'baik';
    return {
      ...d,
      jumlah_dikembalikan: returnedQty,
      kondisi_kembali: kondisi,
      catatan_kerusakan: ins?.catatan_kerusakan?.trim() || null,
    };
  });

  const updatedDetailsForThis = nextDetails.filter((d) => d.pengajuan_id === pengajuanId);

  const nextAlat = state.alat.map((a) => {
    const matching = updatedDetailsForThis.filter(
      (d) => d.item_type === 'alat' && d.item_id === a.id
    );
    if (!matching.length) return a;

    let borrowedToRelease = 0;
    let goodReturned = 0;
    let damagedOrLost = 0;
    let worstKondisi: KondisiAlat = a.kondisi;

    for (const d of matching) {
      const approvedQty = d.jumlah_disetujui ?? d.jumlah_diajukan;
      const returnedQty = d.jumlah_dikembalikan ?? approvedQty;
      const kondisi = d.kondisi_kembali ?? 'baik';
      const ins = inspectionMap.get(d.id);
      borrowedToRelease += approvedQty;

      const missingCount = Math.max(0, approvedQty - returnedQty);
      if (kondisi === 'baik') {
        goodReturned += returnedQty;
        damagedOrLost += missingCount;
      } else {
        const damagedInReturned = Math.min(
          returnedQty,
          Math.max(1, ins?.jumlah_rusak ?? (returnedQty > 0 ? 1 : 0))
        );
        goodReturned += Math.max(0, returnedQty - damagedInReturned);
        damagedOrLost += missingCount + damagedInReturned;
        if (kondisi === 'rusak_berat') {
          worstKondisi = 'rusak_berat';
        } else if (kondisi === 'rusak_ringan' && worstKondisi === 'baik') {
          worstKondisi = 'rusak_ringan';
        }
      }
    }

    const nextDipinjam = Math.max(0, a.jumlah_dipinjam - borrowedToRelease);
    const nextTotal = Math.max(nextDipinjam, a.jumlah_total - damagedOrLost);
    const nextTersedia = Math.min(nextTotal - nextDipinjam, a.jumlah_tersedia + goodReturned);

    return {
      ...a,
      jumlah_dipinjam: nextDipinjam,
      jumlah_total: nextTotal,
      jumlah_tersedia: Math.max(0, nextTersedia),
      kondisi: worstKondisi,
    };
  });

  const nextBahan = state.bahan_kimia.map((b) => {
    const matching = updatedDetailsForThis.filter(
      (d) => d.item_type === 'bahan_kimia' && d.item_id === b.id
    );
    if (!matching.length) return b;
    const returnedSum = matching.reduce((acc, d) => acc + (d.jumlah_dikembalikan ?? 0), 0);
    if (returnedSum <= 0) return b;
    const nextSisa = Number((b.stok_sisa + returnedSum).toFixed(2));
    return {
      ...b,
      stok_sisa: nextSisa,
      status: computeChemicalStatus(b.stok_awal, nextSisa, b.tanggal_kadaluarsa, referenceDateIso),
    };
  });

  const nextJadwal = state.jadwal_lab.map((j) =>
    j.pengajuan_id === pengajuanId ? { ...j, status: 'selesai' as const } : j
  );

  const nextPengajuan = state.pengajuan.map((p) =>
    p.id === pengajuanId
      ? { ...p, status: 'selesai' as const, pengembalian_diajukan: false }
      : p
  );

  return {
    ok: true,
    state: {
      ...state,
      alat: nextAlat,
      bahan_kimia: nextBahan,
      pengajuan: nextPengajuan,
      pengajuan_detail: nextDetails,
      jadwal_lab: nextJadwal,
    },
  };
}

export function cancelPengajuanState(
  state: LabDatabaseState,
  pengajuanId: string
): TransitionResult {
  const target = state.pengajuan.find((p) => p.id === pengajuanId);
  if (!target) {
    return { ok: false, error: 'Data pengajuan tidak ditemukan.', state };
  }
  if (target.status !== 'menunggu') {
    return { ok: false, error: 'Hanya pengajuan menunggu yang dapat dibatalkan.', state };
  }
  return {
    ok: true,
    state: {
      ...state,
      pengajuan: state.pengajuan.map((p) =>
        p.id === pengajuanId ? { ...p, status: 'dibatalkan' as const } : p
      ),
    },
  };
}

export interface MonthlyUsageDatum {
  monthKey: string;
  label: string;
  fisika: number;
  kimia: number;
  biologi: number;
  total: number;
}

const MONTH_LABELS_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

export function computeMonthlyLabUsage(
  jadwalList: JadwalLab[],
  labs: { id: string; nama_lab: string }[],
  year: number = 2026
): MonthlyUsageDatum[] {
  const buckets: MonthlyUsageDatum[] = [];
  // Show last 6 months up to Nov/Dec or full Jul-Dec + Jun
  for (let m = 5; m <= 11; m++) {
    const monthNum = m + 1;
    const key = `${year}-${String(monthNum).padStart(2, '0')}`;
    buckets.push({
      monthKey: key,
      label: MONTH_LABELS_ID[m],
      fisika: 0,
      kimia: 0,
      biologi: 0,
      total: 0,
    });
  }

  for (const j of jadwalList) {
    if (j.status === 'dibatalkan') continue;
    const key = j.tanggal.slice(0, 7);
    const bucket = buckets.find((b) => b.monthKey === key);
    if (!bucket) continue;
    const lab = labs.find((l) => l.id === j.lab_id);
    const labName = lab?.nama_lab.toLowerCase() ?? '';
    if (labName.includes('fisika')) bucket.fisika += 1;
    else if (labName.includes('kimia')) bucket.kimia += 1;
    else if (labName.includes('biologi')) bucket.biologi += 1;
    bucket.total += 1;
  }

  return buckets;
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTanggalIndonesia(isoDate: string): string {
  if (!isoDate) return '-';
  const parts = isoDate.slice(0, 10).split('-');
  if (parts.length !== 3) return isoDate;
  const bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const y = Number.parseInt(parts[0], 10);
  const m = Number.parseInt(parts[1], 10) - 1;
  const d = Number.parseInt(parts[2], 10);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d) || !bulan[m]) {
    return isoDate;
  }
  return `${d} ${bulan[m]} ${y}`;
}
