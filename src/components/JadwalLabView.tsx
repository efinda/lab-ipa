import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import { useLab } from '../context/LabContext';
import type { JadwalLab } from '../types/database';
import { formatTanggalIndonesia } from '../utils/labLogic';

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const HARI_MINGGU = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

function getLabColorClasses(labId: string) {
  if (labId === 'lab-fisika') {
    return {
      chip: 'bg-blue-50 border-blue-200 text-blue-800',
      dot: 'bg-blue-600',
      label: 'Fisika',
    };
  }
  if (labId === 'lab-kimia') {
    return {
      chip: 'bg-orange-50 border-orange-200 text-orange-800',
      dot: 'bg-orange-500',
      label: 'Kimia',
    };
  }
  return {
    chip: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    dot: 'bg-emerald-600',
    label: 'Biologi',
  };
}

export function JadwalLabView() {
  const { db, openPengajuanDetail, currentUser } = useLab();

  // Default ke November 2026 di mana data praktikum aktif berada
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(10); // 0-indexed: 10 = November
  const [selectedDate, setSelectedDate] = useState('2026-11-23');
  const [filterLab, setFilterLab] = useState('all');

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayJs = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun..6=Sat
  const startOffset = firstDayJs === 0 ? 6 : firstDayJs - 1; // Monday first

  const filteredJadwal = useMemo(() => {
    return db.jadwal_lab.filter((j) => {
      if (j.status === 'dibatalkan') return false;
      if (filterLab !== 'all' && j.lab_id !== filterLab) return false;
      return true;
    });
  }, [db.jadwal_lab, filterLab]);

  const jadwalByDate = useMemo(() => {
    const map = new Map<string, JadwalLab[]>();
    for (const j of filteredJadwal) {
      const list = map.get(j.tanggal) ?? [];
      list.push(j);
      map.set(j.tanggal, list);
    }
    return map;
  }, [filteredJadwal]);

  const selectedDayBookings = useMemo(() => {
    const list = jadwalByDate.get(selectedDate) ?? [];
    return [...list].sort((a, b) => a.jam_mulai.localeCompare(b.jam_mulai));
  }, [jadwalByDate, selectedDate]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const calendarCells: (string | null)[] = [];
  for (let i = 0; i < startOffset; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push(iso);
  }
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  return (
    <div className="space-y-6">
      {/* Header & Legenda Warna */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Jadwal Pakai Laboratorium</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kalender bulanan pemakaian Lab Fisika (Biru), Lab Kimia (Oranye), dan Lab Biologi (Hijau).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 text-xs font-medium text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-lg">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-blue-600" />
              Fisika
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-orange-500" />
              Kimia
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600" />
              Biologi
            </span>
          </div>

          <select
            aria-label="Filter laboratorium"
            value={filterLab}
            onChange={(e) => setFilterLab(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700"
          >
            <option value="all">Semua Laboratorium</option>
            {db.labs.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nama_lab}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kalender Bulanan */}
        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              {NAMA_BULAN[viewMonth]} {viewYear}
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Bulan sebelumnya"
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewYear(2026);
                  setViewMonth(10);
                  setSelectedDate('2026-11-23');
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
              >
                Nov 2026
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Bulan berikutnya"
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[560px]">
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {HARI_MINGGU.map((hari) => (
                  <div
                    key={hari}
                    className="py-2.5 text-center text-xs font-semibold text-slate-600"
                  >
                    {hari}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-200">
                {calendarCells.map((iso, idx) => {
                  if (!iso) {
                    return <div key={`empty-${idx}`} className="min-h-[92px] bg-slate-50/60" />;
                  }
                  const dayNum = Number.parseInt(iso.slice(-2), 10);
                  const bookings = jadwalByDate.get(iso) ?? [];
                  const isSelected = iso === selectedDate;
                  const isToday = iso === '2026-11-23';

                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setSelectedDate(iso)}
                      className={`min-h-[92px] p-2 text-left align-top flex flex-col gap-1 transition-colors ${
                        isSelected
                          ? 'bg-[#0F2744]/5 ring-2 ring-inset ring-[#0F2744]'
                          : 'hover:bg-slate-50 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-xs font-mono tabular-nums font-semibold px-1.5 py-0.5 rounded ${
                            isToday
                              ? 'bg-[#0F2744] text-white'
                              : 'text-slate-700'
                          }`}
                        >
                          {dayNum}
                        </span>
                        {bookings.length > 0 && (
                          <span className="text-[10px] font-mono text-slate-500">
                            {bookings.length} sesi
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 w-full">
                        {bookings.slice(0, 2).map((b) => {
                          const clr = getLabColorClasses(b.lab_id);
                          return (
                            <div
                              key={b.id}
                              className={`px-1.5 py-0.5 rounded border text-[10px] font-medium truncate ${clr.chip}`}
                            >
                              {b.jam_mulai} {clr.label}
                            </div>
                          );
                        })}
                        {bookings.length > 2 && (
                          <div className="text-[10px] text-slate-500 font-medium pl-1">
                            +{bookings.length - 2} lainnya
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Detail Booking Tanggal Terpilih */}
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-[#0F2744]" />
                Detail Pemakaian Tanggal
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                {formatTanggalIndonesia(selectedDate)}
              </h3>
            </div>
          </div>

          {selectedDayBookings.length === 0 ? (
            <div className="py-8 px-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
              <p className="text-xs font-semibold text-slate-700">
                Belum ada booking lab pada tanggal ini
              </p>
              <p className="text-[11px] text-slate-500">
                Klik tanggal lain yang memiliki penanda jadwal atau ajukan peminjaman baru.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDayBookings.map((booking) => {
                const lab = db.labs.find((l) => l.id === booking.lab_id);
                const clr = getLabColorClasses(booking.lab_id);
                return (
                  <div
                    key={booking.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${clr.chip}`}
                      >
                        <span className={`w-2 h-2 rounded-xs ${clr.dot}`} />
                        {lab?.nama_lab ?? clr.label}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-600 uppercase">
                        {booking.status}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-900">{booking.kegiatan}</div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {booking.jam_mulai}–{booking.jam_selesai}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {lab?.lokasi}
                      </span>
                    </div>

                    {booking.pengajuan_id && currentUser?.role !== 'kepsek_tu' && (
                      <button
                        type="button"
                        onClick={() => openPengajuanDetail(booking.pengajuan_id!)}
                        className="text-[11px] font-semibold text-[#0F2744] hover:underline"
                      >
                        Lihat Detail Pengajuan
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
