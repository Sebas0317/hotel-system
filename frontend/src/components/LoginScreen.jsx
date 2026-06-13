import { useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, Eye, EyeOff, LogIn, UserPlus,
  ArrowLeft, Loader, CheckCircle, AlertCircle,
} from 'lucide-react';
import { loginAdmin, setAuthToken, registerUser } from '../services/api';
import HotelTitle from './HotelTitle';
import TwoFactorScreen from './TwoFactorScreen';
import ForgotPasswordScreen from './ForgotPasswordScreen';

// ── Animated Background ──

function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900"
        animate={{
          background: [
            'linear-gradient(135deg, #020617, #052e16, #0f172a)',
            'linear-gradient(135deg, #0f172a, #022c22, #020617)',
            'linear-gradient(135deg, #020617, #064e3b, #0f172a)',
            'linear-gradient(135deg, #0f172a, #052e16, #020617)',
          ],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(16,185,129,0.15)_0%,_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(52,211,153,0.1)_0%,_transparent_50%)]" />
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-3xl opacity-20"
          style={{
            width: `${300 + i * 200}px`,
            height: `${300 + i * 200}px`,
            background: `radial-gradient(circle, rgba(52,211,153,0.4), transparent)`,
          }}
          animate={{
            x: [0, 100, -50, 0],
            y: [0, -80, 60, 0],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{
            duration: 15 + i * 5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 3,
          }}
        />
      ))}
    </div>
  );
}

// ── Glass Card ──

function GlassCard({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-2xl shadow-black/40 ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-400/5 rounded-full blur-3xl pointer-events-none" />
      {children}
    </motion.div>
  );
}

// ── Animated Input ──

