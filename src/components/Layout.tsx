import React, { useState } from 'react';
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileSpreadsheet,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Users,
  X,
} from 'lucide-react';
import { useLab, type AppPage } from '../context/LabContext';
import type { User, UserRole } from '../types/database';
import { formatTanggalIndonesia, roleRequiresPassword } from '../utils/labLogic';
import { PasswordModal } from './PasswordModal';

interface NavItem {
  id: AppPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['kepala_lab', 'guru_ipa', 'kepsek_tu'],
  },
  {
    id: 'inventaris',
    label: 'Inventaris Alat & Bahan',
    icon: Package,
    roles: ['kepala_lab', 'guru_ipa', 'siswa'],
  },
  {
    id: 'pengajuan',
    label: 'Pengajuan Praktikum',
    icon: ClipboardList,
    roles: ['kepala_lab', 'guru_ipa', 'siswa'],
  },
  {
    id: 'jadwal',
    label: 'Jadwal Pakai Lab',
    icon: CalendarDays,
    roles: ['kepala_lab', 'guru_ipa', 'siswa', 'kepsek_tu'],
  },
  {
    id: 'modul',
    label: 'Modul & Nilai Praktikum',
    icon: BookOpen,
    roles: ['kepala_lab', 'guru_ipa', 'siswa', 'kepsek_tu'],
  },
  {
    id: 'laporan',
    label: 'Laporan Otomatis',
    icon: FileSpreadsheet,
    roles: ['kepala_lab', 'kepsek_tu', 'guru_ipa'],
  },
  {
    id: 'pengguna',
    label: 'Kelola Pengguna',
    icon: Users,
    roles: ['kepala_lab'],
  },
];

function formatRoleLabel(role: UserRole, mapel: string | null): string {
  switch (role) {
    case 'kepala_lab':
      return 'Kepala Lab IPA (Admin)';
    case 'guru_ipa':
      return mapel ? `Guru IPA (${mapel.charAt(0).toUpperCase() + mapel.slice(1)})` : 'Guru IPA';
    case 'siswa':
      return 'Siswa / Asisten Lab';
    case 'kepsek_tu':
      return 'Kepala Sekolah / TU';
  }
}

