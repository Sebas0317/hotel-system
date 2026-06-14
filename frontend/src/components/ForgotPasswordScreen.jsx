import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Loader,
  Lock,
  Mail,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  changePassword,
  requestPasswordRecovery,
  verifyRecoveryCode,
} from '../services/api';
import HotelTitle from './HotelTitle';

export default function ForgotPasswordScreen({ onBack }) {
  const [step, setStep] = useState('email');
  const [identifier, setIdentifier] = useState('');
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetToken, setResetToken] = useState(null);
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
      return () => clearInterval(t);
    }
  }, [cooldown]);

  const handleSolicitar = async () => {
    if (!identifier.trim()) return setError('Ingresa tu usuario o correo');
    setLoading(true);
    setError('');
    try {
      const _result = await requestPasswordRecovery(identifier);
      setStep('codigo');
      setCooldown(60);
    } catch (e) {
      setError(e.message || 'Error al enviar codigo');
    } finally {
      setLoading(false);
    }
  };

  const handleVerificarCodigo = async () => {
    if (codigo.length !== 6) {
      setError('Ingresa el codigo de 6 digitos');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await verifyRecoveryCode(identifier, codigo);
      if (result.puedeCambiar && result.resetToken) {
        setResetToken(result.resetToken);
        setStep('cambiar');
      }
    } catch (e) {
      setError(e.message || 'Codigo invalido');
    } finally {
      setLoading(false);
    }
  };

  const handleCambiar = async () => {
    if (nuevaContrasena.length < 8) {
      setError('La contrasena debe tener al menos 8 caracteres');
      return;
    }
    if (nuevaContrasena !== confirmarContrasena) {
      setError('Las contrasenas no coinciden');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await changePassword(nuevaContrasena, resetToken);
      setSuccess(true);
    } catch (e) {
      setError(e.message || 'Error al cambiar contrasena');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="login-bg min-h-screen flex items-center justify-center p-4">
        <div className="login-container max-w-[420px] w-full text-center">
          <div className="login-header mb-6">
            <HotelTitle variant="login" />
          </div>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Contrasena actualizada
          </h2>
          <p className="text-white/60 mb-6">
            Tu contrasena se ha cambiado exitosamente.
          </p>
          <button
            onClick={onBack}
            className="w-full py-3 rounded-xl font-semibold bg-green-600 hover:bg-green-500 text-white transition-colors"
          >
            Volver al inicio de sesion
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

        <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-6 text-center">
          Recuperacion de contrasena
        </p>

        {step === 'email' && (
          <div className="space-y-4">
            <p className="text-sm text-white/60 text-center">
              Ingresa tu usuario o correo para recibir un codigo de
              recuperacion.
            </p>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">
                Usuario o correo
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSolicitar()}
                  placeholder="admin@ecobosque.com"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleSolicitar}
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all bg-green-600 hover:bg-green-500 text-white disabled:opacity-50"
            >
              {loading ? <Loader className="w-5 h-5 animate-spin" /> : null}
              {loading ? 'Enviando...' : 'Enviar codigo'}
            </button>
          </div>
        )}

        {step === 'codigo' && (
          <div className="space-y-4">
            <p className="text-sm text-white/60 text-center">
              Ingresa el codigo de 6 digitos enviado a tu correo.
            </p>
            <div>
              <input
                type="text"
                inputMode="numeric"
                value={codigo}
                onChange={(e) => {
                  setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleVerificarCodigo()}
                placeholder="000000"
                maxLength={6}
                className="w-full text-center text-2xl tracking-[0.5em] px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleVerificarCodigo}
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all bg-green-600 hover:bg-green-500 text-white disabled:opacity-50"
            >
              {loading ? <Loader className="w-5 h-5 animate-spin" /> : null}
              {loading ? 'Verificando...' : 'Verificar codigo'}
            </button>

            <div className="text-center">
              <button
                onClick={handleSolicitar}
                disabled={cooldown > 0 || loading}
                className={`text-sm transition-colors ${cooldown > 0 ? 'text-white/30 cursor-not-allowed' : 'text-green-400 hover:text-green-300'}`}
              >
                {cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Reenviar codigo'}
              </button>
            </div>
          </div>
        )}

        {step === 'cambiar' && (
          <div className="space-y-4">
            <p className="text-sm text-white/60 text-center">
              Ingresa tu nueva contrasena.
            </p>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">
                Nueva contrasena
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="password"
                  value={nuevaContrasena}
                  onChange={(e) => {
                    setNuevaContrasena(e.target.value);
                    setError('');
                  }}
                  placeholder="Min. 8 caracteres"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">
                Confirmar contrasena
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="password"
                  value={confirmarContrasena}
                  onChange={(e) => {
                    setConfirmarContrasena(e.target.value);
                    setError('');
                  }}
                  placeholder="Repite la contrasena"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleCambiar}
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all bg-green-600 hover:bg-green-500 text-white disabled:opacity-50"
            >
              {loading ? <Loader className="w-5 h-5 animate-spin" /> : null}
              {loading ? 'Cambiando...' : 'Cambiar contrasena'}
            </button>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-white/10">
          <button
            onClick={onBack}
            className="w-full py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/90 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}
