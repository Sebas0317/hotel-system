import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { getAuthToken, setAuthToken } from './services/api';
import './App.css';

// Extracted components
import LoginScreen from './components/LoginScreen';
import PantallaAdmin from './components/PantallaAdmin';
import UserMenu from './components/UserMenu';
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
    navigate(r === 'admin' ? '/admin' : '/user', { replace: true });
  };

  const handleExit = () => {
    setRol(null);
    setAuthToken(null);
    navigate('/', { replace: true });
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          !rol ? (
            <LoginScreen onRol={handleRol} />
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
        path="/admin/reservations"
        element={
          rol === 'admin' ? (
            <PantallaReservaciones onNav={() => navigate('/admin', { replace: true })} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route
        path="/user"
        element={
          rol === 'user' ? (
            <UserMenu
              onNav={(screen) => navigate(`/user/${screen}`)}
              onExit={handleExit}
            />
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
        path="/user/room"
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
            <PantallaCheckout onNav={(screen) => navigate(`/user/${screen}`)} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route path="/landing/*" element={<LandingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
