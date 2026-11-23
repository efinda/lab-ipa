import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Lock, X } from 'lucide-react';
import type { User, UserRole } from '../types/database';

function getRoleTitle(role: UserRole, mapel: string | null): string {
  switch (role) {
    case 'kepala_lab':
      return 'Kepala Lab IPA (Admin)';
    case 'guru_ipa':
      return mapel ? `Guru IPA (${mapel.charAt(0).toUpperCase() + mapel.slice(1)})` : 'Guru IPA';
    case 'kepsek_tu':
      return 'Kepala Sekolah / Tata Usaha';
    case 'siswa':
      return 'Siswa / Asisten Lab';
  }
}

interface PasswordModalProps {
  user: User | null;
  onClose: () => void;
  onSubmitPassword: (user: User, password: string) => { ok: boolean; error?: string };
}

export function PasswordModal({ user, onClose, onSubmitPassword }: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setPassword('');
    setShowPassword(false);
    setErrorMsg(null);
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user, onClose]);

  if (!user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMsg('Password wajib diisi.');
      return;
    }
    const result = onSubmitPassword(user, password);
    if (!result.ok) {
      setErrorMsg(result.error ?? 'Password salah. Silakan coba lagi.');
      return;
    }
    setPassword('');
    setErrorMsg(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-[#0F2744] text-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h3 id="password-modal-title" className="text-sm font-bold truncate">
                Verifikasi Password Login
              </h3>
              <p className="text-[11px] text-slate-300 truncate">
                {getRoleTitle(user.role, user.mapel)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog password"
            className="p-1.5 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
            <div className="text-[11px] text-slate-500">Masuk sebagai</div>
            <div className="text-sm font-bold text-slate-900">{user.nama_lengkap}</div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="login-password-input"
              className="block text-xs font-semibold text-slate-700"
            >
              Password Akses
            </label>
            <div className="relative">
              <input
                id="login-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                autoFocus
                autoComplete="current-password"
                placeholder="Masukkan password..."
                className="w-full pl-3.5 pr-10 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F2744] focus:border-[#0F2744]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-slate-500 hover:text-slate-800"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700"
            >
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#0F2744] hover:bg-[#1E3A5F] text-white text-xs font-semibold transition-colors"
            >
              Masuk
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
