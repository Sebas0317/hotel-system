import { useState, useEffect, memo } from 'react';
import { checkIn, checkout, cancelReservation, createConsumo, reservar, updateGuest, updateRoomStatus } from '../services/api';
import { PRODUCTOS, CATEGORIAS_CONSUMO, CAT_ICONS, METODOS_PAGO, ESTADO_CFG } from '../constants';
import { COP, FECHA } from '../utils/helpers';
import { calcularCheckout } from '../utils/checkoutCalc';
import { usePrices } from '../hooks/usePrices';

/**
 * Toast notification component — shows a temporary success/error message.
 * Renders as a fixed overlay at the top-center of the viewport.
 * Auto-dismisses after 3 seconds.
 */
function Toast({ message, type, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="toast-overlay" onClick={onDismiss}>
      <div className={`toast-box toast-${type}`} onClick={(e) => e.stopPropagation()}>
        <span>{type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
        <span>{message}</span>
      </div>
    </div>
  );
}

/**
 * Reservation form — shown for AVAILABLE rooms.
 * Allows admin to create a reservation with guest data and nights.
 */
function ReservationForm({ room, onAction, onRefresh, onCancel }) {
  const [form, setForm] = useState({
    huesped: '',
    telefono: '',
    email: '',
    noches: 3,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const checkInDate = new Date();
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkOutDate.getDate() + (form.noches || 1));

  const handleReservar = async () => {
    if (!form.huesped.trim()) return setError('Ingresa el nombre del huésped');
    if (form.noches < 1 || form.noches > 30) return setError('Noches debe ser entre 1 y 30');
    setLoading(true);
    setError('');
    try {
      await reservar(room.id, {
        huesped: form.huesped.trim(),
        telefono: form.telefono.trim(),
        email: form.email.trim(),
        noches: form.noches,
      });
      onAction('success', `Reserva creada para ${form.huesped} — Habitación #${room.numero}`);
      onRefresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ra-form">
      <h4 className="ra-form-title">📋 Nueva Reserva</h4>
      <div className="ra-field">
        <label>Nombre del huésped</label>
        <input type="text" placeholder="Ej: María López" value={form.huesped} onChange={(e) => updateField('huesped', e.target.value)} />
      </div>
      <div className="ra-field">
        <label>Teléfono</label>
        <input type="tel" placeholder="Ej: 310 123 4567" value={form.telefono} onChange={(e) => updateField('telefono', e.target.value)} />
      </div>
      <div className="ra-field">
        <label>Email</label>
        <input type="email" placeholder="Ej: maria@email.com" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
      </div>
      <div className="ra-field">
        <label>Noches de estadía</label>
        <input type="number" min="1" max="30" value={form.noches} onChange={(e) => updateField('noches', parseInt(e.target.value) || 1)} />
      </div>
      <div className="ra-dates-preview">
        <span>📅 {checkInDate.toLocaleDateString('es-CO')} → {checkOutDate.toLocaleDateString('es-CO')}</span>
      </div>
      {error && <div className="ra-error">⚠️ {error}</div>}
      <div className="ra-btn-row">
        <button className="ra-btn ra-btn-primary" onClick={handleReservar} disabled={loading}>
          {loading ? 'Procesando...' : '✅ Confirmar Reserva'}
        </button>
        <button className="ra-btn ra-btn-secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

/**
 * Guest data editor — shown for OCCUPIED rooms.
 * Allows admin to modify guest name, phone, and email.
 */
function GuestEditor({ room, onAction, onRefresh, onCancel }) {
  const [form, setForm] = useState({
    huesped: room.huesped || '',
    telefono: room.telefono || '',
    email: room.email || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleUpdate = async () => {
    if (!form.huesped.trim()) return setError('El nombre del huésped es requerido');
    setLoading(true);
    setError('');
    try {
      await updateGuest(room.id, {
        huesped: form.huesped.trim(),
        telefono: form.telefono.trim(),
        email: form.email.trim(),
      });
      onAction('success', `Datos del huésped actualizados — Habitación #${room.numero}`);
      onRefresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ra-form">
      <h4 className="ra-form-title">✏️ Editar Datos del Huésped</h4>
      <div className="ra-field">
        <label>Nombre del huésped</label>
        <input type="text" value={form.huesped} onChange={(e) => updateField('huesped', e.target.value)} />
      </div>
      <div className="ra-field">
        <label>Teléfono</label>
        <input type="tel" value={form.telefono} onChange={(e) => updateField('telefono', e.target.value)} />
      </div>
      <div className="ra-field">
        <label>Email</label>
        <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
      </div>
      {error && <div className="ra-error">⚠️ {error}</div>}
      <div className="ra-btn-row">
        <button className="ra-btn ra-btn-primary" onClick={handleUpdate} disabled={loading}>
          {loading ? 'Guardando...' : '💾 Guardar Cambios'}
        </button>
        <button className="ra-btn ra-btn-secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

/**
 * Status editor — shown for non-occupied rooms.
 * Allows admin to change room status between disponible and reservada.
 */
function StatusEditor({ room, onAction, onRefresh, onCancel }) {
  const [estado, setEstado] = useState(room.estado);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpdate = async () => {
    if (estado === room.estado) return setError('Selecciona un estado diferente');
    if (estado === 'ocupada') return setError('No se puede cambiar directamente a ocupada');
    setLoading(true);
    setError('');
    try {
      await updateRoomStatus(room.id, estado);
      onAction('success', `Estado actualizado a "${estado}" — Habitación #${room.numero}`);
      onRefresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const ALL_STATES = [
    { key: 'disponible', label: '✅ Disponible' },
    { key: 'reservada', label: '📋 Reservada' },
    { key: 'limpieza', label: '🧹 En limpieza' },
    { key: 'mantenimiento', label: '🔧 Mantenimiento' },
    { key: 'fuera_servicio', label: '🚫 Fuera de servicio' },
  ];

  const ALLOWED_FROM_CURRENT = {
    disponible: ['reservada', 'limpieza', 'mantenimiento', 'fuera_servicio'],
    reservada: ['disponible', 'limpieza', 'mantenimiento', 'fuera_servicio'],
    limpieza: ['disponible', 'mantenimiento', 'fuera_servicio'],
    mantenimiento: ['disponible', 'limpieza', 'fuera_servicio'],
    fuera_servicio: ['disponible', 'limpieza', 'mantenimiento'],
    ocupada: ['disponible', 'limpieza', 'mantenimiento', 'reservada'],
  };

  const OPERATIONAL_STATES = (ALLOWED_FROM_CURRENT[room.estado] || ['disponible']).map(key => {
    const state = ALL_STATES.find(s => s.key === key);
    return state || { key, label: key };
  });

  return (
    <div className="ra-form">
      <h4 className="ra-form-title">🔄 Modificar Estado</h4>
      <div className="ra-field">
        <label>Estado actual: <strong>{ESTADO_CFG[room.estado]?.label || room.estado}</strong></label>
        <div className="ra-status-options">
          {OPERATIONAL_STATES.map((s) => {
            const cfg = ESTADO_CFG[s.key];
            return (
              <button
                key={s.key}
                className={`ra-status-btn ${s.key} ${estado === s.key ? 'activo' : ''}`}
                style={estado === s.key ? { borderColor: cfg?.dot, background: cfg?.bg } : {}}
                onClick={() => setEstado(s.key)}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
      {error && <div className="ra-error">⚠️ {error}</div>}
      <div className="ra-btn-row">
        <button className="ra-btn ra-btn-primary" onClick={handleUpdate} disabled={loading}>
          {loading ? 'Guardando...' : '💾 Guardar Cambio'}
        </button>
        <button className="ra-btn ra-btn-secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

/**
 * Consumo manager — shown for OCCUPIED rooms.
 * Allows adding new consumos from the product catalog with live prices.
 */
function ConsumoManager({ room, onAction, onRefresh }) {
  const [cat, setCat] = useState('restaurante');
  const [form, setForm] = useState({ descripcion: '', precio: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Live product prices from backend
  const { productos } = usePrices();

  // Use live prices or fall back to constants
  const catalogo = productos[cat] || PRODUCTOS[cat] || [];

  const registrar = async () => {
    if (!form.descripcion || !form.precio) return setError('Completa descripción y precio');
    setLoading(true);
    setError('');
    try {
      await createConsumo({
        roomId: room.id,
        descripcion: form.descripcion,
        precio: parseFloat(form.precio),
        categoria: cat,
      });
      setForm({ descripcion: '', precio: '' });
      onAction('success', `Consumo "${form.descripcion}" registrado`);
      onRefresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ra-consumo-manager">
      <h4 className="ra-form-title">➕ Agregar Consumo</h4>
      <div className="ra-cat-tabs">
        {CATEGORIAS_CONSUMO.map((c) => (
          <button key={c.key} className={`ra-cat-tab ${cat === c.key ? 'activo' : ''}`} onClick={() => setCat(c.key)}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="ra-catalogo-mini">
        {catalogo.slice(0, 5).map((p, i) => (
          <button key={i} className={`ra-cat-item ${form.descripcion === p.nombre ? 'seleccionado' : ''}`} onClick={() => setForm({ descripcion: p.nombre, precio: String(p.precio) })}>
            <span>{p.nombre}</span>
            <span className="ra-cat-precio">{COP(p.precio)}</span>
          </button>
        ))}
      </div>
      <div className="ra-field">
        <label>Descripción</label>
        <input type="text" placeholder="O escribe manualmente..." value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
      </div>
      <div className="ra-field">
        <label>Precio (COP)</label>
        <input type="number" placeholder="Ej: 25000" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} min="0" />
      </div>
      {error && <div className="ra-error">⚠️ {error}</div>}
      <button className="ra-btn ra-btn-primary" onClick={registrar} disabled={loading || !form.descripcion || !form.precio}>
        {loading ? 'Guardando...' : `✅ Registrar ${form.descripcion ? `"${form.descripcion}"` : 'consumo'}`}
      </button>
    </div>
  );
}

/**
 * Checkout panel — shown for OCCUPIED rooms.
 * Processes payment and changes room status to AVAILABLE.
 * Includes room nightly rate + consumos in total.
 */
function CheckoutPanel({ room, consumos, onAction, onRefresh }) {
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [valorRecibido, setValorRecibido] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Live prices from backend
  const { tarifas } = usePrices();

  // Calculate totals using shared utility
  const totals = calcularCheckout({
    roomTipo: room.tipo,
    checkIn: room.checkIn,
    consumos,
    tarifas,
  });

  const recibido = parseFloat(valorRecibido) || 0;
  const cambio = metodoPago === 'efectivo' ? recibido - totals.total : 0;

  const handleCheckout = async () => {
    setLoading(true);
    setError('');
    try {
      const valorFinal = metodoPago === 'efectivo' ? recibido : totals.total;
      await checkout(room.id, { metodoPago, valorRecibido: valorFinal });
      onAction('success', `Checkout completado — Habitación #${room.numero} — Total: ${COP(totals.total)}`);
      onRefresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ra-checkout">
      <h4 className="ra-form-title">💳 Check-out</h4>

      {/* Breakdown */}
      <div className="ra-breakdown">
        <div className="ra-breakdown-row">
          <span>🛏️ Habitación × {totals.noches} noche{totals.noches > 1 ? 's' : ''}</span>
          <strong>{COP(totals.cargoHabitacion)}</strong>
        </div>
        {totals.totalConsumos > 0 && (
          <div className="ra-breakdown-row">
            <span>🍽️ Consumos ({consumos.length})</span>
            <strong>{COP(totals.totalConsumos)}</strong>
          </div>
        )}
        <div className="ra-breakdown-row ra-breakdown-subtotal">
          <span>Subtotal</span>
          <strong>{COP(totals.subtotal)}</strong>
        </div>
        <div className="ra-breakdown-row ra-breakdown-iva">
          <span>IVA (19%)</span>
          <strong>{COP(totals.iva)}</strong>
        </div>
        <div className="ra-breakdown-row ra-breakdown-total">
          <span>Total a cobrar</span>
          <strong>{COP(totals.total)}</strong>
        </div>
      </div>

      {/* Payment methods */}
      <div className="ra-metodos">
        {METODOS_PAGO.map((m) => (
          <button key={m.key} className={`ra-metodo-btn ${metodoPago === m.key ? 'activo' : ''}`} onClick={() => { setMetodoPago(m.key); setValorRecibido(''); }}>
            <span>{m.icon}</span><span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* Cash payment */}
      {metodoPago === 'efectivo' && (
        <div className="ra-field">
          <label>Valor recibido (COP)</label>
          <label>Valor recibido (COP)</label>
          <input 
            type="number" 
            step="1" 
            min="0" 
            placeholder={`Mín. ${totals.total.toLocaleString('es-CO')}`} 
            value={valorRecibido} 
            onChange={(e) => setValorRecibido(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); }}
          />
          {valorRecibido && (
            <div className={`ra-cambio ${cambio >= 0 ? 'positivo' : 'negativo'}`}>
              {cambio > 0 && `💰 Cambio: ${COP(cambio)}`}
              {cambio < 0 && `⚠️ Falta: ${COP(Math.abs(cambio))}`}
              {cambio === 0 && `✅ Pago exacto`}
            </div>
          )}
        </div>
      )}

      {error && <div className="ra-error">⚠️ {error}</div>}
      <button className="ra-btn ra-btn-danger" onClick={handleCheckout} disabled={loading || (metodoPago === 'efectivo' && (recibido < totals.total || !valorRecibido))}>
        {loading ? 'Procesando...' : '✅ Confirmar Check-out'}
      </button>
    </div>
  );
}

/**
 * Main RoomActions component — renders action buttons/forms based on room status.
 * Dispatches to the appropriate sub-component (ReservationForm, ConsumoManager, CheckoutPanel).
 *
 * @param {Object} props
 * @param {Object} props.room - Room object with estado, huesped, etc.
 * @param {Array} props.consumos - Array of consumo objects for the room
 * @param {Function} props.onAction - Callback (type, message) for toast notifications
 * @param {Function} props.onRefresh - Callback to refresh room data after actions
 */
function RoomActions({ room, consumos, onAction, onRefresh }) {
  // Track which action form is currently active
  const [activeForm, setActiveForm] = useState(null);

  const estado = room.estado;

  // ── AVAILABLE: Show "Hacer Reserva" + "Modificar Estado" buttons ──
  if (estado === 'disponible') {
    if (activeForm === 'reserva') {
      return <ReservationForm room={room} onAction={onAction} onRefresh={onRefresh} onCancel={() => setActiveForm(null)} />;
    }
    if (activeForm === 'edit-status') {
      return <StatusEditor room={room} onAction={onAction} onRefresh={onRefresh} onCancel={() => setActiveForm(null)} />;
    }
    return (
      <div className="ra-section">
        <button className="ra-btn ra-btn-primary ra-btn-full" onClick={() => setActiveForm('reserva')}>
          📋 Hacer Reserva
        </button>
        <button className="ra-btn ra-btn-secondary ra-btn-full" onClick={() => setActiveForm('edit-status')}>
          🔄 Modificar Estado
        </button>
      </div>
    );
  }

  // ── OCCUPIED: Show consumo manager + guest editor + checkout ──
  if (estado === 'ocupada') {
    if (activeForm === 'checkout') {
      return <CheckoutPanel room={room} consumos={consumos} onAction={onAction} onRefresh={() => { setActiveForm(null); onRefresh(); }} />;
    }
    if (activeForm === 'edit-guest') {
      return <GuestEditor room={room} onAction={onAction} onRefresh={onRefresh} onCancel={() => setActiveForm(null)} />;
    }
    return (
      <div className="ra-section">
        <ConsumoManager room={room} onAction={onAction} onRefresh={onRefresh} />
        <div className="ra-divider" />
        <button className="ra-btn ra-btn-secondary ra-btn-full" onClick={() => setActiveForm('edit-guest')}>
          ✏️ Editar Datos del Huésped
        </button>
        <div className="ra-divider" />
        <button className="ra-btn ra-btn-danger ra-btn-full" onClick={() => setActiveForm('checkout')}>
          💳 Realizar Check-out
        </button>
      </div>
    );
  }

  // ── RESERVED: Show check-in, cancel, or modify status ──
  if (estado === 'reservada') {
    if (activeForm === 'confirm-checkin') {
      return (
        <div className="ra-confirm">
          <p>¿Confirmar check-in para <strong>{room.huesped}</strong>?</p>
          <div className="ra-btn-row">
            <button className="ra-btn ra-btn-primary" onClick={async () => {
              try {
                await checkIn({ numero: room.numero, huesped: room.huesped, tipo: room.tipo });
                onAction('success', `Check-in confirmado — Habitación #${room.numero}`);
                onRefresh();
              } catch (e) {
                onAction('error', e.message);
              }
            }}>✅ Confirmar Check-in</button>
            <button className="ra-btn ra-btn-secondary" onClick={() => setActiveForm(null)}>Volver</button>
          </div>
        </div>
      );
    }
    if (activeForm === 'confirm-cancel') {
      return (
        <div className="ra-confirm">
          <p>¿Cancelar la reserva de <strong>{room.huesped}</strong>?</p>
          <p className="ra-confirm-warn">La habitación volverá a estar disponible.</p>
          <div className="ra-btn-row">
            <button className="ra-btn ra-btn-danger" onClick={async () => {
              try {
                await cancelReservation(room.id);
                onAction('success', `Reserva cancelada — Habitación #${room.numero}`);
                onRefresh();
              } catch (e) {
                onAction('error', e.message);
              }
            }}>🗑️ Cancelar Reserva</button>
            <button className="ra-btn ra-btn-secondary" onClick={() => setActiveForm(null)}>Volver</button>
          </div>
        </div>
      );
    }
    if (activeForm === 'edit-status') {
      return <StatusEditor room={room} onAction={onAction} onRefresh={onRefresh} onCancel={() => setActiveForm(null)} />;
    }
    return (
      <div className="ra-section">
        <button className="ra-btn ra-btn-primary ra-btn-full" onClick={() => setActiveForm('confirm-checkin')}>
          🛎️ Iniciar Check-in
        </button>
        <button className="ra-btn ra-btn-secondary ra-btn-full" onClick={() => setActiveForm('confirm-cancel')}>
          🗑️ Cancelar Reserva
        </button>
        <button className="ra-btn ra-btn-secondary ra-btn-full" onClick={() => setActiveForm('edit-status')}>
          🔄 Modificar Estado
        </button>
      </div>
    );
  }

  // ── LIMPIEZA/MANTENIMIENTO/FUERA DE SERVICIO: Allow changing state
  if (estado === 'limpieza' || estado === 'mantenimiento' || estado === 'fuera_servicio') {
    if (activeForm === 'edit-status') {
      return <StatusEditor room={room} onAction={onAction} onRefresh={onRefresh} onCancel={() => setActiveForm(null)} />;
    }
    return (
      <div className="ra-section">
        <button className="ra-btn ra-btn-primary ra-btn-full" onClick={() => setActiveForm('edit-status')}>
          🔄 Cambiar Estado
        </button>
      </div>
    );
  }

  // Default: show status change button for all states
  if (activeForm === 'edit-status') {
    return <StatusEditor room={room} onAction={onAction} onRefresh={onRefresh} onCancel={() => setActiveForm(null)} />;
  }
  
  return (
    <div className="ra-section">
      <button className="ra-btn ra-btn-primary ra-btn-full" onClick={() => setActiveForm('edit-status')}>
        🔄 Cambiar Estado
      </button>
    </div>
  );
}

// Export Toast for use in parent component
export { Toast };

// Export memoized component
export default memo(RoomActions);
