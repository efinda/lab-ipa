import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialDatabaseState } from '../data/seedData';
import {
  addUserState,
  approvePengajuanState,
  checkScheduleConflict,
  completePengajuanState,
  computeChemicalStatus,
  computeMonthlyLabUsage,
  createPengajuanState,
  deleteUserState,
  rejectPengajuanState,
  requestReturnByGuruState,
  roleRequiresPassword,
  updateUserState,
  validateItemStock,
  verifyRolePassword,
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

test('verifikasi password login per role berjalan sesuai ketentuan', () => {
  assert.equal(roleRequiresPassword('kepala_lab'), true);
  assert.equal(roleRequiresPassword('guru_ipa'), true);
  assert.equal(roleRequiresPassword('kepsek_tu'), true);
  assert.equal(roleRequiresPassword('siswa'), false);

  assert.equal(verifyRolePassword('kepala_lab', '970145'), true);
  assert.equal(verifyRolePassword('kepala_lab', '@Sman5garut'), false);
  assert.equal(verifyRolePassword('kepala_lab', ''), false);

  assert.equal(verifyRolePassword('guru_ipa', '@Sman5garut'), true);
  assert.equal(verifyRolePassword('guru_ipa', '@sman5garut'), false);
  assert.equal(verifyRolePassword('guru_ipa', '970145'), false);

  assert.equal(verifyRolePassword('kepsek_tu', '@Sman5garut'), true);
  assert.equal(verifyRolePassword('kepsek_tu', 'salah'), false);

  assert.equal(verifyRolePassword('siswa', ''), true);
});

test('admin dapat menambah, mengedit, dan menghapus user guru, kepala sekolah, dan siswa dengan validasi', () => {
  const db0 = createInitialDatabaseState();

  // Tambah Guru IPA baru
  const addGuru = addUserState(db0, {
    nama_lengkap: 'Siti Aminah, S.Pd',
    email: 'siti.aminah@sman5garut.sch.id',
    role: 'guru_ipa',
    mapel: 'kimia',
    kelas: null,
    is_active: true,
  });
  assert.equal(addGuru.ok, true);
  assert.ok(addGuru.createdId);
  assert.equal(
    addGuru.state.users.find((u) => u.id === addGuru.createdId)?.nama_lengkap,
    'Siti Aminah, S.Pd'
  );

  // Tambah Siswa baru
  const addSiswa = addUserState(addGuru.state, {
    nama_lengkap: 'Farhan Maulana',
    email: 'farhan.xi2@siswa.sman5garut.sch.id',
    role: 'siswa',
    mapel: null,
    kelas: 'XI IPA 2',
    is_active: true,
  });
  assert.equal(addSiswa.ok, true);
  const newSiswaId = addSiswa.createdId!;

  // Tambah Kepala Sekolah / TU baru
  const addKepsek = addUserState(addSiswa.state, {
    nama_lengkap: 'Drs. Wahyu Hidayat, M.Pd',
    email: 'wahyu.tu@sman5garut.sch.id',
    role: 'kepsek_tu',
    mapel: null,
    kelas: null,
    is_active: true,
  });
  assert.equal(addKepsek.ok, true);
  const newKepsekId = addKepsek.createdId!;

  // Tolak email duplikat
  const dupEmail = addUserState(addKepsek.state, {
    nama_lengkap: 'Duplikat',
    email: 'SITI.AMINAH@sman5garut.sch.id',
    role: 'siswa',
    mapel: null,
    kelas: 'X IPA 1',
    is_active: true,
  });
  assert.equal(dupEmail.ok, false);

  // Edit user siswa & kepala sekolah
  const editSiswa = updateUserState(
    addKepsek.state,
    newSiswaId,
    {
      nama_lengkap: 'Farhan Maulana Putra',
      email: 'farhan.xi2@siswa.sman5garut.sch.id',
      role: 'siswa',
      mapel: null,
      kelas: 'XII IPA 2',
      is_active: true,
    },
    'usr-kalab-1'
  );
  assert.equal(editSiswa.ok, true);
  assert.equal(
    editSiswa.state.users.find((u) => u.id === newSiswaId)?.nama_lengkap,
    'Farhan Maulana Putra'
  );
  assert.equal(editSiswa.state.users.find((u) => u.id === newSiswaId)?.kelas, 'XII IPA 2');

  // Guard: tidak bisa menghapus admin aktif sendiri atau satu-satunya admin
  const delSelf = deleteUserState(editSiswa.state, 'usr-kalab-1', 'usr-kalab-1');
  assert.equal(delSelf.ok, false);
  const delOnlyAdmin = deleteUserState(editSiswa.state, 'usr-kalab-1');
  assert.equal(delOnlyAdmin.ok, false);

  // Hapus guru, kepsek tambahan, dan siswa
  const delGuru = deleteUserState(editSiswa.state, addGuru.createdId!, 'usr-kalab-1');
  assert.equal(delGuru.ok, true);
  const delKepsek = deleteUserState(delGuru.state, newKepsekId, 'usr-kalab-1');
  assert.equal(delKepsek.ok, true);
  const delSiswa = deleteUserState(delKepsek.state, newSiswaId, 'usr-kalab-1');
  assert.equal(delSiswa.ok, true);
  assert.equal(delSiswa.state.users.length, db0.users.length);
});