export function Layout({ children }: { children: React.ReactNode }) {
  const {
    db,
    currentUser,
    activePage,
    setActivePage,
    logout,
    loginAs,
    openPengajuanDetail,
    toasts,
    dismissToast,
  } = useLab();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [roleSwitchOpen, setRoleSwitchOpen] = useState(false);
  const [pendingSwitchUser, setPendingSwitchUser] = useState<User | null>(null);

  if (!currentUser) return null;

  const visibleNav = NAV_ITEMS.filter((item) => item.roles.includes(currentUser.role));
  const pendingPengajuan = db.pengajuan.filter((p) => p.status === 'menunggu');
  const returnInspectionCount = db.pengajuan.filter(
    (p) => (p.status === 'disetujui' || p.status === 'disetujui_sebagian') && p.pengembalian_diajukan
  ).length;
  const totalNotifications = pendingPengajuan.length + returnInspectionCount;

  const currentNavLabel =
    visibleNav.find((n) => n.id === activePage)?.label ?? 'SIM-LAB IPA SMA';

  const handleSelectPage = (page: AppPage) => {
    setActivePage(page);
    setMobileMenuOpen(false);
  };

  const quickUsers = db.users.filter((u) => u.is_active);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-[#0F2744] text-white no-print z-30">
        <div className="px-5 py-5 border-b border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight text-white truncate">
              SIM-LAB IPA SMA
            </div>
            <div className="text-[11px] text-slate-300 truncate">
              Laboratorium Terpadu
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Menu utama">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.id;
            const badge =
              item.id === 'pengajuan' && pendingPengajuan.length > 0
                ? pendingPengajuan.length
                : null;
            const itemLabel =
              item.id === 'modul' &&
              currentUser.role !== 'kepala_lab' &&
              currentUser.role !== 'guru_ipa'
                ? 'Modul Praktikum'
                : item.label;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectPage(item.id)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left ${
                  active
                    ? 'bg-white text-[#0F2744] font-semibold'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#0F2744]' : 'text-slate-300'}`} />
                  <span className="truncate">{itemLabel}</span>
                </span>
                {badge !== null && (
                  <span
                    className={`px-1.5 py-0.5 text-[11px] font-mono tabular-nums rounded ${
                      active ? 'bg-[#0F2744] text-white' : 'bg-amber-400 text-slate-900 font-semibold'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="text-xs text-slate-300">
            <div className="font-semibold text-white truncate">{currentUser.nama_lengkap}</div>
            <div className="text-[11px] text-slate-300 truncate">
              {formatRoleLabel(currentUser.role, currentUser.mapel)}
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar / Ganti Role
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-[#0F2744] text-white flex flex-col z-10">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FlaskConical className="w-5 h-5 text-white" />
                <span className="text-sm font-bold">SIM-LAB IPA SMA</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Tutup menu navigasi"
                className="p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {visibleNav.map((item) => {
                const Icon = item.icon;
                const active = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectPage(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
                      active ? 'bg-white text-[#0F2744] font-semibold' : 'text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-white/10">
              <button
                type="button"
                onClick={logout}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium bg-white/10 text-white"
              >
                <LogOut className="w-4 h-4" />
                Keluar / Ganti Role
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Wrapper */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu navigasi"
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="text-xs text-slate-500 hidden sm:block">
                SIM-LAB IPA SMA
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {currentNavLabel}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Notifikasi Pengajuan Menunggu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setRoleSwitchOpen(false);
                }}
                aria-label={`Notifikasi pengajuan (${totalNotifications})`}
                className="relative p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Bell className="w-4 h-4" />
                {totalNotifications > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-md bg-amber-500 text-white text-[10px] font-bold font-mono tabular-nums flex items-center justify-center">
                    {totalNotifications}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-lg z-40 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      Notifikasi Persetujuan &amp; Pengembalian
                    </span>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs text-slate-500 hover:text-slate-900"
                    >
                      Tutup
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {totalNotifications === 0 ? (
                      <div className="p-4 text-xs text-slate-500 text-center">
                        Tidak ada pengajuan menunggu persetujuan.
                      </div>
                    ) : (
                      <>
                        {pendingPengajuan.map((pgj) => {
                          const guru = db.users.find((u) => u.id === pgj.guru_id);
                          return (
                            <button
                              key={pgj.id}
                              type="button"
                              onClick={() => {
                                setNotifOpen(false);
                                openPengajuanDetail(pgj.id);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="font-mono font-semibold text-[#0F2744]">
                                  {pgj.kode_pengajuan}
                                </span>
                                <span className="text-amber-700 font-medium">Menunggu Acc</span>
                              </div>
                              <div className="text-xs font-semibold text-slate-900 mt-0.5 truncate">
                                {pgj.judul_praktikum}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {guru?.nama_lengkap} · {formatTanggalIndonesia(pgj.tanggal_praktikum)}
                              </div>
                            </button>
                          );
                        })}
                        {db.pengajuan
                          .filter(
                            (p) =>
                              (p.status === 'disetujui' || p.status === 'disetujui_sebagian') &&
                              p.pengembalian_diajukan
                          )
                          .map((pgj) => (
                            <button
                              key={`ret-${pgj.id}`}
                              type="button"
                              onClick={() => {
                                setNotifOpen(false);
                                openPengajuanDetail(pgj.id);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="font-mono font-semibold text-[#0F2744]">
                                  {pgj.kode_pengajuan}
                                </span>
                                <span className="text-indigo-700 font-medium">Perlu Inspeksi</span>
                              </div>
                              <div className="text-xs font-semibold text-slate-900 mt-0.5 truncate">
                                {pgj.judul_praktikum}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Guru mengajukan pengembalian alat
                              </div>
                            </button>
                          ))}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Info User & Switch Role Cepat */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setRoleSwitchOpen((v) => !v);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-left transition-colors"
              >
                <div className="w-7 h-7 rounded-md bg-[#0F2744] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {currentUser.nama_lengkap.charAt(0)}
                </div>
                <div className="hidden sm:block min-w-0 max-w-[180px]">
                  <div className="text-xs font-semibold text-slate-900 truncate">
                    {currentUser.nama_lengkap}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {formatRoleLabel(currentUser.role, currentUser.mapel)}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              </button>

              {roleSwitchOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-lg z-40 overflow-hidden">
                  <div className="px-3.5 py-2.5 border-b border-slate-200 bg-slate-50">
                    <div className="text-xs font-bold text-slate-900">Ganti Peran Demo Cepat</div>
                    <div className="text-[11px] text-slate-500">
                      Uji alur lintas peran tanpa keluar halaman
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {quickUsers.map((u) => {
                      if (!u) return null;
                      const isCurrent = u.id === currentUser.id;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setRoleSwitchOpen(false);
                            if (u.id === currentUser.id) return;
                            if (roleRequiresPassword(u.role)) {
                              setPendingSwitchUser(u);
                            } else {
                              loginAs(u.id);
                            }
                          }}
                          className={`w-full text-left px-3.5 py-2.5 hover:bg-slate-50 transition-colors ${
                            isCurrent ? 'bg-slate-50' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-900 truncate">
                              {u.nama_lengkap}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-semibold text-[#0F2744]">Aktif</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {formatRoleLabel(u.role, u.mapel)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="p-2 border-t border-slate-200 bg-slate-50">
                    <button
                      type="button"
                      onClick={logout}
                      className="w-full py-2 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors"
                    >
                      Kembali ke Halaman Login
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0 no-print"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`px-4 py-3 rounded-xl border shadow-md flex items-start justify-between gap-3 text-xs font-medium ${
                toast.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : toast.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <span>{toast.text}</span>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Tutup notifikasi"
                className="text-slate-400 hover:text-slate-700 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <PasswordModal
        user={pendingSwitchUser}
        onClose={() => setPendingSwitchUser(null)}
        onSubmitPassword={(user, password) => loginAs(user.id, password)}
      />
    </div>
  );
}
