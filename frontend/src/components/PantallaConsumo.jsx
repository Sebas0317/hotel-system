import { useState, useCallback } from 'react';
import { validarPin, createConsumo } from '../services/api';
import { PRODUCTOS, CATEGORIAS_CONSUMO } from '../constants';
import { COP } from '../utils/helpers';
import PantallaForm from './PantallaForm';

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

  const validar = async () => {
    if (!numero.trim() || !pin.trim()) {
      return setError('Ingresa número de habitación y PIN');
    }
    setLoading(true);
    setError('');
    try {
      const data = await validarPin(numero.trim(), pin.trim());
      setRoom(data);
      setStep(2);
    } catch (e) {
      setError(e.message);
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
      setError(e.message);
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
      <PantallaForm titulo="🍽️ Consumo" onVolver={() => onNav('menu')}>
        <div className="exito-box">
          <div className="exito-icon">✅</div>
          <h3>Consumo registrado</h3>
          <p className="exito-sub">Habitación #{room.numero} · {room.huesped}</p>
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
      titulo="🍽️ Registrar Consumo"
      desc={step === 1 ? 'Verifica la habitación con el PIN' : `Habitación #${room?.numero} · ${room?.huesped}`}
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
          {error && <div className="error-msg">⚠️ {error}</div>}
          <button className="btn-main-action" onClick={validar} disabled={loading}>
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
          {error && <div className="error-msg">⚠️ {error}</div>}
          <button
            className="btn-main-action"
            onClick={registrar}
            disabled={loading || !form.descripcion || !form.precio}
          >
            {loading ? 'Guardando...' : `✅ Registrar ${form.descripcion ? `"${form.descripcion}"` : 'consumo'}`}
          </button>
        </>
      )}
    </PantallaForm>
  );
}
