import { AlertCircle, ArrowRight, Key, Shield } from 'lucide-react';
import { useState } from 'react';
import { setRoomToken, validarPin } from '../services/api';

export default function PinGate({
  onAccess,
  onBack,
  title = 'Acceso a Habitacion',
  description = 'Ingresa el numero de habitacion y PIN que recibiste al hacer check-in',
}) {
  const [numero, setNumero] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!numero.trim() || !pin.trim())
      return setError('Ingresa numero de habitacion y PIN');
    setLoading(true);
    setError('');
    try {
      const data = await validarPin(numero.trim(), pin.trim());
      setRoomToken(data.roomToken);
      onAccess(data.room);
    } catch (e) {
      setError(e.message || 'PIN o numero de habitacion incorrecto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/60 p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200/30">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          </div>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-full py-2.5 mb-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all duration-300 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 border-none cursor-pointer"
            >
              ← Volver al inicio
            </button>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Numero de habitacion
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={numero}
                  onChange={(e) => {
                    setNumero(e.target.value);
                    setError('');
                  }}
                  placeholder="Ej: 101"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-200/60 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                PIN de la habitacion
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    setError('');
                  }}
                  placeholder="6 digitos"
                  maxLength={6}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-200/60 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-200 tracking-[0.3em] text-center font-bold"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50/80 border border-red-200/60 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-300 bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-200/30 hover:shadow-xl hover:shadow-emerald-200/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ArrowRight className="w-5 h-5" />
              )}
              {loading ? 'Verificando...' : 'Acceder a mi habitacion'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}