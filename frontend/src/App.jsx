import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useState, Suspense, lazy } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getAuthToken, setAuthToken } from './services/api';
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

// Page transition wrapper component
function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
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
    navigate('/', { replace: true });
  };

  const location = useLocation();

  return (
    <QueryClientProvider client={queryClient}>
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

      <Suspense fallback={<LoadingFallback />}>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            !rol ? (
              <LoginScreen onRole={handleRol} />
            ) : (
              <Navigate to={rol === 'admin' ? '/admin' : '/user'} replace />
            )
          }
        />

        <Route
          path="/admin"
          element={
            rol === 'admin' ? (
              <PantallaAdmin onSalir={handleExit} onNav={(path) => navigate(path)} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            rol === 'admin' ? (
              <PantallaAdmin onSalir={handleExit} onNav={(path) => navigate(path)} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin/room/:roomId"
          element={
            rol === 'admin' ? (
              <PantallaAdmin onSalir={handleExit} onNav={(path) => navigate(path)} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin/register"
          element={
            rol === 'admin' ? (
              <PantallaAdmin onSalir={handleExit} onNav={(path) => navigate(path)} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin/transactions"
          element={
            rol === 'admin' ? (
              <PantallaAdmin onSalir={handleExit} onNav={(path) => navigate(path)} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin/reservations"
          element={
            rol === 'admin' ? (
              <PantallaAdmin onSalir={handleExit} onNav={(path) => navigate(path)} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin/accounting"
          element={
            rol === 'admin' ? (
              <PantallaAdmin onSalir={handleExit} onNav={(path) => navigate(path)} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin/prices"
          element={
            rol === 'admin' ? (
              <PantallaAdmin onSalir={handleExit} onNav={(path) => navigate(path)} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin/history"
          element={
            rol === 'admin' ? (
              <PantallaAdmin onSalir={handleExit} onNav={(path) => navigate(path)} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin/reservaciones"
          element={
            rol === 'admin' ? (
              <PantallaAdmin onSalir={handleExit} onNav={(path) => navigate(path)} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/user"
          element={
            rol === 'user' ? (
              <UserView onExit={handleExit} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/user/register"
          element={
            rol === 'user' ? (
              <PantallaCheckin onNav={(screen) => navigate(`/user/${screen}`)} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/user/transactions"
          element={
            rol === 'user' ? (
              <PantallaConsumo onNav={(screen) => navigate(`/user/${screen}`)} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/user/ver"
          element={
            rol === 'user' ? (
              <PantallaVer onNav={(screen) => navigate(`/user/${screen}`)} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/user/checkout"
          element={
            rol === 'user' ? (
              <UserCheckout onExit={handleExit} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route path="/landing/*" element={<EcoWeb />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
        </AnimatePresence>
      </Suspense>
      </div>
    </QueryClientProvider>
  );
}
