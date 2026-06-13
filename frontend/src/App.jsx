import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Component, useState, Suspense, lazy, useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getAuthToken, setAuthToken, clearRoomToken } from './services/api';
import { useSession } from './hooks/useSession';
import CybersecurityPanel from './components/CybersecurityPanel';
import './App.css';

// Create query client with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Lazy-loaded route components for code splitting
const LoginScreen = lazy(() => import('./components/LoginScreen'));
const PantallaAdmin = lazy(() => import('./components/PantallaAdmin'));
const UserView = lazy(() => import('./components/UserView'));
const UserCheckout = lazy(() => import('./components/UserCheckout'));
const PantallaCheckin = lazy(() => import('./components/PantallaCheckin'));
const PantallaConsumo = lazy(() => import('./components/PantallaConsumo'));
const PantallaVer = lazy(() => import('./components/PantallaVer'));
const PantallaCheckout = lazy(() => import('./components/PantallaCheckout'));
const PantallaReservaciones = lazy(() => import('./components/PantallaReservaciones'));

// EcoWeb landing page — converted to lazy for performance
const EcoWeb = lazy(() => import('./ecoweb/App'));
import './ecoweb/style/index.css';
import './ecoweb/style/fonts.css';

// Error boundary to catch rendering errors without white-screening the app
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

// Wrapper around Navigate that defers navigation to avoid render-phase router updates
function SafeNavigate({ to, replace = true }) {
  const navigate = useNavigate();
  useEffect(() => { navigate(to, { replace }); }, [navigate, to, replace]);
  return null;
}

// Loading fallback component with skeleton animation
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
 * App root — now driven by URL routes instead of local state.
 *
 * Route map:
 *   /              → Login screen (role selection)
 *   /admin         → Admin dashboard
 *   /usuario       → Reception menu
 *   /usuario/checkin   → Check-in screen
 *   /usuario/consumo   → Register consumption
 *   /usuario/ver       → View room details
 *   /usuario/checkout  → Check-out screen
 *
 * A shared `rol` state is kept so the app knows which role is active,
 * but navigation is delegated to React Router via `useNavigate`.
 * Admin sessions are persisted via JWT token in localStorage.
 */
export default function App() {
  const [rol, setRol] = useState(() => {
    // Restore admin session from stored token
    return getAuthToken() ? 'admin' : null;
  });
  const navigate = useNavigate();

  // Clear stale token on mount (backend will reject expired tokens)

  /**
   * Called from the login screen when a role is selected.
   * Updates role state and navigates to the corresponding route.
   */
  const handleRol = (r) => {
    setRol(r);
    navigate(r === 'admin' ? '/admin' : '/user', { replace: true });
  };

  const handleExit = () => {
    setRol(null);
    setAuthToken(null);
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
        {/* Toast notifications provider */}
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
            !rol ? (
              <LoginScreen onRole={handleRol} />
            ) : (
              <SafeNavigate to={rol === 'admin' ? '/admin' : '/user'} replace />
            )
          }
        />

        {/* Login sub-routes — LoginScreen handles internal routing */}
        <Route
          path="/login/admin"
          element={!rol ? <LoginScreen onRole={handleRol} /> : <SafeNavigate to="/admin" replace />}
        />
        <Route
          path="/login/forgot"
          element={!rol ? <LoginScreen onRole={handleRol} /> : <SafeNavigate to="/admin" replace />}
        />
        <Route
          path="/forgot"
          element={!rol ? <LoginScreen onRole={handleRol} /> : <SafeNavigate to="/admin" replace />}
        />
        <Route
          path="/login/2fa/:userId"
          element={!rol ? <LoginScreen onRole={handleRol} /> : <SafeNavigate to="/admin" replace />}
        />
        <Route
          path="/2fa/:userId"
          element={!rol ? <LoginScreen onRole={handleRol} /> : <SafeNavigate to="/admin" replace />}
        />

        <Route
          path="/admin"
          element={
            rol === 'admin' ? (
              <PantallaAdmin onSalir={handleExit} onNav={(path) => navigate(path)} />
            ) : (
              <SafeNavigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            rol === 'admin' ? (
              <PantallaAdmin onSalir={handleExit} onNav={(path) => navigate(path)} />
            ) : (
              <SafeNavigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin/room/:roomId"
          element={
            rol === 'admin' ? (
              <PantallaAdmin onSalir={handleExit} onNav={(path) => navigate(path)} />
            ) : (
              <SafeNavigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin/register"
          element={
            rol === 'admin' ? (
              <PantallaAdmin onSalir={handleExit} onNav={(path) => navigate(path)} />
            ) : (
              <SafeNavigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin/register/checkin"
          element={
            rol === 'admin' ? (
              <PantallaAdmin onSalir={handleExit} onNav={(path) => navigate(path)} />
            ) : (
              <SafeNavigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin/register/new"
          element={
            rol === 'admin' ? (
              <PantallaAdmin onSalir={handleExit} onNav={(path) => navigate(path)} />
            ) : (
              <SafeNavigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin/transactions"
          element={
            rol === 'admin' ? (
              <PantallaAdmin onSalir={handleExit} onNav={(path) => navigate(path)} />
            ) : (
              <SafeNavigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin/reservations"
          element={
            rol === 'admin' ? (
              <PantallaAdmin onSalir={handleExit} onNav={(path) => navigate(path)} />
            ) : (
              <SafeNavigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin/accounting"
          element={
            rol === 'admin' ? (
              <PantallaAdmin onSalir={handleExit} onNav={(path) => navigate(path)} />
            ) : (
              <SafeNavigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin/prices"
          element={
            rol === 'admin' ? (
              <PantallaAdmin onSalir={handleExit} onNav={(path) => navigate(path)} />
            ) : (
              <SafeNavigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin/users"
          element={
            rol === 'admin' ? (
              <PantallaAdmin onSalir={handleExit} onNav={(path) => navigate(path)} />
            ) : (
              <SafeNavigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin/history"
          element={
            rol === 'admin' ? (
              <PantallaAdmin onSalir={handleExit} onNav={(path) => navigate(path)} />
            ) : (
              <SafeNavigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin/security"
          element={
            rol === 'admin' ? (
              <PantallaAdmin onSalir={handleExit} onNav={(path) => navigate(path)} />
            ) : (
              <SafeNavigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin/reservaciones"
          element={
            rol === 'admin' ? (
              <PantallaAdmin onSalir={handleExit} onNav={(path) => navigate(path)} />
            ) : (
              <SafeNavigate to="/" replace />
            )
          }
        />

        <Route
          path="/user"
          element={
            rol === 'user' ? (
              <UserView onExit={handleExit} />
            ) : (
              <SafeNavigate to="/" replace />
            )
          }
        />
        <Route
          path="/user/register"
          element={
            rol === 'user' ? (
              <PantallaCheckin onNav={(screen) => navigate(`/user/${screen}`)} />
            ) : (
              <SafeNavigate to="/" replace />
            )
          }
        />
        <Route
          path="/user/transactions"
          element={
            rol === 'user' ? (
              <PantallaConsumo onNav={(screen) => navigate(`/user/${screen}`)} />
            ) : (
              <SafeNavigate to="/" replace />
            )
          }
        />
        <Route
          path="/user/ver"
          element={
            rol === 'user' ? (
              <PantallaVer onNav={(screen) => navigate(`/user/${screen}`)} />
            ) : (
              <SafeNavigate to="/" replace />
            )
          }
        />
        <Route
          path="/user/checkout"
          element={
            rol === 'user' ? (
              <UserCheckout onExit={handleExit} />
            ) : (
              <SafeNavigate to="/" replace />
            )
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
