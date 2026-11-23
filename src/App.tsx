/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { DashboardView } from './components/DashboardView';
import { InventarisView } from './components/InventarisView';
import { JadwalLabView } from './components/JadwalLabView';
import { LaporanView } from './components/LaporanView';
import { Layout } from './components/Layout';
import { LoginPage } from './components/LoginPage';
import { ModulPraktikumView } from './components/ModulPraktikumView';
import { PengajuanView } from './components/PengajuanView';
import { LabProvider, useLab } from './context/LabContext';

function AppShell() {
  const { currentUser, activePage } = useLab();

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <Layout>
      {activePage === 'dashboard' && <DashboardView />}
      {activePage === 'inventaris' && <InventarisView />}
      {activePage === 'pengajuan' && <PengajuanView />}
      {activePage === 'jadwal' && <JadwalLabView />}
      {activePage === 'modul' && <ModulPraktikumView />}
      {activePage === 'laporan' && <LaporanView />}
    </Layout>
  );
}

export default function App() {
  return (
    <LabProvider>
      <AppShell />
    </LabProvider>
  );
}
