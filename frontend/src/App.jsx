
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import CybersecurityPanel from './components/CybersecurityPanel';
import ProtectedRoute from './components/ProtectedRoute';
import { useSession } from './hooks/useSession';
import {
  logout as apiLogout,
  clearRoomToken,
  getUserInfo,
} from './services/api';
import './App.css';

const LoginScreen = lazy(() => import('./components/LoginScreen'));
const UserView = lazy(() => import('./components/UserView'));
const UserCheckout = lazy(() => import('./components/UserCheckout'));
const PantallaCheckin = lazy(() => import('./components/PantallaCheckin'));
const PantallaConsumo = lazy(() => import('./components/PantallaConsumo'));
const PantallaVer = lazy(() => import('./components/PantallaVer'));
const _PantallaCheckout = lazy(() => import('./components/PantallaCheckout'));
const _PantallaReservaciones = lazy(
  () => import('./components/PantallaReservaciones')
);

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
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            fontFamily: 'sans-serif',
          }}
        >
          <h2>Algo salio mal</h2>
          <p style={{ color: '#6b7280', marginBottom: '20px' }}>
            Ocurrio un error inesperado. La sesion y datos no se perdieron.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: '10px 24px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
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
  useEffect(() => {
    navigate(to, { replace });
  }, [navigate, to, replace]);
  return null;
}

function LoadingFallback() {
  return (
    <div
      className="loading-fallback"
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontSize: '18px',
        color: '#6b7280',
      }}
    >
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

  const handleRol = useCallback((r) => {
    setRol(r);
  }, []);

  useEffect(() => {
    if (!rol) return;
    const path = rol === 'user' || rol === 'cliente' ? '/user' : '/admin';
    navigate(path, { replace: true });
  }, [rol, navigate]);

  const [showSessionModal, setShowSessionModal] = useState(false);

  const handleExit = useCallback(async () => {
    setRol(null);
    await apiLogout();
    clearRoomToken();
    setShowSessionModal(false);
    navigate('/', { replace: true });
  }, [navigate]);

  const warnedRef = useRef(false);

  const { isWarning, reset: resetSession } = useSession({
    timeout: 10 * 60 * 1000,
    onExpire: () => setShowSessionModal(true),
    enabled: !!rol,
  });

  const handleKeepSession = () => {
    setShowSessionModal(false);
    resetSession();
  };

  useEffect(() => {
    if (isWarning && !warnedRef.current) {
      warnedRef.current = true;
      toast.warning('Sesion por expirar', {
        description:
          'Tu sesion se cerrara en 1 minuto por inactividad. Mueve el mouse o presiona una tecla para mantenerla activa.',
        duration: 60000,
      });
    }
    if (!isWarning) warnedRef.current = false;
  }, [isWarning]);

  return (
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

        {showSessionModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.5)',
              fontFamily: 'sans-serif',
            }}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '400px',
                width: '90%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              }}
            >
              <h3
                style={{ margin: '0 0 8px', fontSize: '18px', color: '#111' }}
              >
                Sesion expirada
              </h3>
              <p
                style={{
                  margin: '0 0 20px',
                  fontSize: '14px',
                  color: '#6b7280',
                }}
              >
                Tu sesion ha expirado por inactividad. Los datos no guardados se
                perderan.
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  onClick={handleExit}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    color: '#374151',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Cerrar sesion
                </button>
                <button
                  onClick={handleKeepSession}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Mantener sesion
                </button>
              </div>
            </div>
          </div>
        )}

        <CybersecurityPanel />

        <Suspense fallback={<LoadingFallback />}>
          <Routes>
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
                <Route
                  path="users"
                  element={<PantallaUsuarios userRole={rol} />}
                />
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
                    <PantallaCheckin
                      onNav={(screen) => navigate(`/user/${screen}`)}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/user/transactions"
                element={
                  <ProtectedRoute rol={rol} allowed="user">
                    <PantallaConsumo
                      onNav={(screen) => navigate(`/user/${screen}`)}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/user/ver"
                element={
                  <ProtectedRoute rol={rol} allowed="user">
                    <PantallaVer
                      onNav={(screen) => navigate(`/user/${screen}`)}
                    />
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
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}
