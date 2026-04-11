import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchRooms, fetchConsumos } from '../services/api';
import { COP, FECHA } from '../utils/helpers';
import { ESTADO_CFG } from '../constants';
import HotelTitle from './HotelTitle';

export default function UserView({ onExit }) {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [consumos, setConsumos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRooms()
      .then((rooms) => {
        const occupied = rooms.filter((r) => r.estado === 'ocupada');
        setRooms(occupied);
        if (occupied.length > 0) {
          setSelectedRoom(occupied[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      fetchConsumos(selectedRoom.id)
        .then(setConsumos)
        .catch(() => setConsumos([]));
    }
  }, [selectedRoom]);

  const totalConsumos = consumos.reduce((sum, c) => sum + c.precio, 0);
  const nights = selectedRoom?.noches || 1;
  const roomTotal = (selectedRoom?.tarifa || 0) * nights;
  const totalAPagar = roomTotal + totalConsumos;
  const pagado = selectedRoom?.pago?.pagado || 0;
  const saldoPendiente = totalAPagar - pagado;

  if (loading) {
    return (
      <div className="app-shell">
        <header className="topbar flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 px-3 sm:px-6 py-3">
          <div className="topbar-left flex items-center gap-2">
            <span className="topbar-logo text-xl"></span>
            <HotelTitle />
            <span className="topbar-badge user text-xs">User</span>
          </div>
          <button className="btn-salir text-sm" onClick={onExit}>Exit</button>
        </header>
        <div className="p-6 text-center">Loading...</div>
      </div>
    );
  }

  const cfg = selectedRoom ? (ESTADO_CFG[selectedRoom.estado] || ESTADO_CFG.disponible) : null;

  return (
    <div className="app-shell">
      <header className="topbar flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 px-3 sm:px-6 py-3">
        <div className="topbar-left flex items-center gap-2">
          <span className="topbar-logo text-xl"></span>
          <HotelTitle />
          <span className="topbar-badge user text-xs">User</span>
        </div>
        <button className="btn-salir text-sm" onClick={onExit}>Exit</button>
      </header>

      <div className="admin-content flex flex-col lg:flex-row gap-4 p-4 sm:p-6">
        {/* Left panel - Room list (like admin) */}
        <div className="admin-room-list w-full lg:w-2/5">
          <div className="piso-grupo">
            <div className="piso-titulo">
              <span>Habitaciones Ocupadas</span>
              <span className="piso-count">{rooms.length} habitaciones</span>
            </div>
            <div className="rooms-grid">
              {rooms.map((r) => {
                const roomCfg = ESTADO_CFG[r.estado] || ESTADO_CFG.disponible;
                const isSelected = selectedRoom?.id === r.id;
                return (
                  <div
                    key={r.id}
                    className={`room-card ${isSelected ? 'selected' : ''}`}
                    style={{ borderColor: roomCfg.border, background: roomCfg.bg || '#fff' }}
                    onClick={() => setSelectedRoom(r)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedRoom(r); }}
                  >
                    <div className="rc-top">
                      <span className="rc-numero">#{r.numero}</span>
                      <span className="rc-dot" style={{ background: roomCfg.dot }} />
                    </div>
                    <div className="rc-tipo">{r.tipo}</div>
                    <div className="rc-camas">{r.camas}</div>
                    {r.huesped && (
                      <div className="rc-huesped">
                        <span>{r.huesped}</span>
                      </div>
                    )}
                    <div className="rc-estado" style={{ color: roomCfg.color, background: roomCfg.bg, border: `1px solid ${roomCfg.border}` }}>
                      {roomCfg.label}
                    </div>
                  </div>
                );
              })}
                {rooms.length === 0 && (
                <p className="text-gray-500 p-4">No hay habitaciones ocupadas</p>
              )}
            </div>
          </div>
        </div>

        {/* Right panel - Room detail (like admin) */}
        <div className="admin-room-detail w-full lg:w-3/5">
          {selectedRoom ? (
            <div className="room-detail-panel">
              <div className="rdp-header">
                <div>
                  <h2 className="rdp-title">Habitación #{selectedRoom.numero}</h2>
                  <p className="rdp-subtitle">{selectedRoom.tipo}</p>
                </div>
                <div className="rdp-estado" style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                  {cfg.label}
                </div>
              </div>

              <div className="rdp-info-grid">
                <div className="rdp-info-item">
                  <span className="rdp-info-label">Huésped</span>
                  <span className="rdp-info-value">{selectedRoom.huesped}</span>
                </div>
                <div className="rdp-info-item">
                  <span className="rdp-info-label">Noches</span>
                  <span className="rdp-info-value">{selectedRoom.noches}</span>
                </div>
                <div className="rdp-info-item">
                  <span className="rdp-info-label">Check-in</span>
                  <span className="rdp-info-value">{FECHA(selectedRoom.checkIn)}</span>
                </div>
                <div className="rdp-info-item">
                  <span className="rdp-info-label">Check-out</span>
                  <span className="rdp-info-value">{FECHA(selectedRoom.checkOut)}</span>
                </div>
              </div>

              {/* Payment Info */}
              {selectedRoom.pago && (
                <div className="rdp-section rdp-payment-info">
                  <h3 className="rdp-section-title">Resumen de Pago</h3>
                  <div className="rdp-payment-grid">
                    <div className="rdp-payment-item">
                      <span className="rdp-payment-label">Pagado Adelantado</span>
                      <span className="rdp-payment-value text-green-600">{COP(selectedRoom.pago.pagado)}</span>
                    </div>
                    <div className="rdp-payment-item">
                      <span className="rdp-payment-label">Pendiente</span>
                      <span className={`rdp-payment-value ${saldoPendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {COP(saldoPendiente)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Room Charges */}
              <div className="rdp-section">
                <h3 className="rdp-section-title">Habitación</h3>
                <div className="rdp-room-charges">
                  <div className="rdp-charge-item">
                    <span>Tarifa ({COP(selectedRoom.tarifa)} x {selectedRoom.noches} noche{selectedRoom.noches > 1 ? 's' : ''})</span>
                    <span>{COP(roomTotal)}</span>
                  </div>
                </div>
                <div className="rdp-subtotal">
                  <span>Subtotal Habitación</span>
                  <span>{COP(roomTotal)}</span>
                </div>
              </div>

              {/* Consumptions */}
              <div className="rdp-section">
                <h3 className="rdp-section-title">Consumos ({consumos.length} artículo{consumos.length !== 1 ? 's' : ''})</h3>
                {consumos.length === 0 ? (
                  <p className="rdp-empty">Sin consumos registrados</p>
                ) : (
                  <div className="rdp-consumos-list">
                    {consumos.map((c) => (
                      <div key={c.id} className="rdp-consumo-item">
                        <span>{c.descripcion}</span>
                        <span>{COP(c.precio)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {consumos.length > 0 && (
                  <div className="rdp-subtotal">
                    <span>Subtotal Consumos</span>
                    <span>{COP(totalConsumos)}</span>
                  </div>
                )}
              </div>

              {/* Grand Total */}
              <div className="rdp-totals">
                <div className="rdp-total-row rdp-total-grand">
                  <span>Total de la Estancia</span>
                  <span>{COP(totalAPagar)}</span>
                </div>
              </div>

              <button className="rdp-checkout-btn" onClick={() => navigate('/user/checkout')}>
                Solicitar Check-out
              </button>
            </div>
          ) : (
            <div className="room-detail-panel rdp-empty-state">
              <p>Selecciona una habitación para ver los detalles</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}