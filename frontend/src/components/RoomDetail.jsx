import { useMemo, useState, useCallback, useEffect } from 'react';
import { COP, FECHA, calcularTotal } from '../utils/helpers';
import { CAT_ICONS } from '../constants';
import { generarConsumosMock, calcularFechaDisponible, generarContactoMock } from '../utils/mockData';
import { fetchConsumos } from '../services/api';
import RoomActions, { Toast } from './RoomActions';

/**
 * RoomDetail — Detail panel shown when a room card is selected in the admin view.
 *
 * Consumption management:
 *   - Fetches real consumos from the API on mount / room change
 *   - Falls back to mock data if the API returns nothing (demo purposes)
 *   - Each room maintains its own separate consumption list
 *   - Adding consumos is handled by RoomActions.ConsumoManager
 *
 * @param {Object} props
 * @param {Object} props.room - The room object to display details for
 * @param {Function} props.onRefresh - Callback to refresh room data after actions
 */
export default function RoomDetail({ room, onRefresh }) {
  // Toast notification state
  const [toast, setToast] = useState(null);

  // Local consumption list — starts empty, populated by API fetch
  const [consumos, setConsumos] = useState([]);
  const [consumosLoading, setConsumosLoading] = useState(true);

  // Generate mock data for non-consumo fields
  const fechaDisponible = useMemo(() => calcularFechaDisponible(room), [room]);
  const contacto = useMemo(() => generarContactoMock(room), [room]);

  // Calculate total from the local consumo list
  const totalConsumos = useMemo(
    () => calcularTotal(consumos),
    [consumos]
  );

  // Calculate room nights charge
  const tarifaNoche = 80000;
  let noches = 1;
  if (room.checkIn && room.estado === 'ocupada') {
    const checkInDate = new Date(room.checkIn);
    const now = new Date();
    noches = Math.max(1, Math.ceil((now - checkInDate) / (1000 * 60 * 60 * 24)));
  }
  const cargoHabitacion = tarifaNoche * noches;

  // Grand total = room nights + consumos
  const granTotal = cargoHabitacion + totalConsumos;

  // Calculate stay duration for occupied rooms
  const nochesEstadia = useMemo(() => {
    if (!room.checkIn || room.estado !== 'ocupada') return null;
    const checkIn = new Date(room.checkIn);
    const now = new Date();
    const diff = Math.ceil((now - checkIn) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff);
  }, [room.checkIn, room.estado]);

  /**
   * Fetch real consumos from the API when the room changes.
   * If the API returns an empty list, fall back to mock data for demo purposes.
   */
  useEffect(() => {
    let cancelled = false;

    fetchConsumos(room.id)
      .then((data) => {
        if (!cancelled) {
          // Use real data if available; otherwise fall back to mock data
          if (data.length > 0) {
            setConsumos(data);
          } else {
            setConsumos(generarConsumosMock(room));
          }
        }
      })
      .catch(() => {
        // On API error, use mock data so the UI still shows something
        if (!cancelled) setConsumos(generarConsumosMock(room));
      })
      .finally(() => {
        if (!cancelled) setConsumosLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [room.id]);

  /**
   * Show a toast notification.
   * @param {string} type - 'success' | 'error' | 'info'
   * @param {string} message - Notification message
   */
  const showToast = useCallback((type, message) => {
    setToast({ type, message });
  }, []);

  return (
    <div className="room-detail">
      {/* Toast notification */}
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      {/* Status badge — color-coded based on room state */}
      <div className={`rd-status-badge rd-status-${room.estado}`}>
        {room.estado === 'disponible' && '✅ Disponible'}
        {room.estado === 'ocupada' && '🔴 Ocupada'}
        {room.estado === 'reservada' && '🟡 Reservada'}
      </div>

      {/* Guest Information Section */}
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

      {/* Admin-only PIN display — only shown when room has an active PIN (occupied or reserved) */}
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

      {/* Dates Section */}
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
        </div>
      </div>

      {/* Room Info Section */}
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

      {/* Total owed summary for occupied/reserved rooms */}
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

      {/* Consumptions list — shows real or mock data */}
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

      {/* Interactive action buttons based on room status */}
      <RoomActions room={room} consumos={consumos} onAction={showToast} onRefresh={onRefresh} />
    </div>
  );
}
