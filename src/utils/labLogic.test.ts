import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialDatabaseState } from '../data/seedData';
import {
  approvePengajuanState,
  checkScheduleConflict,
  completePengajuanState,
  computeChemicalStatus,
  computeMonthlyLabUsage,
  createPengajuanState,
  rejectPengajuanState,
  requestReturnByGuruState,
  validateItemStock,
} from './labLogic';

test('seed data memenuhi jumlah minimal alat, bahan, template, dan pengajuan', () => {
  const db = createInitialDatabaseState();
  const fisika = db.alat.filter((a) => a.lab_id === 'lab-fisika');
  const kimia = db.alat.filter((a) => a.lab_id === 'lab-kimia');
  const biologi = db.alat.filter((a) => a.lab_id === 'lab-biologi');

  assert.ok(fisika.length >= 20, `Alat Fisika ${fisika.length} < 20`);
  assert.ok(kimia.length >= 15, `Alat Kimia ${kimia.length} < 15`);
  assert.ok(biologi.length >= 15, `Alat Biologi ${biologi.length} < 15`);
  assert.ok(db.bahan_kimia.length >= 10, `Bahan kimia ${db.bahan_kimia.length} < 10`);
  assert.ok(db.praktikum.length >= 8, `Template praktikum ${db.praktikum.length} < 8`);
  assert.ok(db.pengajuan.length >= 10, `Pengajuan ${db.pengajuan.length} < 10`);
});

test('computeChemicalStatus mendeteksi kadaluarsa < 30 hari dan stok_menipis < 10%', () => {
  assert.equal(computeChemicalStatus(1000, 500, '2026-12-10', '2026-11-23'), 'kadaluarsa');
  assert.equal(computeChemicalStatus(1000, 90, '2027-08-01', '2026-11-23'), 'stok_menipis');
  assert.equal(computeChemicalStatus(1000, 100, '2027-08-01', '2026-11-23'), 'aman');
});

test('cek stok real-time dan jadwal bentrok menolak pengajuan tidak valid', () => {
  const db = createInitialDatabaseState();

  const stockIssues = validateItemStock(
    [{ item_type: 'alat', item_id: 'alt-fis-01', jumlah: 999 }],
    db.alat,
    db.bahan_kimia
  );
  assert.equal(stockIssues.length, 1);
  assert.match(stockIssues[0].message, /Stok Tidak Cukup/);

  // pgj-003 sudah booked di lab-fisika tanggal 2026-11-23 jam 08:00-09:30
  const conflict = checkScheduleConflict(
    db.jadwal_lab,
    'lab-fisika',
    '2026-11-23',
    '08:30',
    '10:00'
  );
  assert.equal(conflict.conflict, true);
  assert.match(conflict.message ?? '', /Jadwal Bentrok/);

  const noConflictDifferentLab = checkScheduleConflict(
    db.jadwal_lab,
    'lab-kimia',
    '2026-11-23',
    '08:30',
    '10:00'
  );
  assert.equal(noConflictDifferentLab.conflict, false);
});

