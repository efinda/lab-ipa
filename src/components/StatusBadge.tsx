import React from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Wrench,
  XCircle,
} from 'lucide-react';
import type {
  KondisiAlat,
  Mapel,
  StatusBahanKimia,
  StatusPengajuan,
} from '../types/database';

export function KondisiBadge({ kondisi }: { kondisi: KondisiAlat }) {
  if (kondisi === 'baik') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-medium whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        Baik
      </span>
    );
  }
  if (kondisi === 'rusak_ringan') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-amber-200 bg-amber-50 text-amber-800 text-xs font-medium whitespace-nowrap">
        <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        Rusak Ringan
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-red-200 bg-red-50 text-red-800 text-xs font-medium whitespace-nowrap">
      <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
      Rusak Berat
    </span>
  );
}

export function StatusBahanBadge({ status }: { status: StatusBahanKimia }) {
  if (status === 'aman') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-medium whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        Aman
      </span>
    );
  }
  if (status === 'stok_menipis') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-amber-300 bg-amber-50 text-amber-900 text-xs font-medium whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        Stok Menipis
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-red-300 bg-red-50 text-red-800 text-xs font-medium whitespace-nowrap">
      <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" />
      Kadaluarsa
    </span>
  );
}

export function StatusPengajuanBadge({
  status,
  pengembalianDiajukan,
}: {
  status: StatusPengajuan;
  pengembalianDiajukan?: boolean;
}) {
  if (pengembalianDiajukan && (status === 'disetujui' || status === 'disetujui_sebagian')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-800 text-xs font-medium whitespace-nowrap">
        <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
        Menunggu Inspeksi
      </span>
    );
  }

  switch (status) {
    case 'menunggu':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-amber-200 bg-amber-50 text-amber-800 text-xs font-medium whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          Menunggu
        </span>
      );
    case 'disetujui':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-sky-200 bg-sky-50 text-sky-800 text-xs font-medium whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          Disetujui
        </span>
      );
    case 'disetujui_sebagian':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-blue-200 bg-blue-50 text-blue-800 text-xs font-medium whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          Disetujui Sebagian
        </span>
      );
    case 'ditolak':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-red-200 bg-red-50 text-red-800 text-xs font-medium whitespace-nowrap">
          <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
          Ditolak
        </span>
      );
    case 'selesai':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-medium whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          Selesai
        </span>
      );
    case 'dibatalkan':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-slate-200 bg-slate-100 text-slate-700 text-xs font-medium whitespace-nowrap">
          <Ban className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          Dibatalkan
        </span>
      );
  }
}

export function MapelLabel({ mapel }: { mapel: Mapel }) {
  if (mapel === 'fisika') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-blue-200 bg-blue-50 text-blue-800 text-xs font-medium whitespace-nowrap">
        Fisika
      </span>
    );
  }
  if (mapel === 'kimia') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-orange-200 bg-orange-50 text-orange-800 text-xs font-medium whitespace-nowrap">
        Kimia
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-medium whitespace-nowrap">
      Biologi
    </span>
  );
}
