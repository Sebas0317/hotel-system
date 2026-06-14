import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ESTADO_CFG } from '../constants';
import { usePrices } from '../hooks/usePrices';
import { fetchConsumos, solicitarCheckout } from '../services/api';
import { calcularCheckout } from '../utils/checkoutCalc';
import { COP, FECHA } from '../utils/helpers';
import HotelTitle from './HotelTitle';
import PinGate from './PinGate';

export default function UserCheckout({ onExit }) {
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [consumos, setConsumos] = useState([]);
  const [checkoutDate, setCheckoutDate] = useState('');
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const { tarifas } = usePrices();

  useEffect(() => {
    if (room) {
      fetchConsumos(room.id)
        .then(setConsumos)
        .catch(() => setConsumos([]));
      if (room.checkOut) {
        setCheckoutDate(room.checkOut.split('T')[0]);
      }
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

  const [checkoutError, setCheckoutError] = useState('');

  const handleCheckout = async () => {
    if (!room || !checkoutDate) return;
    setProcessing(true);
    setCheckoutError('');
    try {
      await solicitarCheckout(room.id, checkoutDate);
      setCompleted(true);
    } catch (e) {
      setCheckoutError(
        e?.message || 'Error al solicitar checkout. Intenta de nuevo.'
      );
      setProcessing(false);
    }
  };

  if (!room) {
    return (
      <PinGate
        onAccess={setRoom}
        onBack={onExit}
        title="Solicitar Check-out"
        description="Ingresa tus datos para solicitar el check-out"
      />
    );
  }

  if (completed) {
    return (
      <div className="app-shell">
        <header className="topbar flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 px-3 sm:px-6 py-3">
          <div className="topbar-left flex items-center gap-2">
            <span className="topbar-logo text-xl"></span>
            <HotelTitle />
            <span className="topbar-badge user text-xs">Checkout</span>
          </div>
          <button className="btn-salir text-sm" onClick={onExit}>
            Salir
          </button>
        </header>
        <div className="checkout-completed">
          <div className="checkout-success-icon">
            <div className="checkout-circle">
              <svg className="checkout-check" viewBox="0 0 52 52">
                <circle
                  className="checkout-circle-bg"
                  cx="26"
                  cy="26"
                  r="25"
                  fill="none"
                />
                <path
                  className="checkout-check-mark"
                  fill="none"
                  d="M14.1 27.2l7.1 7.2 16.7-16.8"
                />
              </svg>
            </div>
          </div>
          <h2 className="checkout-success-title">Checkout Confirmado</h2>
          <div className="checkout-notice">
            <p className="checkout-notice-title">
              Nuestro equipo ha sido notificado
            </p>
            <p className="checkout-notice-desc">
              Por favor dirigete a la zona de recepcion para finalizar el
              proceso
            </p>
          </div>
          <button
            className="checkout-back-btn"
            onClick={() => navigate('/user')}
          >
            Volver a mi habitacion
          </button>
        </div>
      </div>
    );
  }

  const cfg = room ? ESTADO_CFG[room.estado] || ESTADO_CFG.disponible : null;

  return (
    <div className="app-shell">
      <header className="topbar flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 px-3 sm:px-6 py-3">
        <div className="topbar-left flex items-center gap-2">
          <span className="topbar-logo text-xl"></span>
          <HotelTitle />
          <span className="topbar-badge user text-xs">Checkout</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-salir text-sm"
            onClick={() => navigate('/user')}
          >
            Volver
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

              <div className="rdp-section">
                <h3 className="rdp-section-title">Fecha de Check-out</h3>
                <div className="checkout-date-picker">
                  <input
                    type="date"
                    className="date-input"
                    value={checkoutDate}
                    onChange={(e) => setCheckoutDate(e.target.value)}
                  />
                  <p className="date-hint">
                    Selecciona o mantén la fecha de check-out original
                  </p>
                </div>
              </div>

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
                    <span>{COP(checkoutCalc.totalConsumos)}</span>
                  </div>
                )}
              </div>

              <div className="rdp-totals">
                <div className="rdp-total-row rdp-total-grand">
                  <span>Total de la Estancia</span>
                  <span>{COP(totalAPagar)}</span>
                </div>
                {pagado > 0 && (
                  <>
                    <div className="rdp-total-row">
                      <span>Anticipo Pagado</span>
                      <span className="text-green-600">{COP(pagado)}</span>
                    </div>
                    {saldoPendiente > 0 && (
                      <div className="rdp-total-row rdp-balance">
                        <span>Saldo por Pagar</span>
                        <span className="text-red-600">
                          {COP(saldoPendiente)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {checkoutError && (
                <p
                  className="rdp-error"
                  style={{
                    color: '#dc2626',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                  }}
                >
                  {checkoutError}
                </p>
              )}

              <button
                className="rdp-checkout-btn"
                onClick={handleCheckout}
                disabled={processing || !checkoutDate}
              >
                {processing ? 'Procesando...' : 'Confirmar Check-out'}
              </button>

              {saldoPendiente > 0 && (
                <p className="rdp-balance-hint">
                  El saldo pendiente de {COP(saldoPendiente)} debe pagarse en
                  recepcion
                </p>
              )}
            </div>
          ) : (
            <div className="room-detail-panel rdp-empty-state">
              <p>Cargando...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