test('alur lengkap: guru ajukan -> kepala lab setujui sebagian -> guru kembalikan -> inspeksi rusak mengurangi total', () => {
  const db0 = createInitialDatabaseState();
  const microscopeBefore = db0.alat.find((a) => a.id === 'alt-bio-01')!;
  const awalTersedia = microscopeBefore.jumlah_tersedia;
  const awalTotal = microscopeBefore.jumlah_total;

  // 1. Guru ajukan pengajuan baru
  const created = createPengajuanState(db0, {
    guru_id: 'usr-guru-bio',
    praktikum_id: 'prk-07',
    judul_praktikum: 'Praktikum Tambahan Sel X IPA 3',
    mapel: 'biologi',
    kelas: 'X IPA 3',
    lab_id: 'lab-biologi',
    tanggal_praktikum: '2026-11-29',
    jam_mulai: '08:00',
    jam_selesai: '09:30',
    catatan_guru: 'Mohon disiapkan.',
    items: [{ item_type: 'alat', item_id: 'alt-bio-01', jumlah: 8 }],
  });
  assert.equal(created.ok, true);
  assert.ok(created.createdId);
  const pgjId = created.createdId!;
  const detail = created.state.pengajuan_detail.find((d) => d.pengajuan_id === pgjId)!;

  // 2. Kepala Lab setujui sebagian (6 dari 8)
  const approved = approvePengajuanState(
    created.state,
    pgjId,
    'usr-kalab-1',
    { [detail.id]: 6 },
    '2026-11-23'
  );
  assert.equal(approved.ok, true);
  const pgjAfterApprove = approved.state.pengajuan.find((p) => p.id === pgjId)!;
  assert.equal(pgjAfterApprove.status, 'disetujui_sebagian');

  const microAfterApprove = approved.state.alat.find((a) => a.id === 'alt-bio-01')!;
  assert.equal(microAfterApprove.jumlah_tersedia, awalTersedia - 6);
  assert.equal(microAfterApprove.jumlah_dipinjam, microscopeBefore.jumlah_dipinjam + 6);

  const jadwalCreated = approved.state.jadwal_lab.find((j) => j.pengajuan_id === pgjId);
  assert.ok(jadwalCreated);
  assert.equal(jadwalCreated.status, 'booked');

  // 3. Guru klik Selesaikan & Kembalikan
  const requestedReturn = requestReturnByGuruState(approved.state, pgjId);
  assert.equal(requestedReturn.ok, true);
  assert.equal(
    requestedReturn.state.pengajuan.find((p) => p.id === pgjId)?.pengembalian_diajukan,
    true
  );

  // 4. Kepala Lab inspeksi pengembalian dengan 1 unit rusak ringan dari 6 unit
  const completed = completePengajuanState(
    requestedReturn.state,
    pgjId,
    [
      {
        detail_id: detail.id,
        jumlah_dikembalikan: 6,
        kondisi_kembali: 'rusak_ringan',
        jumlah_rusak: 1,
        catatan_kerusakan: 'Lensa okuler 1 unit tergores.',
      },
    ],
    '2026-11-23'
  );
  assert.equal(completed.ok, true);
  assert.equal(completed.state.pengajuan.find((p) => p.id === pgjId)?.status, 'selesai');
  assert.equal(completed.state.jadwal_lab.find((j) => j.pengajuan_id === pgjId)?.status, 'selesai');

  const microAfterComplete = completed.state.alat.find((a) => a.id === 'alt-bio-01')!;
  assert.equal(microAfterComplete.jumlah_dipinjam, microscopeBefore.jumlah_dipinjam);
  assert.equal(microAfterComplete.jumlah_total, awalTotal - 1);
  assert.equal(microAfterComplete.jumlah_tersedia, awalTersedia - 1);
  assert.equal(microAfterComplete.kondisi, 'rusak_ringan');
});

test('penolakan wajib mengisi alasan_penolakan dan tidak mengubah stok', () => {
  const db0 = createInitialDatabaseState();
  const resEmpty = rejectPengajuanState(db0, 'pgj-005', 'usr-kalab-1', '   ');
  assert.equal(resEmpty.ok, false);

  const resValid = rejectPengajuanState(db0, 'pgj-005', 'usr-kalab-1', 'Mikroskop sedang diservis.');
  assert.equal(resValid.ok, true);
  const pgj = resValid.state.pengajuan.find((p) => p.id === 'pgj-005')!;
  assert.equal(pgj.status, 'ditolak');
  assert.equal(pgj.alasan_penolakan, 'Mikroskop sedang diservis.');
  assert.deepEqual(resValid.state.alat, db0.alat);
});

test('computeMonthlyLabUsage menghitung pemakaian per lab per bulan', () => {
  const db = createInitialDatabaseState();
  const usage = computeMonthlyLabUsage(db.jadwal_lab, db.labs, 2026);
  const nov = usage.find((u) => u.monthKey === '2026-11');
  assert.ok(nov);
  assert.ok(nov.total >= 5);
});