function AnimatedInput({
  icon: Icon,
  type = 'text',
  value,
  onChange,
  onKeyDown,
  placeholder,
  label,
  rightElement,
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      {label && (
        <motion.label
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="block text-xs font-medium text-white/50 mb-1.5 tracking-wide"
        >
          {label}
        </motion.label>
      )}
      <div className="relative group">
        {Icon && (
          <Icon className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${focused ? 'text-emerald-400' : 'text-white/30'}`} />
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className={`
            w-full bg-white/5 border rounded-xl text-white placeholder-white/20
            focus:outline-none transition-all duration-300
            ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-3
            ${focused ? 'border-emerald-500/60 shadow-[0_0_20px_-5px_rgba(52,211,153,0.3)]' : 'border-white/10 hover:border-white/20'}
          `}
        />
        <div className={`absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent scale-x-0 transition-transform duration-500 ${focused ? 'scale-x-100' : ''}`} />
        {rightElement}
      </div>
    </div>
  );
}

// ── Animated Button ──

function AnimatedButton({ onClick, disabled, loading, icon: Icon, children }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.02, boxShadow: '0 0 30px -5px rgba(52,211,153,0.4)' } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      className={`
        relative w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2
        transition-all duration-300 overflow-hidden group
        ${disabled
          ? 'bg-emerald-700/50 text-white/40 cursor-not-allowed'
          : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-900/30'
        }
      `}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.15),transparent_70%)] group-hover:opacity-80 transition-opacity" />
      {loading ? (
        <>
          <Loader className="w-5 h-5 animate-spin" />
          <span className="relative z-10">{children}</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="w-5 h-5 relative z-10" />}
          <span className="relative z-10">{children}</span>
        </>
      )}
    </motion.button>
  );
}

// ── Link with underline animation ──

function AnimatedLink({ onClick, icon: Icon, children, color = 'white/50' }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 3 }}
      className={`relative text-sm text-${color} hover:text-white/80 transition-colors duration-200 flex items-center gap-1 group`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      <span>{children}</span>
      <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-emerald-400/50 transition-all duration-300 group-hover:w-full" />
    </motion.button>
  );
}

// ── Error Banner ──

function ErrorBanner({ message }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      className="flex items-start gap-2 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-xl p-3"
    >
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-300" />
      <span>{message}</span>
    </motion.div>
  );
}

// ── Container variants for staggered children ──

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

// ── Login Routes ──

function RoleCards({ onSelectAdmin, onSelectUser }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <AnimatedBackground />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-[520px] w-full"
      >
        <GlassCard className="p-8 sm:p-10">
          <div className="text-center mb-8">
            <HotelTitle variant="login" />
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xs font-semibold uppercase tracking-[0.15em] text-white/40 mb-6 text-center"
          >
            Sistema de Gestion
          </motion.p>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-3"
          >
            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.01, y: -2 }}
              whileTap={{ scale: 0.99 }}
              onClick={onSelectAdmin}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left transition-all duration-300 hover:border-emerald-500/30 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-emerald-900/10"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-400/10 transition-all duration-500" />
              <span className="relative block text-lg sm:text-xl font-extrabold text-white mb-1">Admin</span>
              <span className="relative block text-sm text-white/40 group-hover:text-white/60 transition-colors">
                Gestion hotelera — Habitaciones, tarifas y reportes
              </span>
            </motion.button>
            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.01, y: -2 }}
              whileTap={{ scale: 0.99 }}
              onClick={onSelectUser}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left transition-all duration-300 hover:border-emerald-500/30 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-emerald-900/10"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-400/10 transition-all duration-500" />
              <span className="relative block text-lg sm:text-xl font-extrabold text-white mb-1">Recepcion</span>
              <span className="relative block text-sm text-white/40 group-hover:text-white/60 transition-colors">
                Registro de huespedes — Transacciones y check-out
              </span>
            </motion.button>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-xs text-white/30 text-center mt-6"
          >
            Sistema Interno — Conectividad Local
          </motion.p>
        </GlassCard>
      </motion.div>
    </div>
  );
}

function AdminLogin({ onBack, onRole }) {
  const [mode, setMode] = useState('login');
  const navigate = useNavigate();
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



  const switchMode = () => {
    setError('');
    setMode(mode === 'login' ? 'register' : 'login');
  };

  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <AnimatedBackground />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-[520px] w-full"
        >
          <GlassCard className="p-8 sm:p-10 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </motion.div>
            <h2 className="text-xl font-bold text-white mb-2">Registro exitoso</h2>
            <p className="text-white/50 mb-6">
              Se ha enviado un codigo de verificacion a <strong className="text-white/70">{registeredEmail}</strong>.
              Revisa tu bandeja de entrada para verificar tu correo.
            </p>
            <AnimatedButton onClick={() => { setRegistered(false); setIdentifier(email); setMode('login'); }}>
              Ir a iniciar sesion
            </AnimatedButton>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <AnimatedBackground />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-[420px] w-full"
      >
        <GlassCard className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <HotelTitle variant="login" />
          </div>

          <AnimatePresence mode="wait">
            {mode === 'login' ? (
              <motion.div
                key="login"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
              >
                <motion.p variants={itemVariants} className="text-xs font-semibold uppercase tracking-[0.15em] text-white/40 mb-6 text-center">
                  Inicio de sesion
                </motion.p>

                <motion.div variants={itemVariants} className="space-y-4">
                  <AnimatedInput
                    icon={Mail}
                    value={identifier}
                    onChange={e => { setIdentifier(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    placeholder="admin@ecobosque.com"
                    label="Usuario o correo"
                  />
                  <AnimatedInput
                    icon={Lock}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    placeholder="••••••••"
                    label="Contrasena"
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />
                </motion.div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                    >
                      <ErrorBanner message={error} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div variants={itemVariants} className="mt-6">
                  <AnimatedButton onClick={handleLogin} disabled={loading} loading={loading} icon={LogIn}>
                    {loading ? 'Autenticando...' : 'Iniciar sesion'}
                  </AnimatedButton>
                </motion.div>

                <motion.div variants={itemVariants} className="mt-4 flex flex-col items-center gap-3">
                  <AnimatedLink onClick={() => navigate('/forgot', { replace: true })}>
                    Olvide mi contrasena
                  </AnimatedLink>
                  <AnimatedLink onClick={switchMode} icon={UserPlus} color="emerald-400">
                    Crear nueva cuenta
                  </AnimatedLink>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="register"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
              >
                <motion.p variants={itemVariants} className="text-xs font-semibold uppercase tracking-[0.15em] text-white/40 mb-6 text-center">
                  Crear cuenta nueva
                </motion.p>

                <motion.div variants={itemVariants} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <AnimatedInput
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      placeholder="Juan"
                      label="Nombre"
                    />
                    <AnimatedInput
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      placeholder="Perez"
                      label="Apellido"
                    />
                  </div>
                  <AnimatedInput
                    icon={Mail}
                    value={username}
                    onChange={e => { setUsername(e.target.value); setError(''); }}
                    placeholder="juanperez"
                    label="Nombre de usuario"
                  />
                  <AnimatedInput
                    icon={Mail}
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    placeholder="juan@ejemplo.com"
                    label="Correo electronico"
                  />
                  <AnimatedInput
                    icon={Lock}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="Min. 8 caracteres"
                    label="Contrasena"
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />
                  <AnimatedInput
                    icon={Lock}
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                    placeholder="Repite la contrasena"
                    label="Confirmar contrasena"
                  />
                </motion.div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                    >
                      <ErrorBanner message={error} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div variants={itemVariants} className="mt-6">
                  <AnimatedButton onClick={handleRegister} disabled={loading} loading={loading} icon={UserPlus}>
                    {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                  </AnimatedButton>
                </motion.div>

                <motion.div variants={itemVariants} className="mt-4 text-center">
                  <AnimatedLink onClick={switchMode} icon={ArrowLeft}>
                    Ya tengo cuenta
                  </AnimatedLink>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 pt-4 border-t border-white/5"
          >
            <motion.button
              onClick={onBack}
              whileHover={{ x: -3 }}
              className="w-full py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 text-white/30 hover:text-white/60 hover:bg-white/[0.03] transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a seleccion de rol
            </motion.button>
          </motion.div>
        </GlassCard>
      </motion.div>
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
