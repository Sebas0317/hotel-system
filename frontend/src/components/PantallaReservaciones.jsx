import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchReservaciones, checkIn, cancelReservation } from '../services/api';
import { COP, FECHA } from '../utils/helpers';
import { usePrices } from '../hooks/usePrices';
import PantallaForm from './PantallaForm';
import { Toast } from './RoomActions';

/**
 * Reservation Management screen — admin-only.
 * Shows a table of all reservations and occupied rooms,
 * a calendar view, and actions (check-in, cancel).
 */
export default function PantallaReservaciones({ onNav }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('table'); // 'table' | 'calendar'
  const [toast, setToast] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const { tarifas } = usePrices();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchReservaciones();
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCheckIn = async (reserv) => {
    try {
      await checkIn({ numero: reserv.numero, huesped: reserv.huesped, tipo: reserv.tipo });
      setToast({ type: 'success', message: `Check-in confirmado — Habitación #${reserv.numero}` });
      refresh();
    } catch (e) {
      setToast({ type: 'error', message: e.message });
    }
    setConfirmAction(null);
  };

  const handleCancel = async (reserv) => {
    try {
      await cancelReservation(reserv.id);
      setToast({ type: 'success', message: `Reserva cancelada — Habitación #${reserv.numero}` });
      refresh();
    } catch (e) {
      setToast({ type: 'error', message: e.message });
    }
    setConfirmAction(null);
  };

  const tarifaNoche = (tipo) => tarifas[tipo] || 80000;

  // Calendar data: group reservations by date
  const calendarData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayReservs = data.filter((r) => {
        const checkIn = r.checkIn?.split('T')[0];
        const checkOut = r.checkOut?.split('T')[0];
        return dateStr >= checkIn && dateStr <= checkOut;
      });
      days.push({ date: d, dateStr, reservs: dayReservs });
    }
    return days;
  }, [data]);

  const upcoming = data.filter((r) => r.estado === 'reservada');
  const occupied = data.filter((r) => r.estado === 'ocupada');

  return (
    <PantallaForm
      titulo="📋 Gestión de Reservaciones"
      desc={`${data.length} registros activos (${upcoming.length} reservadas, ${occupied.length} ocupadas)`}
      onVolver={() => onNav('menu')}
    >
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      {/* View toggle */}
      <div className="res-view-toggle">
        <button className={`res-view-btn ${view === 'table' ? 'activo' : ''}`} onClick={() => setView('table')}>
          📊 Tabla
        </button>
        <button className={`res-view-btn ${view === 'calendar' ? 'activo' : ''}`} onClick={() => setView('calendar')}>
          📅 Calendario
        </button>
      </div>

      {error && <div className="error-msg">⚠️ {error}</div>}

      {loading ? (
        <p className="res-loading">Cargando reservaciones...</p>
      ) : data.length === 0 ? (
        <div className="res-empty">
          <span>📭</span>
          <p>No hay reservaciones ni habitaciones ocupadas</p>
        </div>
      ) : view === 'table' ? (
        <div className="res-table-container">
          {/* Upcoming reservations */}
          {upcoming.length > 0 && (
            <>
              <h4 className="res-section-title">📋 Próximas Reservaciones ({upcoming.length})</h4>
              <div className="res-table-wrap">
                <table className="res-table">
                  <thead>
                    <tr>
                      <th>Hab.</th>
                      <th>Huésped</th>
                      <th>Tipo</th>
                      <th>Check-in</th>
                      <th>Check-out</th>
                      <th>Noches</th>
                      <th>Estimado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcoming.map((r) => (
                      <tr key={r.id} className="res-row res-row-reservada">
                        <td className="res-cell-num"><strong>#{r.numero}</strong></td>
                        <td>
                          <div className="res-guest-name">{r.huesped}</div>
                          {r.telefono && <div className="res-guest-contact">📞 {r.telefono}</div>}
                        </td>
                        <td>{r.tipo}</td>
                        <td>{FECHA(r.checkIn)}</td>
                        <td>{FECHA(r.checkOut)}</td>
                        <td>{r.noches}</td>
                        <td>{COP(tarifaNoche(r.tipo) * (r.noches || 1))}</td>
                        <td className="res-actions">
                          <button className="res-btn res-btn-checkin" onClick={() => setConfirmAction({ type: 'checkin', data: r })}>
                            🛎️ Check-in
                          </button>
                          <button className="res-btn res-btn-cancel" onClick={() => setConfirmAction({ type: 'cancel', data: r })}>
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Currently occupied */}
          {occupied.length > 0 && (
            <>
              <h4 className="res-section-title">🔴 Habitaciones Ocupadas ({occupied.length})</h4>
              <div className="res-table-wrap">
                <table className="res-table">
                  <thead>
                    <tr>
                      <th>Hab.</th>
                      <th>Huésped</th>
                      <th>Tipo</th>
                      <th>Check-in</th>
                      <th>Check-out</th>
                      <th>Noches</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {occupied.map((r) => (
                      <tr key={r.id} className="res-row res-row-ocupada">
                        <td className="res-cell-num"><strong>#{r.numero}</strong></td>
                        <td>
                          <div className="res-guest-name">{r.huesped}</div>
                          {r.telefono && <div className="res-guest-contact">📞 {r.telefono}</div>}
                        </td>
                        <td>{r.tipo}</td>
                        <td>{FECHA(r.checkIn)}</td>
                        <td>{FECHA(r.checkOut)}</td>
                        <td>{r.noches}</td>
                        <td className="res-actions">
                          <span className="res-ocupada-badge">Ocupada</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Calendar view */
        <div className="res-calendar">
          {calendarData.map((day) => (
            <div key={day.dateStr} className={`res-cal-day ${day.reservs.length > 0 ? 'has-events' : ''}`}>
              <div className="res-cal-date">
                <span className="res-cal-day-name">
                  {day.date.toLocaleDateString('es-CO', { weekday: 'short' })}
                </span>
                <span className="res-cal-day-num">
                  {day.date.getDate()}
                </span>
              </div>
              {day.reservs.length > 0 ? (
                <div className="res-cal-events">
                  {day.reservs.map((r) => (
                    <div key={r.id} className={`res-cal-event ${r.estado}`}>
                      <span className="res-cal-event-room">#{r.numero}</span>
                      <span className="res-cal-event-guest">{r.huesped}</span>
                      <span className={`res-cal-event-status ${r.estado}`}>
                        {r.estado === 'reservada' ? '📋' : '🔴'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="res-cal-empty">Sin actividad</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Confirmation modal */}
      {confirmAction && (
        <div className="pe-modal-overlay" onClick={() => setConfirmAction(null)}>
          <div className="pe-modal" onClick={(e) => e.stopPropagation()}>
            <h4 className="pe-modal-title">
              {confirmAction.type === 'checkin' ? '🛎️ Confirmar Check-in' : '🗑️ Cancelar Reserva'}
            </h4>
            <p className="pe-modal-desc">
              {confirmAction.type === 'checkin'
                ? `¿Confirmar check-in para "${confirmAction.data.huesped}" en la habitación #${confirmAction.data.numero}?`
                : `¿Cancelar la reserva de "${confirmAction.data.huesped}" en la habitación #${confirmAction.data.numero}?`}
            </p>
            <div className="pe-modal-btns">
              <button
                className={`pe-modal-btn ${confirmAction.type === 'checkin' ? 'pe-modal-btn-confirm' : 'pe-modal-btn-cancel'}`}
                onClick={() => confirmAction.type === 'checkin' ? handleCheckIn(confirmAction.data) : handleCancel(confirmAction.data)}
              >
                {confirmAction.type === 'checkin' ? '✅ Confirmar Check-in' : '🗑️ Cancelar Reserva'}
              </button>
              <button className="pe-modal-btn pe-modal-btn-cancel" onClick={() => setConfirmAction(null)}>
                Volver
              </button>
            </div>
          </div>
        </div>
      )}
    </PantallaForm>
  );
}
