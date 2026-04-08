import { useState, useEffect } from 'react';
import { fetchRooms, fetchConsumos } from '../services/api';
import { COP, FECHA } from '../utils/helpers';
import { ESTADO_CFG } from '../constants';
import HotelTitle from './HotelTitle';

export default function UserView({ onExit }) {
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
              <span>Occupied Rooms</span>
              <span className="piso-count">{rooms.length} rooms</span>
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
                <p className="text-gray-500 p-4">No occupied rooms</p>
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
                  <h2 className="rdp-title">Room #{selectedRoom.numero}</h2>
                  <p className="rdp-subtitle">{selectedRoom.tipo}</p>
                </div>
                <div className="rdp-estado" style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                  {cfg.label}
                </div>
              </div>

              <div className="rdp-info-grid">
                <div className="rdp-info-item">
                  <span className="rdp-info-label">Guest</span>
                  <span className="rdp-info-value">{selectedRoom.huesped}</span>
                </div>
                <div className="rdp-info-item">
                  <span className="rdp-info-label">Nights</span>
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

              {/* Consumptions */}
              <div className="rdp-section">
                <h3 className="rdp-section-title">Consumptions</h3>
                {consumos.length === 0 ? (
                  <p className="rdp-empty">No consumptions recorded</p>
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
              </div>

              {/* Totals */}
              <div className="rdp-totals">
                <div className="rdp-total-row">
                  <span>Room ({selectedRoom.noches} nights)</span>
                  <span>{COP(roomTotal)}</span>
                </div>
                <div className="rdp-total-row">
                  <span>Consumptions</span>
                  <span>{COP(totalConsumos)}</span>
                </div>
                <div className="rdp-total-row rdp-total-grand">
                  <span>Total</span>
                  <span>{COP(totalAPagar)}</span>
                </div>
                <div className="rdp-total-row">
                  <span>Paid</span>
                  <span className="text-green-600">{COP(pagado)}</span>
                </div>
                <div className="rdp-total-row rdp-total-balance">
                  <span>Balance Due</span>
                  <span className={saldoPendiente > 0 ? 'text-red-600' : 'text-green-600'}>
                    {COP(saldoPendiente)}
                  </span>
                </div>
              </div>

              <button className="rdp-checkout-btn" onClick={() => window.location.href = '/user/checkout'}>
                Guest Checkout
              </button>
            </div>
          ) : (
            <div className="room-detail-panel rdp-empty-state">
              <p>Select a room to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}