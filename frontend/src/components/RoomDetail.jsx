import { useMemo, useState, useCallback, useEffect, memo } from 'react';
import { COP, FECHA, calcularTotal } from '../utils/helpers';
import { CAT_ICONS } from '../constants';
import { generarConsumosMock, calcularFechaDisponible, generarContactoMock } from '../utils/mockData';
import { fetchConsumos, fetchStateHistory } from '../services/api';
import RoomActions, { Toast } from './RoomActions';

function RoomDetail({ room, onRefresh }) {
  const [toast, setToast] = useState(null);
  const [consumos, setConsumos] = useState([]);
  const [consumosLoading, setConsumosLoading] = useState(true);
  const [stateHistory, setStateHistory] = useState([]);

  const fechaDisponible = useMemo(() => calcularFechaDisponible(room), [room]);
  const contacto = useMemo(() => {
    if (room.email || room.telefono || room.documento) {
      return {
        documento: room.documento || '—',
        telefono: room.telefono || '—',
        email: room.email || '—',
      };
    }
    return generarContactoMock(room);
  }, [room]);
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

  useEffect(() => {
    let cancelled = false;
    fetchStateHistory()
      .then((data) => {
        if (!cancelled) {
          const roomHistory = data.filter(h => h.roomId === room.id).slice(0, 10);
          setStateHistory(roomHistory);
        }
      })
      .catch(() => {})
      .finally(() => {});
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
        <div className="rd-section rd-guest-details" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', borderRadius: '12px', padding: '16px', border: '1px solid #bbf7d0' }}>
          <h4 className="rd-section-title" style={{ color: '#166534', fontSize: '14px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>👤</span> Registro de Huéspedes
          </h4>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '10px', background: 'white', borderRadius: '8px', border: '1px solid #d1d5db' }}>
            <span style={{ fontSize: '20px' }}>👥</span>
            <div>
              <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>Número de personas:</span>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937' }}>
                {(room.adultos || 1) + (room.ninos || 0)} persona{(room.adultos + room.ninos > 1) ? 's' : ''}
                <span style={{ fontSize: '13px', fontWeight: '400', color: '#6b7280', marginLeft: '4px' }}>
                  ({room.adultos || 1} adulto{(room.adultos > 1) ? 's' : ''}{room.ninos ? `, ${room.ninos} niño${room.ninos > 1 ? 's' : ''}` : ''})
                </span>
              </div>
            </div>
          </div>

          {room.tieneMascota && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '10px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fcd34d' }}>
              <span style={{ fontSize: '20px' }}>🐾</span>
              <div>
                <span style={{ fontSize: '12px', color: '#92400e', fontWeight: '600', textTransform: 'uppercase' }}>Mascota</span>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#78350f' }}>{room.nombreMascota || 'Sin nombre'}</div>
              </div>
            </div>
          )}

          <div className="rd-guest-list">
            <div className="rd-guest-item rd-guest-main" style={{ background: 'white', borderRadius: '10px', padding: '14px', border: '2px solid #22c55e', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '16px' }}>👤</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#166534', textTransform: 'uppercase' }}>Huésped Principal {room.estado === 'reservada' && '(Reserva)'}</span>
              </div>
              
              <div className="rd-guest-form" style={{ display: 'grid', gap: '8px' }}>
                <div className="rd-field" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f9fafb', borderRadius: '6px' }}>
                  <span className="rd-label" style={{ fontSize: '12px', color: '#6b7280' }}>Nombre completo</span>
                  <span className="rd-value" style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{room.huesped || '—'}</span>
                </div>
                <div className="rd-field" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f9fafb', borderRadius: '6px' }}>
                  <span className="rd-label" style={{ fontSize: '12px', color: '#6b7280' }}>Documento</span>
                  <span className="rd-value" style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{contacto?.documento || '—'}</span>
                </div>
                <div className="rd-field" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f9fafb', borderRadius: '6px' }}>
                  <span className="rd-label" style={{ fontSize: '12px', color: '#6b7280' }}>Teléfono</span>
                  <span className="rd-value" style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{contacto?.telefono || '—'}</span>
                </div>
                <div className="rd-field" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f9fafb', borderRadius: '6px' }}>
                  <span className="rd-label" style={{ fontSize: '12px', color: '#6b7280' }}>Correo electrónico</span>
                  <span className="rd-value" style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{contacto?.email || '—'}</span>
                </div>
                {room.observaciones && (
                  <div className="rd-field" style={{ padding: '8px', background: '#fef3c7', borderRadius: '6px', border: '1px solid #fcd34d' }}>
                    <span className="rd-label" style={{ fontSize: '12px', color: '#92400e' }}>📝 Observaciones</span>
                    <span className="rd-value" style={{ fontSize: '13px', color: '#78350f', display: 'block', marginTop: '4px' }}>{room.observaciones}</span>
                  </div>
                )}
              </div>
            </div>

            {room.personasAdicionales && room.personasAdicionales.length > 0 && room.personasAdicionales.map((p, i) => (
              <div key={i} className="rd-guest-item" style={{ background: 'white', borderRadius: '10px', padding: '14px', border: '1px solid #e5e7eb', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '16px' }}>👥</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#4b5563', textTransform: 'uppercase' }}>
                    {room.ninos && i < room.ninos ? `Niño ${i + 1} (menor)` : `Persona adicional #${i + 1}`}
                  </span>
                </div>
                <div className="rd-guest-form" style={{ display: 'grid', gap: '6px' }}>
                  <div className="rd-field" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', background: '#f9fafb', borderRadius: '6px' }}>
                    <span className="rd-label" style={{ fontSize: '11px', color: '#6b7280' }}>Nombre</span>
                    <span className="rd-value" style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{p.nombre || '—'}</span>
                  </div>
                  <div className="rd-field" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', background: '#f9fafb', borderRadius: '6px' }}>
                    <span className="rd-label" style={{ fontSize: '11px', color: '#6b7280' }}>Documento</span>
                    <span className="rd-value" style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{p.documento || '—'}</span>
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

      {stateHistory.length > 0 && (
        <div className="rd-section" style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
          <h4 className="rd-section-title" style={{ color: '#475569', fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>
            📋 Historial de Estado ({stateHistory.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {stateHistory.map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}>
                <span style={{ 
                  padding: '4px 8px', 
                  borderRadius: '4px', 
                  fontWeight: '600',
                  background: h.estadoNuevo === 'disponible' ? '#dcfce7' : h.estadoNuevo === 'ocupada' ? '#fee2e2' : h.estadoNuevo === 'reservada' ? '#fef9c3' : '#f3f4f6',
                  color: h.estadoNuevo === 'disponible' ? '#166534' : h.estadoNuevo === 'ocupada' ? '#991b1b' : h.estadoNuevo === 'reservada' ? '#854d0e' : '#374151'
                }}>
                  {h.estadoNuevo}
                </span>
                {h.reservationId && <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6b7280' }}>{h.reservationId}</span>}
                <span style={{ color: '#6b7280' }}>{FECHA(h.timestamp)}</span>
                {h.huesped && <span style={{ color: '#111827', fontWeight: '500' }}>{h.huesped}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <RoomActions room={room} consumos={consumos} onAction={showToast} onRefresh={onRefresh} />
    </div>
  );
}

export default memo(RoomDetail);