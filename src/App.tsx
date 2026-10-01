import { useEffect } from 'react';
import { HashRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { TabBar } from './components/ui';
import About from './pages/About';
import AddNumber from './pages/AddNumber';
import DrawEntry from './pages/DrawEntry';
import Favorites from './pages/Favorites';
import Legal from './pages/Legal';
import Login from './pages/Login';
import PlusCompat from './pages/PlusCompat';
import PlusFamily from './pages/PlusFamily';
import PlusFavorite from './pages/PlusFavorite';
import Premium from './pages/Premium';
import Profile from './pages/Profile';
import Saju from './pages/Saju';
import Settings from './pages/Settings';
import Signup from './pages/Signup';
import Stats from './pages/Stats';
import ThisWeek from './pages/ThisWeek';
import TicketNew from './pages/TicketNew';
import Tickets from './pages/Tickets';
import Join from './pages/Join';
import { getPendingJoin } from './lib/familyLink';
import { AppStateProvider } from './state/AppState';
import { AuthStateProvider, useAuth } from './state/AuthState';
import { BillingStateProvider } from './state/BillingState';
import { FavoritesStateProvider } from './state/FavoritesState';

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

/** 토스 카드 등록창은 해시 없는 주소(?billing=...)로 돌아오므로 구독 화면으로 넘겨 준다 */
function BillingReturn() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('billing') && pathname !== '/premium') navigate('/premium', { replace: true });
  }, [pathname, navigate]);
  return null;
}

/** 로그인 전에 초대 링크를 열었다면, 로그인(가입)한 뒤 참여 화면으로 이어 준다 */
function PendingJoin() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { account } = useAuth();
  useEffect(() => {
    const code = getPendingJoin();
    if (account && code && !pathname.startsWith('/join')) navigate(`/join/${encodeURIComponent(code)}`, { replace: true });
  }, [account, pathname, navigate]);
  return null;
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
      <BillingStateProvider>
      <FavoritesStateProvider>
      <AppStateProvider>
        <HashRouter>
          <ScrollToTop />
          <BillingReturn />
          <PendingJoin />
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
              <Route path="premium" element={<Premium />} />
              <Route path="stats" element={<Stats />} />
              <Route path="favorites" element={<Favorites />} />
              <Route path="plus/compat" element={<PlusCompat />} />
              <Route path="plus/family" element={<PlusFamily />} />
              <Route path="plus/favorite" element={<PlusFavorite />} />
              <Route path="legal/:doc" element={<Legal />} />
              <Route path="ticket-new" element={<TicketNew />} />
              <Route path="draw-entry/:round" element={<DrawEntry />} />
              <Route path="about" element={<About />} />
              <Route path="join/:code" element={<Join />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </HashRouter>
      </AppStateProvider>
      </FavoritesStateProvider>
      </BillingStateProvider>
    </AuthStateProvider>
  );
}
