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
import { AuthStateProvider, useAuth } from './state/AuthState';

/** 등록된 사람도 없고 로그인도 안 했으면 첫 화면으로. 로그인은 했는데 아직 서버에서
 * 받아온 사람이 없으면(새 가족 그룹 등) 통과시키고, 설정 탭은 로그인하러 갈 수 있게 항상 열어 둔다 */
function TabsLayout() {
  const { profiles } = useApp();
  const { account } = useAuth();
  const { pathname } = useLocation();
  if (profiles.length === 0 && !account && pathname !== '/settings') return <Navigate to="/welcome" replace />;
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
