import { useEffect } from 'react';
import { HashRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { TabBar } from './components/ui';
import About from './pages/About';
import DrawEntry from './pages/DrawEntry';
import Profile from './pages/Profile';
import Saju from './pages/Saju';
import Settings from './pages/Settings';
import ThisWeek from './pages/ThisWeek';
import TicketNew from './pages/TicketNew';
import Tickets from './pages/Tickets';
import Welcome from './pages/Welcome';
import { AppStateProvider, useApp } from './state/AppState';
import { AuthStateProvider } from './state/AuthState';

/** 등록된 사람이 없으면 첫 화면으로 */
function TabsLayout() {
  const { profiles } = useApp();
  if (profiles.length === 0) return <Navigate to="/welcome" replace />;
  return (
    <>
      <Outlet />
      <TabBar />
    </>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <AuthStateProvider>
      <AppStateProvider>
        <HashRouter>
          <ScrollToTop />
          <div className="app">
            <Routes>
              <Route element={<TabsLayout />}>
                <Route index element={<ThisWeek />} />
                <Route path="saju" element={<Saju />} />
                <Route path="tickets" element={<Tickets />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="welcome" element={<Welcome />} />
              <Route path="profile" element={<Profile />} />
              <Route path="ticket-new" element={<TicketNew />} />
              <Route path="draw-entry/:round" element={<DrawEntry />} />
              <Route path="about" element={<About />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </HashRouter>
      </AppStateProvider>
    </AuthStateProvider>
  );
}
