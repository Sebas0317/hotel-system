import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { getAuthToken, setAuthToken } from './services/api';
import './App.css';

// Extracted components
import PantallaLogin from './components/PantallaLogin';
import PantallaAdmin from './components/PantallaAdmin';
import PantallaMenuUsuario from './components/PantallaMenuUsuario';
import PantallaCheckin from './components/PantallaCheckin';
import PantallaConsumo from './components/PantallaConsumo';
import PantallaVer from './components/PantallaVer';
import PantallaCheckout from './components/PantallaCheckout';
import PantallaReservaciones from './components/PantallaReservaciones';
import LandingPage from './landing/LandingPage';

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
    navigate(r === 'admin' ? '/admin' : '/usuario', { replace: true });
  };

  /**
   * Called from any screen's "Cerrar sesión" button.
   * Clears role state, removes auth token, and redirects to login.
   */
  const handleSalir = () => {
    setRol(null);
    setAuthToken(null);
    navigate('/', { replace: true });
  };

  return (
    <Routes>
      {/* Login — only show when no role is active; otherwise redirect */}
      <Route
        path="/"
        element={
          !rol ? (
            <PantallaLogin onRol={handleRol} />
          ) : (
            <Navigate to={rol === 'admin' ? '/admin' : '/usuario'} replace />
          )
        }
      />

      {/* Admin dashboard — protect from non-admin access */}
      <Route
        path="/admin"
        element={
          rol === 'admin' ? (
            <PantallaAdmin onSalir={handleSalir} onNav={(path) => navigate(path)} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      {/* Admin reservations — protect from non-admin access */}
      <Route
        path="/admin/reservaciones"
        element={
          rol === 'admin' ? (
            <PantallaReservaciones onNav={() => navigate('/admin', { replace: true })} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      {/* Reception screens — nested under /usuario */}
      <Route
        path="/usuario"
        element={
          rol === 'usuario' ? (
            <PantallaMenuUsuario
              onNav={(screen) => navigate(`/usuario/${screen}`)}
              onSalir={handleSalir}
            />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/usuario/checkin"
        element={
          rol === 'usuario' ? (
            <PantallaCheckin onNav={(screen) => navigate(`/usuario/${screen}`)} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/usuario/consumo"
        element={
          rol === 'usuario' ? (
            <PantallaConsumo onNav={(screen) => navigate(`/usuario/${screen}`)} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/usuario/ver"
        element={
          rol === 'usuario' ? (
            <PantallaVer onNav={(screen) => navigate(`/usuario/${screen}`)} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/usuario/checkout"
        element={
          rol === 'usuario' ? (
            <PantallaCheckout onNav={(screen) => navigate(`/usuario/${screen}`)} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      {/* Landing page — public site (must be before catch-all) */}
      <Route path="/landing/*" element={<LandingPage />} />

      {/* Catch-all — redirect unknown paths to login */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
