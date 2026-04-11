import { useMemo, useState, useCallback, useEffect } from 'react';
import { COP, FECHA, calcularTotal } from '../utils/helpers';
import { CAT_ICONS } from '../constants';
import { generarConsumosMock, calcularFechaDisponible, generarContactoMock } from '../utils/mockData';
import { fetchConsumos } from '../services/api';
import RoomActions, { Toast } from './RoomActions';

export default function RoomDetail({ room, onRefresh }) {
  const [toast, setToast] = useState(null);
  const [consumos, setConsumos] = useState([]);
  const [consumosLoading, setConsumosLoading] = useState(true);

  const fechaDisponible = useMemo(() => calcularFechaDisponible(room), [room]);
  const contacto = useMemo(() => generarContactoMock(room), [room]);
  const totalConsumos = useMemo(() => calcularTotal(consumos), [consumos]);

  const tarifaNoche = 80000;
  let noches = 1;
  if (room.checkIn && room.estado === 'ocupada') {
    const checkInDate = new Date(room.checkIn);
    const now = new Date();
    noches = Math.max(1, Math.ceil((now - checkInDate) / (1000 * 60 * 60 * 24)));
  }
  const cargoHabitacion = tarifaNoche * noches;
  const granTotal = cargoHabitacion + totalConsumos;

  const nochesEstadia = useMemo(() => {
    if (!room.checkIn || room.estado !== 'ocupada') return null;
    const checkIn = new Date(room.checkIn);
    const now = new Date();
    const diff = Math.ceil((now - checkIn) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff);
  }, [room.checkIn, room.estado]);

  useEffect(() => {
    let cancelled = false;
    fetchConsumos(room.id)
      .then((data) => {
        if (!cancelled) {
          if (data.length > 0) {
            setConsumos(data);
          } else {
            setConsumos(generarConsumosMock(room));
          }
        }
      })
      .catch(() => {
        if (!cancelled) setConsumos(generarConsumosMock(room));
      })
      .finally(() => {
        if (!cancelled) setConsumosLoading(false);
      });
    return () => { cancelled = true; };
  }, [room.id]);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
  }, []);

  return (
    <div className="room-detail">
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      <div className={`rd-status-badge rd-status-${room.estado}`}>
        {room.estado === 'disponible' && '✅ Disponible'}
        {room.estado === 'ocupada' && '🔴 Ocupada'}
        {room.estado === 'reservada' && '🟡 Reservada'}
        {room.estado === 'limpieza' && '🧹 En limpieza'}
        {room.estado === 'mantenimiento' && '🔧 Mantenimiento'}
      </div>

      {room.solicitudCheckout && room.estado === 'ocupada' && (
        <div className="rd-checkout-request">
          <div className="rd-cr-header">
            <span className="rd-cr-icon">🔔</span>
            <span className="rd-cr-title">El cliente desea retirarse</span>
          </div>
          <p className="rd-cr-message">
            El huésped ha solicitado check-out para el <strong>{FECHA(room.solicitudCheckout.fecha)}</strong> y se dirigirá a recepción.
          </p>
        </div>
      )}

      <div className="rd-section">
        <h4 className="rd-section-title">🌿 Datos del Huésped</h4>
        <div className="rd-grid">
          <div className="rd-field">
            <span className="rd-label">Nombre</span>
            <span className="rd-value">{room.huesped || '—'}</span>
          </div>
          {contacto && (
            <>
              <div className="rd-field">
                <span className="rd-label">Documento</span>
                <span className="rd-value">{contacto.documento}</span>
              </div>
              <div className="rd-field">
                <span className="rd-label">Teléfono</span>
                <span className="rd-value">{contacto.telefono}</span>
              </div>
              <div className="rd-field">
                <span className="rd-label">Email</span>
                <span className="rd-value rd-email">{contacto.email}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {(room.estado === 'reservada' || room.estado === 'ocupada') && room.huesped && (
        <div className="rd-section rd-guest-details">
          <h4 className="rd-section-title">👤 Registro de Huéspedes</h4>
          
          <div className="rd-guest-count">
            <span className="rd-label">Número de personas:</span>
            <span className="rd-value">{room.personas || 1} persona{room.personas > 1 ? 's' : ''}</span>
          </div>

          <div className="rd-guest-list">
            <div className="rd-guest-item rd-guest-main">
              <span className="rd-guest-type">👤 Huesped Principal {room.estado === 'reservada' && '(Reserva)'}</span>
              
              <div className="rd-guest-form">
                <div className="rd-field">
                  <span className="rd-label">Nombre completo</span>
                  <span className="rd-value">{room.huesped || '—'}</span>
                </div>
                <div className="rd-field">
                  <span className="rd-label">Documento</span>
                  <span className="rd-value">{contacto?.documento || '—'}</span>
                </div>
                <div className="rd-field">
                  <span className="rd-label">Teléfono</span>
                  <span className="rd-value">{contacto?.telefono || '—'}</span>
                </div>
                <div className="rd-field">
                  <span className="rd-label">Correo electrónico</span>
                  <span className="rd-value">{contacto?.email || '—'}</span>
                </div>
                {room.observaciones && (
                  <div className="rd-field">
                    <span className="rd-label">Observaciones</span>
                    <span className="rd-value">{room.observaciones}</span>
                  </div>
                )}
              </div>
            </div>

            {room.personasAdicionales && room.personasAdicionales.length > 0 && room.personasAdicionales.map((p, i) => (
              <div key={i} className="rd-guest-item">
                <span className="rd-guest-type">👥 Persona adicional #{i + 1}</span>
                <div className="rd-guest-form">
                  <div className="rd-field">
                    <span className="rd-label">Nombre</span>
                    <span className="rd-value">{p.nombre || '—'}</span>
                  </div>
                  <div className="rd-field">
                    <span className="rd-label">Documento</span>
                    <span className="rd-value">{p.documento || '—'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {room.pin && (
        <div className="rd-section rd-pin-section">
          <h4 className="rd-section-title">🔐 PIN de Acceso <span className="rd-pin-admin-only">(solo admin)</span></h4>
          <div className="rd-pin-display">
            <span className="rd-pin-value">{room.pin}</span>
            <button
              className="rd-pin-copy-btn"
              onClick={() => {
                navigator.clipboard.writeText(room.pin);
                showToast('success', 'PIN copiado al portapapeles');
              }}
              title="Copiar PIN"
            >
              📋 Copiar
            </button>
          </div>
          <p className="rd-pin-hint">Entrega este PIN al huésped para consumos y check-out</p>
        </div>
      )}

      <div className="rd-section">
        <h4 className="rd-section-title">📅 Fechas</h4>
        <div className="rd-grid">
          <div className="rd-field">
            <span className="rd-label">Check-in</span>
            <span className="rd-value">{FECHA(room.checkIn)}</span>
          </div>
          {room.checkOut && (
            <div className="rd-field">
              <span className="rd-label">Check-out</span>
              <span className="rd-value">{FECHA(room.checkOut)}</span>
            </div>
          )}
          {fechaDisponible && (
            <div className="rd-field rd-highlight">
              <span className="rd-label">Disponible desde</span>
              <span className="rd-value">{FECHA(fechaDisponible.toISOString())}</span>
            </div>
          )}
          {nochesEstadia && (
            <div className="rd-field rd-highlight">
              <span className="rd-label">Noches de estadía</span>
              <span className="rd-value">{nochesEstadia} noche{nochesEstadia > 1 ? 's' : ''}</span>
            </div>
          )}
          {room.estado === 'disponible' && (
            <div className="rd-field rd-highlight">
              <span className="rd-label">Estado</span>
              <span className="rd-value rd-available">✅ Disponible ahora</span>
            </div>
          )}
          {room.estado === 'limpieza' && (
            <div className="rd-field rd-highlight" style={{ background: '#ede9fe', borderColor: '#c4b5fd' }}>
              <span className="rd-label">Estado</span>
              <span className="rd-value" style={{ color: '#7c3aed' }}>🧹 En limpieza</span>
            </div>
          )}
          {room.estado === 'mantenimiento' && (
            <div className="rd-field rd-highlight" style={{ background: '#fef3c7', borderColor: '#fcd34d' }}>
              <span className="rd-label">Estado</span>
              <span className="rd-value" style={{ color: '#b45309' }}>🔧 En mantenimiento</span>
            </div>
          )}
        </div>
      </div>

      <div className="rd-section">
        <h4 className="rd-section-title">🏨 Información de la Habitación</h4>
        <div className="rd-grid">
          <div className="rd-field">
            <span className="rd-label">Tipo</span>
            <span className="rd-value">{room.tipo}</span>
          </div>
          <div className="rd-field">
            <span className="rd-label">Camas</span>
            <span className="rd-value">{room.camas}</span>
          </div>
          <div className="rd-field">
            <span className="rd-label">Capacidad</span>
            <span className="rd-value">{room.capacidad} personas</span>
          </div>
          <div className="rd-field">
            <span className="rd-label">Piso</span>
            <span className="rd-value">{room.piso === 0 ? 'Cabañas' : `Piso ${room.piso}`}</span>
          </div>
        </div>
      </div>

      {(room.estado === 'ocupada' || room.estado === 'reservada') && granTotal > 0 && (
        <div className="rd-total-bar">
          <div className="rd-total-breakdown">
            {room.estado === 'ocupada' && (
              <span>🛏️ Habitación × {noches} noche{noches > 1 ? 's' : ''}: {COP(cargoHabitacion)}</span>
            )}
            {totalConsumos > 0 && (
              <span>🍽️ Consumos: {COP(totalConsumos)}</span>
            )}
          </div>
          <strong>Total: {COP(granTotal)}</strong>
        </div>
      )}

      {consumosLoading ? (
        <div className="rd-section">
          <p className="rd-empty">Cargando consumos...</p>
        </div>
      ) : consumos.length > 0 ? (
        <div className="rd-section">
          <div className="rd-consumos-header">
            <h4 className="rd-section-title">🍽️ Consumos ({consumos.length})</h4>
            <span className="rd-consumos-total">{COP(totalConsumos)}</span>
          </div>
          <div className="rd-consumos-list">
            {consumos.map((c) => (
              <div key={c.id} className="rd-consumo-item">
                <span className="rdc-cat">{CAT_ICONS[c.categoria] || '📦'}</span>
                <div className="rdc-info">
                  <span className="rdc-desc">{c.descripcion}</span>
                  <span className="rdc-fecha">{FECHA(c.fecha)}</span>
                </div>
                <span className="rdc-precio">{COP(c.precio)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rd-section">
          <p className="rd-empty">Sin consumos registrados aún</p>
        </div>
      )}

      <RoomActions room={room} consumos={consumos} onAction={showToast} onRefresh={onRefresh} />
    </div>
  );
}