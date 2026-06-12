import { useState, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, LogIn, UserPlus,
  ArrowLeft, Loader, CheckCircle, AlertCircle, Send,
} from 'lucide-react';
import { loginAdmin, setAuthToken, registerUser, verify2FA, sendLoginCode } from '../services/api';
import HotelTitle from './HotelTitle';
import TwoFactorScreen from './TwoFactorScreen';
import ForgotPasswordScreen from './ForgotPasswordScreen';

// ── Login Routes ──

function RoleCards({ onSelectAdmin, onSelectUser }) {
  return (
    <div className="login-bg min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div className="login-container max-w-[520px] w-full">
        <div className="login-header mb-8 sm:mb-10">
          <HotelTitle variant="login" />
        </div>
        <p className="login-pregunta text-sm font-semibold uppercase tracking-wide mb-4">
          Eco Hotel El Bosque — Sistema de Gestion
        </p>
        <div className="login-cards flex flex-col gap-3 sm:gap-4 mb-8">
          <button className="login-card admin-card" onClick={onSelectAdmin}>
            <span className="lc-title text-lg sm:text-xl font-extrabold">Admin</span>
            <span className="lc-desc text-sm text-gray-500 sm:text-base">
              Acceso de gestion hotelera — Habitaciones, tarifas y reportes
            </span>
          </button>
          <button className="login-card user-card" onClick={onSelectUser}>
            <span className="lc-title text-lg sm:text-xl font-extrabold">Recepcion</span>
            <span className="lc-desc text-sm sm:text-base">
              Registro de huespedes — Transacciones y check-out
            </span>
          </button>
        </div>
        <p className="login-footer text-xs text-white/50 mb-4">Sistema Interno — Conectividad Local</p>
        <a href="/landing" className="login-landing-link block text-center mt-4 py-3 px-5 rounded-lg">
          Pagina web
        </a>
      </div>
    </div>
  );
}

