import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createInitialDatabaseState } from '../data/seedData';
import type {
  Alat,
  BahanKimia,
  KelasSMA,
  LabDatabaseState,
  Mapel,
  NilaiPraktikum,
  Praktikum,
  User,
} from '../types/database';
import {
  addUserState,
  approvePengajuanState,
  cancelPengajuanState,
  completePengajuanState,
  computeChemicalStatus,
  createPengajuanState,
  deleteUserState,
  getTodayIso,
  rejectPengajuanState,
  requestReturnByGuruState,
  roleRequiresPassword,
  updateUserState,
  verifyRolePassword,
  type CreatePengajuanPayload,
  type ReturnInspectionInput,
  type UpsertUserPayload,
} from '../utils/labLogic';

export type AppPage =
  | 'dashboard'
  | 'inventaris'
  | 'pengajuan'
  | 'jadwal'
  | 'modul'
  | 'laporan'
  | 'pengguna';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

const STORAGE_DB_KEY = 'sim_lab_ipa_sma_db_v3';
const STORAGE_USER_KEY = 'sim_lab_ipa_sma_uid_v3';

interface LabContextValue {
  db: LabDatabaseState;
  currentUser: User | null;
  activePage: AppPage;
  setActivePage: (page: AppPage) => void;
  prefillPraktikumId: string | null;
  setPrefillPraktikumId: (id: string | null) => void;
  openPengajuanForm: boolean;
  setOpenPengajuanForm: (open: boolean) => void;
  selectedPengajuanId: string | null;
  setSelectedPengajuanId: (id: string | null) => void;
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
  notify: (type: ToastMessage['type'], text: string) => void;
  loginAs: (userId: string, password?: string) => { ok: boolean; error?: string };
  logout: () => void;
  resetDemoData: () => void;
  // Inventaris Alat
  addAlat: (alat: Omit<Alat, 'id' | 'created_at' | 'qr_code'>) => void;
  updateAlat: (id: string, patch: Partial<Alat>) => void;
  deleteAlat: (id: string) => void;
  // Bahan Kimia
  addBahanKimia: (bahan: Omit<BahanKimia, 'id' | 'status'>) => void;
  updateBahanKimia: (id: string, patch: Partial<BahanKimia>) => void;
  deleteBahanKimia: (id: string) => void;
  // Pengajuan Lifecycle
  submitPengajuan: (payload: Omit<CreatePengajuanPayload, 'guru_id'> & { guru_id?: string }) => { ok: boolean; error?: string; createdId?: string };
  approvePengajuan: (pengajuanId: string, approvedQuantitiesByDetailId?: Record<string, number>) => { ok: boolean; error?: string };
  rejectPengajuan: (pengajuanId: string, alasan: string) => { ok: boolean; error?: string };
  submitReturnByGuru: (pengajuanId: string) => { ok: boolean; error?: string };
  completePengajuanInspection: (pengajuanId: string, inspections: ReturnInspectionInput[]) => { ok: boolean; error?: string };
  cancelPengajuan: (pengajuanId: string) => { ok: boolean; error?: string };
  // Modul & Nilai
  addPraktikum: (data: {
    judul_praktikum: string;
    mapel: Mapel;
    kelas: KelasSMA;
    deskripsi: string;
    lks_url: string;
    estimasi_waktu_menit: number;
    items: { item_type: 'alat' | 'bahan_kimia'; item_id: string; jumlah_dibutuhkan: number }[];
  }) => void;
  updatePraktikumLks: (praktikumId: string, lksUrl: string) => void;
  saveNilaiPraktikumBatch: (
    pengajuanId: string,
    entries: { siswa_id: string; hadir: boolean; nilai: number | null; catatan: string | null }[]
  ) => void;
  // Kelola Pengguna (Admin)
  addUser: (payload: UpsertUserPayload) => { ok: boolean; error?: string; createdId?: string };
  updateUser: (userId: string, payload: UpsertUserPayload) => { ok: boolean; error?: string };
  deleteUser: (userId: string) => { ok: boolean; error?: string };
  // Helper navigate
  usePraktikumForPengajuan: (praktikumId: string) => void;
  openPengajuanDetail: (pengajuanId: string) => void;
}

