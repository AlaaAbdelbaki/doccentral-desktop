// DocCentral app root: auth gate → SPA navigation between feature pages.
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import { LangProvider } from './lib/i18n.jsx';
import { startAutoSync } from './lib/sync.js';
import { onNavigateRequest } from './lib/nav.js';
import { onDataChanged } from './lib/dbx.js';
import { inventoryRepo, patientRepo } from './lib/repos.js';
import { SignInPage } from './pages/signin.jsx';
import { HomePage } from './pages/home.jsx';
import { CalendarPage } from './pages/calendar.jsx';
import { PatientsPage } from './pages/patients.jsx';
import { InvoicesPage } from './pages/invoices.jsx';
import { InventoryPage } from './pages/inventory.jsx';
import { DocumentsPage } from './pages/documents.jsx';
import { CloseoutPage } from './pages/closeout.jsx';
import { SettingsPage } from './pages/settings.jsx';

const PAGES = {
  home: HomePage, calendar: CalendarPage, patients: PatientsPage,
  invoices: InvoicesPage, docs: DocumentsPage, inventory: InventoryPage,
  closeout: CloseoutPage, settings: SettingsPage,
};

const Main = () => {
  const { loading, session, localUser } = useAuth();
  const [route, setRoute] = useState({ page: 'home', params: null });
  const [badges, setBadges] = useState({});

  useEffect(() => {
    window.dc.app.info().then((i) => {
      if (!i.initialPage) return;
      const [page, section] = i.initialPage.split(':');
      setRoute({ page, params: section ? { section } : null });
    });
    return onNavigateRequest((page, params) => setRoute({ page, params }));
  }, []);

  useEffect(() => {
    if (!session) return;
    startAutoSync(() => (session.dev ? null : session));
  }, [session]);

  useEffect(() => {
    if (!session || !localUser) return;
    const load = async () => {
      const low = await inventoryRepo.lowStock();
      const owed = await patientRepo.outstanding();
      setBadges({ inventory: low.length, invoices: owed.length });
    };
    load();
    return onDataChanged(load);
  }, [session, localUser]);

  if (loading) {
    return (
      <div className="auth-wrap">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="side-brand-mark" style={{ width: 38, height: 38, fontSize: 22 }}>D</div>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--ink-500)' }}>Loading DocCentral…</span>
        </div>
      </div>
    );
  }
  if (!session || !localUser) return <SignInPage/>;

  const Page = PAGES[route.page] || HomePage;
  const onNavigate = (page, params = null) => setRoute({ page, params });
  return <Page onNavigate={onNavigate} params={route.params} badges={badges} key={route.page + JSON.stringify(route.params)}/>;
};

export const App = () => (
  <LangProvider>
    <AuthProvider>
      <Main/>
    </AuthProvider>
  </LangProvider>
);