function AdminLogin({ onBack, onRole }) {
  const [mode, setMode] = useState('login');
  const navigate = useNavigate();
  const codeInputsRef = useRef([]);
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [codeMode, setCodeMode] = useState(false);
  const [codeDigits, setCodeDigits] = useState(['','','','','','']);
  const [codeSent, setCodeSent] = useState(false);
  const [codeUserId, setCodeUserId] = useState(null);
  const [codeLoading, setCodeLoading] = useState(false);

  const safeErrorMessage = (e, fallback = 'Error de autenticacion') => {
    if (!e) return fallback;
    if (typeof e === 'string') return e;
    if (typeof e.message === 'string') return e.message;
    if (typeof e.error === 'string') return e.error;
    try {
      const serialized = JSON.stringify(e);
      return serialized && serialized !== '{}' ? serialized : fallback;
    } catch {
      return fallback;
    }
  };

  const handleLogin = async () => {
    if (!identifier.trim()) return setError('Ingresa tu usuario o correo');
    if (!password.trim()) return setError('Ingresa tu contrasena');
    setLoading(true);
    setError('');
    try {
      const result = await loginAdmin(identifier, password, '');
      if (result.requires2FA) {
        navigate(`/2fa/${result.userId}`, {
          state: { email: result.email, expiresIn: result.expiresIn },
          replace: true,
        });
        return;
      }
      setAuthToken(result.token);
      onRole('admin');
    } catch (e) {
      setError(safeErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!username.trim()) return setError('Ingresa un nombre de usuario');
    if (!email.trim()) return setError('Ingresa tu correo');
    if (!password.trim()) return setError('Ingresa una contrasena');
    if (password.length < 8) return setError('La contrasena debe tener al menos 8 caracteres');
    if (password !== confirmPassword) return setError('Las contrasenas no coinciden');

    setLoading(true);
    setError('');
    try {
      await registerUser({ username, email, password, firstName, lastName });
      setRegistered(true);
      setRegisteredEmail(email);
    } catch (e) {
      setError(safeErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!identifier.trim()) return setError('Ingresa tu usuario o correo');
    if (!password.trim()) return setError('Ingresa tu contrasena');
    setError('');
    setCodeLoading(true);
    try {
      const result = await sendLoginCode(identifier, password);
      setCodeUserId(result.userId);
      setCodeSent(true);
      setCodeMode(true);
      setError('');
    } catch (e) {
      setError(safeErrorMessage(e, 'Error al enviar codigo'));
    } finally {
      setCodeLoading(false);
    }
  };

  const handleCodeDigitChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;
    const digits = [...codeDigits];
    digits[index] = value;
    setCodeDigits(digits);
    setError('');

    if (value && index < 5) {
      const next = document.getElementById(`code-${index + 1}`);
      if (next) next.focus();
    }

    if (digits.every(d => d !== '')) {
      verifyCode(digits.join(''));
    }
  };

  const handleCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      const prev = document.getElementById(`code-${index - 1}`);
      if (prev) prev.focus();
    }
  };

  const handleCodePaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length === 6) {
      const digits = paste.split('');
      setCodeDigits(digits);
      verifyCode(paste);
    }
  };

  const verifyCode = async (code) => {
    if (!codeUserId) return;
    setCodeLoading(true);
    setError('');
    try {
      const result = await verify2FA(codeUserId, code);
      setAuthToken(result.token);
      onRole('admin');
    } catch (e) {
      setError(safeErrorMessage(e, 'Codigo invalido'));
      setCodeDigits(['','','','','','']);
      const first = document.getElementById('code-0');
      if (first) first.focus();
    } finally {
      setCodeLoading(false);
    }
  };

  const switchMode = () => {
    setError('');
    setMode(mode === 'login' ? 'register' : 'login');
  };

  if (registered) {
    return (
      <div className="login-bg min-h-screen flex items-center justify-center p-4">
        <div className="login-container max-w-[520px] w-full text-center">
          <div className="login-header mb-6">
            <HotelTitle variant="login" />
          </div>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Registro exitoso</h2>
          <p className="text-white/60 mb-6">
            Se ha enviado un codigo de verificacion a <strong className="text-white/80">{registeredEmail}</strong>.
            Revisa tu bandeja de entrada para verificar tu correo.
          </p>
          <button
            onClick={() => { setRegistered(false); setIdentifier(email); setMode('login'); }}
            className="w-full py-3 rounded-xl font-semibold bg-green-600 hover:bg-green-500 text-white transition-colors"
          >
            Ir a iniciar sesion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-bg min-h-screen flex items-center justify-center p-4">
      <div className="login-container max-w-[420px] w-full">
        <div className="login-header mb-6">
          <HotelTitle variant="login" />
        </div>

        {mode === 'login' ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-6 text-center">
              Inicio de sesion
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Usuario o correo</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={e => { setIdentifier(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    placeholder="admin@ecobosque.com"
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Contrasena</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-3 flex items-start gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!codeMode ? (
              <>
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all bg-green-600 hover:bg-green-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                  {loading ? 'Autenticando...' : 'Iniciar sesion'}
                </button>

                <div className="mt-3 text-center">
                  <button
                    onClick={handleSendCode}
                    disabled={codeLoading}
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center justify-center gap-1 mx-auto"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {codeLoading ? 'Enviando...' : 'Enviar codigo al correo'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-4">
                  <p className="text-sm text-white/60">
                    Ingresa el codigo de 6 digitos enviado a tu correo
                  </p>
                </div>

                <div className="flex justify-center gap-2 mb-4">
                  {codeDigits.map((digit, i) => (
                    <input
                      key={i}
                      id={`code-${i}`}
                      ref={el => codeInputsRef.current[i] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleCodeDigitChange(i, e.target.value)}
                      onKeyDown={e => handleCodeKeyDown(i, e)}
                      onPaste={i === 0 ? handleCodePaste : undefined}
                      className="w-12 h-14 text-center text-xl font-bold bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all"
                    />
                  ))}
                </div>

                {codeLoading && (
                  <div className="flex justify-center mb-3">
                    <Loader className="w-5 h-5 animate-spin text-green-400" />
                  </div>
                )}

                <div className="text-center">
                  <button
                    onClick={() => { setCodeMode(false); setCodeSent(false); setCodeUserId(null); setCodeDigits(['','','','','','']); }}
                    className="text-sm text-white/50 hover:text-white/80 transition-colors"
                  >
                    Volver al inicio de sesion
                  </button>
                </div>
              </>
            )}

            <div className="mt-4 flex flex-col items-center gap-2">
              <button
                onClick={() => navigate('/forgot', { replace: true })}
                className="text-sm text-white/50 hover:text-white/80 transition-colors"
              >
                Olvide mi contrasena
              </button>
              <button
                onClick={switchMode}
                className="text-sm text-green-400 hover:text-green-300 transition-colors flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Crear nueva cuenta
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-6 text-center">
              Crear cuenta nueva
            </p>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Nombre</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="Juan"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Apellido</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Perez"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Nombre de usuario</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => { setUsername(e.target.value); setError(''); }}
                    placeholder="juanperez"
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Correo electronico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    placeholder="juan@ejemplo.com"
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Contrasena</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="Min. 8 caracteres"
                    className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Confirmar contrasena</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                    placeholder="Repite la contrasena"
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-3 flex items-start gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all bg-green-600 hover:bg-green-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>

            <div className="mt-4 text-center">
              <button
                onClick={switchMode}
                className="text-sm text-green-400 hover:text-green-300 transition-colors flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Ya tengo cuenta
              </button>
            </div>
          </>
        )}

        <div className="mt-6 pt-4 border-t border-white/10">
          <button
            onClick={onBack}
            className="w-full py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/90 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a seleccion de rol
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 2FA Screen Route ──
function TwoFactorRoute({ onRole }) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const userId = params.userId;
  const state = location.state || {};

  const handleVerified = (token) => {
    setAuthToken(token);
    onRole('admin');
  };

  return (
    <TwoFactorScreen
      userId={userId}
      email={state.email}
      onVerified={handleVerified}
      onBack={() => navigate('/login/admin', { replace: true })}
    />
  );
}

// ── Forgot Password Route ──
function ForgotRoute() {
  const navigate = useNavigate();
  return <ForgotPasswordScreen onBack={() => navigate('/login/admin', { replace: true })} />;
}

// ── Main Login Router ──
export default function LoginScreen({ onRole }) {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  if (path === '/login/admin' || path.startsWith('/login/admin/')) {
    return <AdminLogin onRole={onRole} onBack={() => navigate('/login', { replace: true })} />;
  }

  if (path === '/login/forgot' || path === '/forgot') {
    return <ForgotRoute />;
  }

  if (path.startsWith('/login/2fa/') || path.startsWith('/2fa/')) {
    return <TwoFactorRoute onRole={onRole} />;
  }

  // Default: role selection
  return (
    <RoleCards
      onSelectAdmin={() => navigate('/login/admin', { replace: true })}
      onSelectUser={() => onRole('user')}
    />
  );
}
