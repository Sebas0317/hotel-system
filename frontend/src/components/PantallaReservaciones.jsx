import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchReservaciones, checkIn, cancelReservation } from '../services/api';
import { COP, FECHA } from '../utils/helpers';
import { usePrices } from '../hooks/usePrices';
import PantallaForm from './PantallaForm';
import { Toast } from './RoomActions';
import {
  ClipboardList, BarChart3, Calendar, AlertTriangle, Mail, Bell,
  Trash2, CheckCircle, Phone, Circle
} from 'lucide-react';

export default function PantallaReservaciones({ onNav }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('table');
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
      titulo="Gestion de Reservaciones"
      desc={`${data.length} registros activos (${upcoming.length} reservadas, ${occupied.length} ocupadas)`}
      onVolver={() => onNav('menu')}
    >
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      <div className="res-view-toggle">
        <button className={`res-view-btn ${view === 'table' ? 'activo' : ''}`} onClick={() => setView('table')}>
          <BarChart3 className="w-4 h-4 mr-1" /> Tabla
        </button>
        <button className={`res-view-btn ${view === 'calendar' ? 'activo' : ''}`} onClick={() => setView('calendar')}>
          <Calendar className="w-4 h-4 mr-1" /> Calendario
        </button>
      </div>

      {error && <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"><AlertTriangle className="w-4 h-4 inline mr-1" /> {error}</div>}

      {loading ? (
        <p className="res-loading">Cargando reservaciones...</p>
      ) : data.length === 0 ? (
        <div className="res-empty">
          <Mail className="w-4 h-4" /> Sin reservaciones pendientes
          <p>No hay reservaciones ni habitaciones ocupadas</p>
        </div>
      ) : view === 'table' ? (
        <div className="res-table-container">
          {upcoming.length > 0 && (
            <>
              <h4 className="res-section-title"><ClipboardList className="w-4 h-4 inline mr-1" /> Proximas Reservaciones ({upcoming.length})</h4>
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
                        <td className="res-cell-num"><strong>{r.numero}</strong></td>
                        <td>
                          <div className="res-guest-name">{r.huesped}</div>
                          {r.telefono && <div className="res-phone"><Phone className="w-3 h-3 inline mr-1" /> {r.telefono}</div>}
                        </td>
                        <td>{r.tipo}</td>
                        <td>{FECHA(r.checkIn)}</td>
                        <td>{FECHA(r.checkOut)}</td>
                        <td>{r.noches}</td>
                        <td>{COP(tarifaNoche(r.tipo) * (r.noches || 1))}</td>
                        <td className="res-actions">
                          <button className="res-btn res-btn-checkin" onClick={() => setConfirmAction({ type: 'checkin', data: r })}>
                            <Bell className="w-4 h-4 inline mr-1" /> Check-in
                          </button>
                          <button className="res-btn res-btn-cancel" onClick={() => setConfirmAction({ type: 'cancel', data: r })}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {occupied.length > 0 && (
            <>
              <h4 className="res-section-title"><Circle className="w-4 h-4 inline mr-1 text-red-500" /> Habitaciones Ocupadas ({occupied.length})</h4>
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
                        <td className="res-cell-num"><strong>{r.numero}</strong></td>
                        <td>
                          <div className="res-guest-name">{r.huesped}</div>
                          {r.telefono && <div className="res-phone"><Phone className="w-3 h-3 inline mr-1" /> {r.telefono}</div>}
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
                      <span className="res-cal-event-room">{r.numero}</span>
                      <span className="res-cal-event-guest">{r.huesped}</span>
                      <span className={`res-cal-event-status ${r.estado}`}>
                        {r.estado === 'reservada' ? <ClipboardList className="w-3 h-3" /> : <Circle className="w-3 h-3 fill-current" />}
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

      {confirmAction && (
        <div className="pe-modal-overlay" onClick={() => setConfirmAction(null)}>
          <div className="pe-modal" onClick={(e) => e.stopPropagation()}>
            <h4 className="pe-modal-title">
              {confirmAction.type === 'checkin' ? <><Bell className="w-5 h-5 inline mr-2" /> Confirmar Check-in</> : <><Trash2 className="w-5 h-5 inline mr-2" /> Cancelar Reserva</>}
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
                {confirmAction.type === 'checkin' ? <><CheckCircle className="w-4 h-4 inline mr-1" /> Confirmar Check-in</> : <><Trash2 className="w-4 h-4 inline mr-1" /> Cancelar Reserva</>}
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