const LabContext = createContext<LabContextValue | null>(null);

function loadInitialDb(): LabDatabaseState {
  try {
    const raw = localStorage.getItem(STORAGE_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LabDatabaseState;
      if (parsed && Array.isArray(parsed.alat) && Array.isArray(parsed.pengajuan)) {
        return parsed;
      }
    }
  } catch {
    // Fallback to seed data
  }
  return createInitialDatabaseState();
}

function defaultPageForRole(role: User['role']): AppPage {
  if (role === 'siswa') return 'inventaris';
  return 'dashboard';
}

export function LabProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<LabDatabaseState>(() => loadInitialDb());
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    try {
      // Support ?autostart=1 for automated testing
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'usr-kalab-1';
      }
      return localStorage.getItem(STORAGE_USER_KEY);
    } catch {
      return null;
    }
  });
  const [activePage, setActivePage] = useState<AppPage>(() => {
    const uid = localStorage.getItem(STORAGE_USER_KEY);
    const initialUser = db.users.find((u) => u.id === uid);
    return initialUser ? defaultPageForRole(initialUser.role) : 'dashboard';
  });

  const [prefillPraktikumId, setPrefillPraktikumId] = useState<string | null>(null);
  const [openPengajuanForm, setOpenPengajuanForm] = useState<boolean>(false);
  const [selectedPengajuanId, setSelectedPengajuanId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_DB_KEY, JSON.stringify(db));
    } catch {
      // ignore storage quota errors
    }
  }, [db]);

  useEffect(() => {
    try {
      if (currentUserId) {
        localStorage.setItem(STORAGE_USER_KEY, currentUserId);
      } else {
        localStorage.removeItem(STORAGE_USER_KEY);
      }
    } catch {
      // ignore
    }
  }, [currentUserId]);

  const currentUser = useMemo(
    () => db.users.find((u) => u.id === currentUserId) ?? null,
    [db.users, currentUserId]
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback((type: ToastMessage['type'], text: string) => {
    const id = `tst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const loginAs = useCallback(
    (userId: string, password?: string): { ok: boolean; error?: string } => {
      const user = db.users.find((u) => u.id === userId);
      if (!user) {
        return { ok: false, error: 'Akun pengguna tidak ditemukan.' };
      }
      if (roleRequiresPassword(user.role) && !verifyRolePassword(user.role, password ?? '')) {
        return { ok: false, error: 'Password tidak sesuai. Silakan periksa kembali.' };
      }
      setCurrentUserId(user.id);
      setActivePage(defaultPageForRole(user.role));
      setSelectedPengajuanId(null);
      setOpenPengajuanForm(false);
      notify('info', `Masuk sebagai ${user.nama_lengkap}`);
      return { ok: true };
    },
    [db.users, notify]
  );

  const logout = useCallback(() => {
    setCurrentUserId(null);
    setSelectedPengajuanId(null);
    setOpenPengajuanForm(false);
    setPrefillPraktikumId(null);
  }, []);

  const resetDemoData = useCallback(() => {
    const fresh = createInitialDatabaseState();
    setDb(fresh);
    localStorage.setItem(STORAGE_DB_KEY, JSON.stringify(fresh));
    notify('success', 'Data demo berhasil dikembalikan ke kondisi awal.');
  }, [notify]);

  const addAlat = useCallback(
    (alatInput: Omit<Alat, 'id' | 'created_at' | 'qr_code'>) => {
      const id = `alt-${Date.now()}`;
      const newAlat: Alat = {
        ...alatInput,
        id,
        qr_code: `SIMLAB:${alatInput.kode_inventaris}:${alatInput.nama_alat}`,
        created_at: new Date().toISOString(),
      };
      setDb((prev) => ({ ...prev, alat: [newAlat, ...prev.alat] }));
      notify('success', `Alat "${newAlat.nama_alat}" ditambahkan ke inventaris.`);
    },
    [notify]
  );

  const updateAlat = useCallback(
    (id: string, patch: Partial<Alat>) => {
      setDb((prev) => ({
        ...prev,
        alat: prev.alat.map((a) => {
          if (a.id !== id) return a;
          const updated = { ...a, ...patch };
          updated.qr_code = `SIMLAB:${updated.kode_inventaris}:${updated.nama_alat}`;
          return updated;
        }),
      }));
      notify('success', 'Data alat berhasil diperbarui.');
    },
    [notify]
  );

  const deleteAlat = useCallback(
    (id: string) => {
      setDb((prev) => ({ ...prev, alat: prev.alat.filter((a) => a.id !== id) }));
      notify('info', 'Alat dihapus dari inventaris.');
    },
    [notify]
  );

  const addBahanKimia = useCallback(
    (bahanInput: Omit<BahanKimia, 'id' | 'status'>) => {
      const id = `bhn-${Date.now()}`;
      const status = computeChemicalStatus(
        bahanInput.stok_awal,
        bahanInput.stok_sisa,
        bahanInput.tanggal_kadaluarsa,
        getTodayIso()
      );
      const newBahan: BahanKimia = { ...bahanInput, id, status };
      setDb((prev) => ({ ...prev, bahan_kimia: [newBahan, ...prev.bahan_kimia] }));
      notify('success', `Bahan kimia "${newBahan.nama_bahan}" ditambahkan.`);
    },
    [notify]
  );

  const updateBahanKimia = useCallback(
    (id: string, patch: Partial<BahanKimia>) => {
      setDb((prev) => ({
        ...prev,
        bahan_kimia: prev.bahan_kimia.map((b) => {
          if (b.id !== id) return b;
          const next = { ...b, ...patch };
          next.status = computeChemicalStatus(
            next.stok_awal,
            next.stok_sisa,
            next.tanggal_kadaluarsa,
            getTodayIso()
          );
          return next;
        }),
      }));
      notify('success', 'Data bahan kimia berhasil diperbarui.');
    },
    [notify]
  );

  const deleteBahanKimia = useCallback(
    (id: string) => {
      setDb((prev) => ({
        ...prev,
        bahan_kimia: prev.bahan_kimia.filter((b) => b.id !== id),
      }));
      notify('info', 'Bahan kimia dihapus.');
    },
    [notify]
  );

  const submitPengajuan = useCallback(
    (payload: Omit<CreatePengajuanPayload, 'guru_id'> & { guru_id?: string }) => {
      const guruId = payload.guru_id ?? currentUser?.id ?? 'usr-guru-fis';
      let outcome: { ok: boolean; error?: string; createdId?: string } = { ok: false };
      setDb((prev) => {
        const res = createPengajuanState(prev, { ...payload, guru_id: guruId });
        outcome = { ok: res.ok, error: res.error, createdId: res.createdId };
        return res.ok ? res.state : prev;
      });
      if (outcome.ok) {
        notify('success', 'Pengajuan praktikum berhasil dikirim untuk persetujuan Kepala Lab.');
      } else if (outcome.error) {
        notify('error', outcome.error);
      }
      return outcome;
    },
    [currentUser?.id, notify]
  );

  const approvePengajuan = useCallback(
    (pengajuanId: string, approvedQuantitiesByDetailId?: Record<string, number>) => {
      const approverId = currentUser?.id ?? 'usr-kalab-1';
      let outcome: { ok: boolean; error?: string } = { ok: false };
      setDb((prev) => {
        const res = approvePengajuanState(
          prev,
          pengajuanId,
          approverId,
          approvedQuantitiesByDetailId,
          getTodayIso()
        );
        outcome = { ok: res.ok, error: res.error };
        return res.ok ? res.state : prev;
      });
      if (outcome.ok) {
        notify('success', 'Pengajuan disetujui. Stok otomatis terpotong & jadwal lab tercatat.');
      } else if (outcome.error) {
        notify('error', outcome.error);
      }
      return outcome;
    },
    [currentUser?.id, notify]
  );

  const rejectPengajuan = useCallback(
    (pengajuanId: string, alasan: string) => {
      const approverId = currentUser?.id ?? 'usr-kalab-1';
      let outcome: { ok: boolean; error?: string } = { ok: false };
      setDb((prev) => {
        const res = rejectPengajuanState(prev, pengajuanId, approverId, alasan);
        outcome = { ok: res.ok, error: res.error };
        return res.ok ? res.state : prev;
      });
      if (outcome.ok) {
        notify('info', 'Pengajuan ditolak dengan alasan tercatat.');
      } else if (outcome.error) {
        notify('error', outcome.error);
      }
      return outcome;
    },
    [currentUser?.id, notify]
  );

  const submitReturnByGuru = useCallback(
    (pengajuanId: string) => {
      let outcome: { ok: boolean; error?: string } = { ok: false };
      setDb((prev) => {
        const res = requestReturnByGuruState(prev, pengajuanId);
        outcome = { ok: res.ok, error: res.error };
        return res.ok ? res.state : prev;
      });
      if (outcome.ok) {
        notify('success', 'Pengembalian diajukan. Menunggu inspeksi kondisi oleh Kepala Lab.');
      } else if (outcome.error) {
        notify('error', outcome.error);
      }
      return outcome;
    },
    [notify]
  );

  const completePengajuanInspection = useCallback(
    (pengajuanId: string, inspections: ReturnInspectionInput[]) => {
      let outcome: { ok: boolean; error?: string } = { ok: false };
      setDb((prev) => {
        const res = completePengajuanState(prev, pengajuanId, inspections, getTodayIso());
        outcome = { ok: res.ok, error: res.error };
        return res.ok ? res.state : prev;
      });
      if (outcome.ok) {
        notify('success', 'Praktikum selesai & stok inventaris telah dikembalikan sesuai inspeksi.');
      } else if (outcome.error) {
        notify('error', outcome.error);
      }
      return outcome;
    },
    [notify]
  );

  const cancelPengajuan = useCallback(
    (pengajuanId: string) => {
      let outcome: { ok: boolean; error?: string } = { ok: false };
      setDb((prev) => {
        const res = cancelPengajuanState(prev, pengajuanId);
        outcome = { ok: res.ok, error: res.error };
        return res.ok ? res.state : prev;
      });
      if (outcome.ok) {
        notify('info', 'Pengajuan berhasil dibatalkan.');
      } else if (outcome.error) {
        notify('error', outcome.error);
      }
      return outcome;
    },
    [notify]
  );

  const addPraktikum = useCallback(
    (data: {
      judul_praktikum: string;
      mapel: Mapel;
      kelas: KelasSMA;
      deskripsi: string;
      lks_url: string;
      estimasi_waktu_menit: number;
      items: { item_type: 'alat' | 'bahan_kimia'; item_id: string; jumlah_dibutuhkan: number }[];
    }) => {
      const id = `prk-${Date.now()}`;
      const newPrk: Praktikum = {
        id,
        judul_praktikum: data.judul_praktikum,
        mapel: data.mapel,
        kelas: data.kelas,
        deskripsi: data.deskripsi,
        lks_url: data.lks_url || `LKS-${data.mapel.toUpperCase()}-${data.kelas}.pdf`,
        dibuat_oleh: currentUser?.id ?? 'usr-guru-fis',
        estimasi_waktu_menit: data.estimasi_waktu_menit,
      };
      const newItems = data.items.map((it, idx) => ({
        id: `pa-${Date.now()}-${idx}`,
        praktikum_id: id,
        item_type: it.item_type,
        item_id: it.item_id,
        jumlah_dibutuhkan: it.jumlah_dibutuhkan,
      }));
      setDb((prev) => ({
        ...prev,
        praktikum: [newPrk, ...prev.praktikum],
        praktikum_alat: [...newItems, ...prev.praktikum_alat],
      }));
      notify('success', `Modul praktikum "${newPrk.judul_praktikum}" ditambahkan.`);
    },
    [currentUser?.id, notify]
  );

  const updatePraktikumLks = useCallback(
    (praktikumId: string, lksUrl: string) => {
      setDb((prev) => ({
        ...prev,
        praktikum: prev.praktikum.map((p) =>
          p.id === praktikumId ? { ...p, lks_url: lksUrl } : p
        ),
      }));
      notify('success', `File LKS "${lksUrl}" berhasil diperbarui.`);
    },
    [notify]
  );

  const saveNilaiPraktikumBatch = useCallback(
    (
      pengajuanId: string,
      entries: { siswa_id: string; hadir: boolean; nilai: number | null; catatan: string | null }[]
    ) => {
      setDb((prev) => {
        const others = prev.nilai_praktikum.filter((n) => n.pengajuan_id !== pengajuanId);
        const created: NilaiPraktikum[] = entries.map((e, idx) => ({
          id: `nil-${pengajuanId}-${idx}-${Date.now()}`,
          pengajuan_id: pengajuanId,
          siswa_id: e.siswa_id,
          hadir: e.hadir,
          nilai: e.hadir ? e.nilai : null,
          catatan: e.catatan,
        }));
        return {
          ...prev,
          nilai_praktikum: [...others, ...created],
        };
      });
      notify('success', 'Absensi & nilai praktikum siswa berhasil disimpan.');
    },
    [notify]
  );

  const addUser = useCallback(
    (payload: UpsertUserPayload): { ok: boolean; error?: string; createdId?: string } => {
      const res = addUserState(db, payload);
      if (!res.ok) {
        if (res.error) notify('error', res.error);
        return { ok: false, error: res.error };
      }
      setDb(res.state);
      notify('success', `Pengguna "${payload.nama_lengkap.trim()}" berhasil ditambahkan.`);
      return { ok: true, createdId: res.createdId };
    },
    [db, notify]
  );

  const updateUser = useCallback(
    (userId: string, payload: UpsertUserPayload): { ok: boolean; error?: string } => {
      const res = updateUserState(db, userId, payload, currentUser?.id);
      if (!res.ok) {
        if (res.error) notify('error', res.error);
        return { ok: false, error: res.error };
      }
      setDb(res.state);
      notify('success', `Data pengguna "${payload.nama_lengkap.trim()}" berhasil diperbarui.`);
      return { ok: true };
    },
    [currentUser?.id, db, notify]
  );

  const deleteUser = useCallback(
    (userId: string): { ok: boolean; error?: string } => {
      const target = db.users.find((u) => u.id === userId);
      const res = deleteUserState(db, userId, currentUser?.id);
      if (!res.ok) {
        if (res.error) notify('error', res.error);
        return { ok: false, error: res.error };
      }
      setDb(res.state);
      notify('info', `Pengguna "${target?.nama_lengkap ?? ''}" berhasil dihapus.`);
      return { ok: true };
    },
    [currentUser?.id, db, notify]
  );

  const usePraktikumForPengajuan = useCallback((praktikumId: string) => {
    setPrefillPraktikumId(praktikumId);
    setSelectedPengajuanId(null);
    setOpenPengajuanForm(true);
    setActivePage('pengajuan');
  }, []);

  const openPengajuanDetail = useCallback((pengajuanId: string) => {
    setOpenPengajuanForm(false);
    setSelectedPengajuanId(pengajuanId);
    setActivePage('pengajuan');
  }, []);

  const value: LabContextValue = {
    db,
    currentUser,
    activePage,
    setActivePage,
    prefillPraktikumId,
    setPrefillPraktikumId,
    openPengajuanForm,
    setOpenPengajuanForm,
    selectedPengajuanId,
    setSelectedPengajuanId,
    toasts,
    dismissToast,
    notify,
    loginAs,
    logout,
    resetDemoData,
    addAlat,
    updateAlat,
    deleteAlat,
    addBahanKimia,
    updateBahanKimia,
    deleteBahanKimia,
    submitPengajuan,
    approvePengajuan,
    rejectPengajuan,
    submitReturnByGuru,
    completePengajuanInspection,
    cancelPengajuan,
    addPraktikum,
    updatePraktikumLks,
    saveNilaiPraktikumBatch,
    addUser,
    updateUser,
    deleteUser,
    usePraktikumForPengajuan,
    openPengajuanDetail,
  };

  return <LabContext.Provider value={value}>{children}</LabContext.Provider>;
}

export function useLab() {
  const ctx = useContext(LabContext);
  if (!ctx) throw new Error('useLab harus digunakan di dalam LabProvider');
  return ctx;
}
