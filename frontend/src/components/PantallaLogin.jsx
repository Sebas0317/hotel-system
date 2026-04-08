import { useState } from 'react';
import { loginAdmin, setAuthToken } from '../services/api';
import HotelTitle from './HotelTitle';

/**
 * Login screen - Entry point for role selection
 * Admin role requires password authentication.
 * Reception role is open (no password required).
 */
export default function PantallaLogin({ onRol }) {
  const [adminPassword, setAdminPassword] = useState('');
  const [adminMode, setAdminMode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async () => {
    if (!adminPassword.trim()) {
      return setError('Ingresa la contraseña de administrador');
    }
    setLoading(true);
    setError('');
    try {
      const { token } = await loginAdmin(adminPassword);
      setAuthToken(token);
      onRol('admin');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (adminMode) {
    return (
      <div className="login-bg min-h-screen flex items-center justify-center p-4">
        <div className="login-container max-w-[520px] w-full">
          <div className="login-header mb-8 sm:mb-10">
            <div className="login-logo text-7xl block mb-3">🏨</div>
            <HotelTitle variant="login" />
          </div>
          <p className="login-pregunta text-sm font-semibold uppercase tracking-wide mb-4">Contraseña de Administrador</p>
          <div className="login-admin-form max-w-[360px] mx-auto mb-6">
            <input
              type="password"
              className="login-password-input w-full px-4 py-3 rounded-xl border-2 border-white/30 bg-white/15 text-white text-base placeholder-white/50 focus:outline-none focus:border-white/60 focus:bg-white/20 transition-all"
              placeholder="Ingresa la contraseña"
              value={adminPassword}
              onChange={(e) => { setAdminPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdminLogin(); }}
              autoFocus
            />
            {error && <div className="login-error text-sm mt-3">⚠️ {error}</div>}
            <div className="login-admin-btns flex flex-col gap-2 mt-4">
              <button className="login-btn-primary px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold transition-colors hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed" onClick={handleAdminLogin} disabled={loading}>
                {loading ? 'Verificando...' : '🔓 Ingresar como Admin'}
              </button>
              <button className="login-btn-secondary px-6 py-3 rounded-xl border-2 border-white/30 bg-transparent text-white font-medium transition-colors hover:bg-white/10" onClick={() => { setAdminMode(false); setAdminPassword(''); setError(''); }}>
                ← Volver
              </button>
            </div>
          </div>
          <p className="login-footer text-xs text-white/50">Red local · Sin conexión a internet requerida</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-bg min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div className="login-container max-w-[520px] w-full">
        <div className="login-header mb-8 sm:mb-10">
          <div className="login-logo text-7xl block mb-3">🏨</div>
          <HotelTitle variant="login" />
        </div>
        <p className="login-pregunta text-sm font-semibold uppercase tracking-wide mb-4">¿Cómo deseas ingresar?</p>
        <div className="login-cards flex flex-col gap-3 sm:gap-4 mb-8">
          <button className="login-card admin-card text-left p-5 sm:p-6" onClick={() => setAdminMode(true)}>
            <span className="lc-icon text-3xl sm:text-4xl">🗂️</span>
            <span className="lc-title text-lg sm:text-xl font-extrabold">Administrador</span>
            <span className="lc-desc text-sm text-gray-500 sm:text-base">Panel de control · Estado de habitaciones · Gestión completa</span>
            <span className="lc-arrow absolute right-5 sm:right-6 top-1/2 -translate-y-1/2 text-xl sm:text-2xl">→</span>
          </button>
          <button className="login-card user-card text-left p-5 sm:p-6" onClick={() => onRol('usuario')}>
            <span className="lc-icon text-3xl sm:text-4xl">🛎️</span>
            <span className="lc-title text-lg sm:text-xl font-extrabold">Recepción / Usuario</span>
            <span className="lc-desc text-sm sm:text-base">Check-in · Consumos · Check-out · Consultas</span>
            <span className="lc-arrow absolute right-5 sm:right-6 top-1/2 -translate-y-1/2 text-xl sm:text-2xl">→</span>
          </button>
        </div>
        <p className="login-footer text-xs text-white/50 mb-4">Red local · Sin conexión a internet requerida</p>
        <a href="/landing" className="login-landing-link block text-center mt-4 py-3 px-5 rounded-lg">🌿 Visitar Eco Hotel El Bosque</a>
      </div>
    </div>
  );
}
