import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Component, useState, Suspense, lazy, useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { logout as apiLogout, clearRoomToken, getUserInfo } from './services/api';
import { useSession } from './hooks/useSession';
import CybersecurityPanel from './components/CybersecurityPanel';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const LoginScreen = lazy(() => import('./components/LoginScreen'));
const UserView = lazy(() => import('./components/UserView'));
const UserCheckout = lazy(() => import('./components/UserCheckout'));
const PantallaCheckin = lazy(() => import('./components/PantallaCheckin'));
const PantallaConsumo = lazy(() => import('./components/PantallaConsumo'));
const PantallaVer = lazy(() => import('./components/PantallaVer'));
const PantallaCheckout = lazy(() => import('./components/PantallaCheckout'));
const PantallaReservaciones = lazy(() => import('./components/PantallaReservaciones'));

// Admin route components
const AdminShell = lazy(() => import('./components/AdminShell'));
const RoomsView = lazy(() => import('./components/RoomsView'));
const RegisterView = lazy(() => import('./components/RegisterView'));
const TransactionsView = lazy(() => import('./components/TransactionsView'));
const ReservationsView = lazy(() => import('./components/ReservationsView'));
const PricesView = lazy(() => import('./components/PricesView'));
const HistoryView = lazy(() => import('./components/HistoryView'));
const SecurityView = lazy(() => import('./components/SecurityView'));
const AccountingView = lazy(() => import('./components/AccountingView'));
const DashboardView = lazy(() => import('./components/DashboardView'));
const PantallaUsuarios = lazy(() => import('./components/PantallaUsuarios'));

const EcoWeb = lazy(() => import('./ecoweb/App'));
import './ecoweb/style/index.css';
import './ecoweb/style/fonts.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2>Algo salio mal</h2>
          <p style={{ color: '#6b7280', marginBottom: '20px' }}>
            Ocurrio un error inesperado. La sesion y datos no se perdieron.
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{
              padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none',
              borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
            }}
          >
            Recargar pagina
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function SafeNavigate({ to, replace = true }) {
  const navigate = useNavigate();
  useEffect(() => { navigate(to, { replace }); }, [navigate, to, replace]);
  return null;
}

function LoadingFallback() {
  return (
    <div className="loading-fallback" style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      fontSize: '18px',
      color: '#6b7280',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🌿</div>
        Cargando...
      </div>
    </div>
  );
}

/**
 * App root — route-driven navigation.
 *
 * Admin routes use nested layout via AdminShell:
 *   /admin              → RoomsView (index)
 *   /admin/dashboard    → AdminDashboard
 *   /admin/register     → RegisterView
 *   /admin/room/:roomId → RoomsView (with selected room)
 *   /admin/transactions → TransactionsView
 *   /admin/reservations → ReservationsView
 *   /admin/accounting   → AccountingView
 *   /admin/prices       → PricesView
 *   /admin/users        → PantallaUsuarios
 *   /admin/history      → HistoryView
 *   /admin/security     → SecurityView
 */
export default function App() {
  const [rol, setRol] = useState(() => {
    const userInfo = getUserInfo();
    return userInfo ? userInfo.role : null;
  });
  const navigate = useNavigate();

  const handleRol = (r) => {
    setRol(r);
    if (r === 'user' || r === 'cliente') {
      navigate('/user', { replace: true });
    } else {
      navigate('/admin', { replace: true });
    }
  };

  const handleExit = async () => {
    setRol(null);
    await apiLogout();
    clearRoomToken();
    navigate('/', { replace: true });
  };



  const location = useLocation();
  const warnedRef = useRef(false);

  const { isWarning } = useSession({
    timeout: 10 * 60 * 1000,
    onExpire: handleExit,
    enabled: !!rol,
  });

  useEffect(() => {
    if (isWarning && !warnedRef.current) {
      warnedRef.current = true;
      toast.warning('Sesion por expirar', {
        description: 'Tu sesion se cerrara en 1 minuto por inactividad. Mueve el mouse o presiona una tecla para mantenerla activa.',
        duration: 60000,
      });
    }
    if (!isWarning) warnedRef.current = false;
  }, [isWarning]);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
      <div>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '8px',
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      <CybersecurityPanel />

      <Suspense fallback={<LoadingFallback />}>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <ProtectedRoute rol={rol} allowed="guest">
              <LoginScreen onRole={handleRol} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/login/admin"
          element={
            <ProtectedRoute rol={rol} allowed="guest">
              <LoginScreen onRole={handleRol} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/login/forgot"
          element={
            <ProtectedRoute rol={rol} allowed="guest">
              <LoginScreen onRole={handleRol} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/forgot"
          element={
            <ProtectedRoute rol={rol} allowed="guest">
              <LoginScreen onRole={handleRol} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/login/2fa/:userId"
          element={
            <ProtectedRoute rol={rol} allowed="guest">
              <LoginScreen onRole={handleRol} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/2fa/:userId"
          element={
            <ProtectedRoute rol={rol} allowed="guest">
              <LoginScreen onRole={handleRol} />
            </ProtectedRoute>
          }
        />

        {/* ── Admin routes with nested layout ── */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute rol={rol} allowed="admin">
              <AdminShell rol={rol} onSalir={handleExit} />
            </ProtectedRoute>
          }
        >
          <Route index element={<RoomsView />} />
          <Route path="dashboard" element={<DashboardView />} />
          <Route path="register" element={<RegisterView />} />
          <Route path="room/:roomId" element={<RoomsView />} />
          <Route path="transactions" element={<TransactionsView />} />
          <Route path="reservations" element={<ReservationsView />} />
          <Route path="reservaciones" element={<ReservationsView />} />
          <Route path="accounting" element={<AccountingView />} />
          <Route path="prices" element={<PricesView />} />
          <Route path="users" element={<PantallaUsuarios userRole={rol} />} />
          <Route path="history" element={<HistoryView />} />
          <Route path="security" element={<SecurityView />} />
        </Route>

        <Route
          path="/user"
          element={
            <ProtectedRoute rol={rol} allowed="user">
              <UserView onExit={handleExit} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/register"
          element={
            <ProtectedRoute rol={rol} allowed="user">
              <PantallaCheckin onNav={(screen) => navigate(`/user/${screen}`)} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/transactions"
          element={
            <ProtectedRoute rol={rol} allowed="user">
              <PantallaConsumo onNav={(screen) => navigate(`/user/${screen}`)} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/ver"
          element={
            <ProtectedRoute rol={rol} allowed="user">
              <PantallaVer onNav={(screen) => navigate(`/user/${screen}`)} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/checkout"
          element={
            <ProtectedRoute rol={rol} allowed="user">
              <UserCheckout onExit={handleExit} />
            </ProtectedRoute>
          }
        />

        <Route path="/landing/*" element={<EcoWeb />} />
        <Route path="*" element={<SafeNavigate to="/" replace />} />
      </Routes>
        </AnimatePresence>
      </Suspense>
      </div>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
