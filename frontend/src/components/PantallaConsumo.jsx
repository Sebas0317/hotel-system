import { useState, useCallback, useRef } from 'react';
import { validarPin, createConsumo } from '../services/api';
import { PRODUCTOS, CATEGORIAS_CONSUMO } from '../constants';
import { COP } from '../utils/helpers';
import PantallaForm from './PantallaForm';
import { AlertTriangle, CheckCircle, CreditCard } from 'lucide-react';
import { Turnstile } from 'react-turnstile';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x0000000000000000000000000000000AA';

/**
 * Consumption registration screen - Two-step flow:
 * Step 1: Validate room with PIN
 * Step 2: Select product from catalog or enter manually
 */
export default function PantallaConsumo({ onNav }) {
  const [step, setStep] = useState(1);
  const [numero, setNumero] = useState('');
  const [pin, setPin] = useState('');
  const [room, setRoom] = useState(null);
  const [cat, setCat] = useState('restaurante');
  const [form, setForm] = useState({ descripcion: '', precio: '' });
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [captchaError, setCaptchaError] = useState(false);
  const turnstileRef = useRef(null);

  const safeText = (value, fallback = '—') => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
    try {
      const serialized = JSON.stringify(value);
      return serialized && serialized !== '{}' ? serialized : fallback;
    } catch {
      return fallback;
    }
  };

  const safeErrorMessage = (e, fallback = 'Error al registrar consumo') => {
    if (!e) return fallback;
    if (typeof e === 'string') return e;
    if (typeof e.message === 'string') return e.message;
    if (typeof e.error === 'string') return e.error;
    return safeText(e, fallback);
  };

  const validar = async () => {
    if (!numero.trim() || !pin.trim()) {
      return setError('Ingresa número de habitación y PIN');
    }
    if (!turnstileToken && !captchaError) return setError('Completa la verificacion de seguridad');
    setLoading(true);
    setError('');
    try {
      const data = await validarPin(numero.trim(), pin.trim(), turnstileToken);
      setRoom(data);
      setStep(2);
    } catch (e) {
      setError(safeErrorMessage(e));
      setTurnstileToken(null);
      turnstileRef.current?.reset();
    } finally {
      setLoading(false);
    }
  };

  const seleccionarProducto = useCallback((p) => {
    setForm({ descripcion: p.nombre, precio: String(p.precio) });
  }, []);

  const registrar = async () => {
    if (!form.descripcion || !form.precio) {
      return setError('Completa descripción y precio');
    }
    setLoading(true);
    setError('');
    try {
      await createConsumo({
        roomId: room.id,
        descripcion: form.descripcion,
        precio: parseFloat(form.precio),
        categoria: cat,
      });
      setExito(true);
    } catch (e) {
      setError(safeErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setExito(false);
    setForm({ descripcion: '', precio: '' });
  };

  // Success view
  if (exito) {
    return (
      <PantallaForm titulo="Consumo" onVolver={() => onNav('menu')}>
        <div className="exito-box">
          <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
          <h3>Consumo registrado</h3>
          <p className="exito-sub">Habitación #{safeText(room?.numero)} · {safeText(room?.huesped, 'Sin huésped')}</p>
          <div className="consumo-chip"><strong>{form.descripcion}</strong><span>{COP(parseFloat(form.precio))}</span></div>
          <div className="btn-row">
            <button className="btn-main-action" onClick={resetForm}>+ Otro consumo</button>
            <button className="btn-sec-action" onClick={() => onNav('menu')}>← Menú</button>
          </div>
        </div>
      </PantallaForm>
    );
  }

  return (
    <PantallaForm
      titulo="Registrar Consumo"
      desc={step === 1 ? 'Verifica la habitación con el PIN' : `Habitación #${safeText(room?.numero)} · ${safeText(room?.huesped, 'Sin huésped')}`}
      onVolver={() => (step === 2 ? setStep(1) : onNav('menu'))}
    >
      {step === 1 && (
        <form onSubmit={(e) => { e.preventDefault(); validar(); }}>
          <div className="form-group">
            <label>Número de habitación</label>
            <input type="text" placeholder="Ej: 101" value={numero} onChange={(e) => setNumero(e.target.value)} />
          </div>
          <div className="form-group">
            <label>PIN de la habitación</label>
            <input type="password" placeholder="4 dígitos" value={pin} onChange={(e) => setPin(e.target.value)} maxLength={4} />
          </div>
          <div className="flex justify-center pt-2">
            <Turnstile ref={turnstileRef} sitekey={TURNSTILE_SITE_KEY} onVerify={(t) => { setTurnstileToken(t); setError(''); }} onError={() => setCaptchaError(true)} onTimeout={() => { setError('Verificacion expirada, intenta de nuevo'); setTurnstileToken(null); }} theme="light" />
          </div>
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4"><AlertTriangle className="w-4 h-4 inline mr-1" /> {error}</div>}
          <button className="btn-main-action" onClick={validar} disabled={loading || (!turnstileToken && !captchaError)}>
            {loading ? 'Verificando...' : 'Verificar con PIN'}
          </button>
        </form>
      )}

      {step === 2 && (
        <>
          {/* Category tabs */}
          <div className="cat-tabs-row">
            {CATEGORIAS_CONSUMO.map((c) => (
              <button
                key={c.key}
                className={`ctab ${cat === c.key ? 'activo' : ''}`}
                onClick={() => {
                  setCat(c.key);
                  setForm({ descripcion: '', precio: '' });
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Product catalog */}
          <div className="catalogo-scroll">
            {PRODUCTOS[cat].map((p, i) => (
              <button
                key={i}
                className={`catalogo-item ${form.descripcion === p.nombre ? 'seleccionado' : ''}`}
                onClick={() => seleccionarProducto(p)}
              >
                <span>{p.nombre}</span>
                <span className="cat-precio">{COP(p.precio)}</span>
              </button>
            ))}
          </div>

          {/* Manual entry */}
          <div className="separador-manual">O escribe manualmente</div>
          <div className="form-group">
            <label>Descripción</label>
            <input type="text" placeholder="Ej: Cóctel especial" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Precio (COP)</label>
            <input type="number" placeholder="Ej: 25000" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} min="0" />
          </div>
          {error && <div className="error-message"><AlertTriangle className="w-4 h-4" /> {error}</div>}
          <button
            className="btn-main-action"
            onClick={registrar}
            disabled={loading || !form.descripcion || !form.precio}
          >
            {loading ? 'Guardando...' : <>Registrar {form.descripcion ? `"${form.descripcion}"` : 'consumo'}</>}
          </button>
        </>
      )}
    </PantallaForm>
  );
}
