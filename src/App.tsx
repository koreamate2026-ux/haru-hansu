import { useEffect } from 'react';
import { HashRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { TabBar } from './components/ui';
import About from './pages/About';
import AddNumber from './pages/AddNumber';
import DrawEntry from './pages/DrawEntry';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Saju from './pages/Saju';
import Settings from './pages/Settings';
import Signup from './pages/Signup';
import ThisWeek from './pages/ThisWeek';
import TicketNew from './pages/TicketNew';
import Tickets from './pages/Tickets';
import { AppStateProvider } from './state/AppState';
import { AuthStateProvider, useAuth } from './state/AuthState';

/** 로그인한 계정이 없으면 로컬에 저장된 사람이 있어도 예외 없이 로그인 화면으로 보낸다 */
function TabsLayout() {
  const { account } = useAuth();
  if (!account) return <Navigate to="/login" replace />;
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
              <Route path="login" element={<Login />} />
              <Route path="welcome" element={<Navigate to="/login" replace />} />
              <Route path="signup" element={<Signup />} />
              <Route path="profile" element={<Profile />} />
              <Route path="add-number" element={<AddNumber />} />
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
