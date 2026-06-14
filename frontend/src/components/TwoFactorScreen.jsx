import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Loader,
  Shield,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { verify2FA } from '../services/api';
import HotelTitle from './HotelTitle';

export default function TwoFactorScreen({ userId, onVerified, onBack, email }) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError('');
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') handleVerify();
  };

  const handlePaste = (e) => {
    const paste = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6);
    if (paste.length === 6) {
      const newCode = paste.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Ingresa el codigo de 6 digitos');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await verify2FA(userId, fullCode);
      setSuccess(true);
      await new Promise((r) => setTimeout(r, 1200));
      onVerified(null, result.usuario);
    } catch (e) {
      setError(e.message || 'Codigo invalido o expirado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg min-h-screen flex items-center justify-center p-4">
      <div className="login-container max-w-[420px] w-full">
        <div className="login-header mb-6">
          <HotelTitle variant="login" />
        </div>

        {success ? (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center animate-bounce">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <p className="text-lg font-bold text-green-400 text-center mb-2">
              Acceso exitoso
            </p>
            <p className="text-sm text-white/60 text-center">
              Redirigiendo al panel de control...
            </p>
          </>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
                <Shield className="w-7 h-7 text-green-400" />
              </div>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-2 text-center">
              Verificacion en dos pasos
            </p>
            <p className="text-sm text-white/60 text-center mb-6">
              Ingresa el codigo de 6 digitos enviado a
              {email ? ` ${email}` : ' tu correo'}
            </p>

            <div className="flex justify-center gap-2.5 mb-6">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="w-11 h-13 text-center text-2xl font-bold rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/50 transition-all"
                />
              ))}
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all bg-green-600 hover:bg-green-500 text-white disabled:opacity-50"
            >
              {loading ? <Loader className="w-5 h-5 animate-spin" /> : null}
              {loading ? 'Verificando...' : 'Verificar codigo'}
            </button>

            <div className="mt-4 pt-4 border-t border-white/10">
              <button
                onClick={onBack}
                className="w-full py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/90 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
