import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ESTADO_CFG } from '../constants';
import { usePrices } from '../hooks/usePrices';
import { fetchConsumos } from '../services/api';
import { calcularCheckout } from '../utils/checkoutCalc';
import { COP, FECHA } from '../utils/helpers';
import HotelTitle from './HotelTitle';
import PinGate from './PinGate';

export default function UserView({ onExit }) {
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [consumos, setConsumos] = useState([]);
  const { tarifas } = usePrices();

  useEffect(() => {
    if (room) {
      fetchConsumos(room.id)
        .then((data) => {
          setConsumos(data);
        })
        .catch(() => setConsumos([]));
    }
  }, [room]);

  const checkoutCalc = room
    ? calcularCheckout({
        roomTipo: room.tipo,
        checkIn: room.checkIn,
        consumos,
        tarifas,
      })
    : null;
  const totalAPagar = checkoutCalc?.total || 0;
  const pagado = room?.pago?.pagado || 0;
  const saldoPendiente = totalAPagar - pagado;

  if (!room) {
    return <PinGate onAccess={setRoom} onBack={onExit} />;
  }

  const cfg = ESTADO_CFG[room.estado] || ESTADO_CFG.disponible;

  return (
    <div className="app-shell">
      <header className="topbar flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 px-3 sm:px-6 py-3">
        <div className="topbar-left flex items-center gap-2">
          <span className="topbar-logo text-xl"></span>
          <HotelTitle />
          <span className="topbar-badge user text-xs">
            Habitacion #{room.numero}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-salir text-sm" onClick={() => setRoom(null)}>
            Cambiar habitacion
          </button>
          <button className="btn-salir text-sm" onClick={onExit}>
            Salir
          </button>
        </div>
      </header>

      <div className="admin-content flex flex-col lg:flex-row gap-4 p-4 sm:p-6">
        <div className="admin-room-detail w-full max-w-2xl mx-auto">
          {room ? (
            <div className="room-detail-panel">
              <div className="rdp-header">
                <div>
                  <h2 className="rdp-title">Habitacion #{room.numero}</h2>
                  <p className="rdp-subtitle">{room.tipo}</p>
                </div>
                <div
                  className="rdp-estado"
                  style={{
                    color: cfg.color,
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                  }}
                >
                  {cfg.label}
                </div>
              </div>

              <div className="rdp-info-grid">
                <div className="rdp-info-item">
                  <span className="rdp-info-label">Huesped</span>
                  <span className="rdp-info-value">{room.huesped}</span>
                </div>
                <div className="rdp-info-item">
                  <span className="rdp-info-label">Noches</span>
                  <span className="rdp-info-value">{room.noches}</span>
                </div>
                <div className="rdp-info-item">
                  <span className="rdp-info-label">Check-in</span>
                  <span className="rdp-info-value">{FECHA(room.checkIn)}</span>
                </div>
                <div className="rdp-info-item">
                  <span className="rdp-info-label">Check-out</span>
                  <span className="rdp-info-value">{FECHA(room.checkOut)}</span>
                </div>
              </div>

              {room.pago && room.pago.pagado > 0 && (
                <div className="rdp-section rdp-payment-info">
                  <h3 className="rdp-section-title">Pago</h3>
                  <div className="rdp-payment-grid">
                    <div className="rdp-payment-item">
                      <span className="rdp-payment-label">Anticipo Pagado</span>
                      <span className="rdp-payment-value text-green-600">
                        {COP(room.pago.pagado)}
                      </span>
                    </div>
                    {saldoPendiente > 0 && (
                      <div className="rdp-payment-item">
                        <span className="rdp-payment-label">
                          Saldo por Pagar
                        </span>
                        <span className="rdp-payment-value text-red-600">
                          {COP(saldoPendiente)}
                        </span>
                      </div>
                    )}
                    {saldoPendiente <= 0 && (
                      <div className="rdp-payment-item">
                        <span className="rdp-payment-label">Estado</span>
                        <span className="rdp-payment-value text-green-600">
                          ✓ Cancelado
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="rdp-section">
                <h3 className="rdp-section-title">Habitacion</h3>
                <div className="rdp-room-charges">
                  <div className="rdp-charge-item">
                    <span>
                      Tarifa ({COP(checkoutCalc.tarifaNoche)} x{' '}
                      {checkoutCalc.noches} noche
                      {checkoutCalc.noches > 1 ? 's' : ''})
                    </span>
                    <span>{COP(checkoutCalc.cargoHabitacion)}</span>
                  </div>
                </div>
                <div className="rdp-subtotal">
                  <span>Subtotal Habitacion</span>
                  <span>{COP(checkoutCalc.cargoHabitacion)}</span>
                </div>
              </div>

              <div className="rdp-section">
                <h3 className="rdp-section-title">
                  Consumos ({consumos.length} articulo
                  {consumos.length !== 1 ? 's' : ''})
                </h3>
                {consumos.length === 0 ? (
                  <p className="rdp-empty">Sin consumos registrados</p>
                ) : (
                  <div className="rdp-consumos-list">
                    {(() => {
                      const grouped = {};
                      consumos.forEach((c) => {
                        const key = c.descripcion + '|' + c.precio;
                        if (!grouped[key]) grouped[key] = { ...c, cantidad: 1 };
                        else grouped[key].cantidad++;
                      });
                      return Object.values(grouped).map((c) => (
                        <div key={c.id} className="rdp-consumo-item">
                          <span>
                            {c.descripcion}
                            {c.cantidad > 1 && (
                              <span className="rdp-consumo-cantidad">
                                {' '}
                                &times;{c.cantidad}
                              </span>
                            )}
                          </span>
                          <span>{COP(c.precio * c.cantidad)}</span>
                        </div>
                      ));
                    })()}
                  </div>
                )}
                {consumos.length > 0 && (
                  <div className="rdp-subtotal">
                    <span>Subtotal Consumos</span>
                    <span>{COP(checkoutCalc.totalConsumos)}</span>
                  </div>
                )}
              </div>

              <div className="rdp-totals">
                {checkoutCalc.iva > 0 && (
                  <div className="rdp-total-row">
                    <span>IVA (19%)</span>
                    <span>{COP(checkoutCalc.iva)}</span>
                  </div>
                )}
                <div className="rdp-total-row rdp-total-grand">
                  <span>Total de la Estancia</span>
                  <span>{COP(totalAPagar)}</span>
                </div>
              </div>

              <button
                className="rdp-checkout-btn"
                onClick={() => navigate('/user/checkout')}
              >
                Solicitar Check-out
              </button>
            </div>
          ) : (
            <div className="room-detail-panel rdp-empty-state">
              <p>Selecciona una habitacion para ver los detalles</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
