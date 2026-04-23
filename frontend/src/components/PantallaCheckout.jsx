import { useState, useCallback, useMemo } from 'react';
import { validarPin, fetchConsumos, checkout } from '../services/api';
import { METODOS_PAGO, CAT_ICONS } from '../constants';
import { COP, FECHA } from '../utils/helpers';
import { calcularCheckout } from '../utils/checkoutCalc';
import { usePrices } from '../hooks/usePrices';
import PantallaForm from './PantallaForm';
import FacturaImprimible from './FacturaImprimible';
import { AlertTriangle, CheckCircle, Wallet } from 'lucide-react';

/**
 * Checkout screen - Three-step flow:
 * Step 1: Validate room with PIN
 * Step 2: Review consumos + room charges, select payment method, process payment
 * Step 3: Show receipt/confirmation
 */
export default function PantallaCheckout({ onNav }) {
  const [step, setStep] = useState(1);
  const [numero, setNumero] = useState('');
  const [pin, setPin] = useState('');
  const [room, setRoom] = useState(null);
  const [consumos, setConsumos] = useState([]);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [valorRecibido, setValorRecibido] = useState('');
  const [factura, setFactura] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validar = async () => {
    if (!numero.trim() || !pin.trim()) {
      return setError('Ingresa número de habitación y PIN');
    }
    setLoading(true);
    setError('');
    try {
      const data = await validarPin(numero.trim(), pin.trim());
      setRoom(data);
      const consumosData = await fetchConsumos(data.id);
      setConsumos(consumosData);
      setStep(2);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate room nights and total using shared utility
  const { tarifas } = usePrices();
  const totals = useMemo(
    () => calcularCheckout({ roomTipo: room?.tipo, checkIn: room?.checkIn, consumos, tarifas }),
    [room?.tipo, room?.checkIn, consumos, tarifas]
  );

  const confirmarCheckout = async () => {
    setLoading(true);
    try {
      const valorFinal = metodoPago === 'efectivo' ? parseFloat(valorRecibido) : totals.total;
      const data = await checkout(room.id, { metodoPago, valorRecibido: valorFinal });
      setFactura(data);
      setStep(3);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const recibido = parseFloat(valorRecibido) || 0;
  const cambio = metodoPago === 'efectivo' ? recibido - totals.total : 0;

  const resetToStep1 = useCallback(() => {
    setStep(1);
    setRoom(null);
    setConsumos([]);
    setValorRecibido('');
    setError('');
  }, []);

  return (
    <PantallaForm
      titulo="Check-out"
      desc={step === 1 ? 'Ingresa habitación y PIN' : step === 2 ? `Habitación #${room?.numero} · ${room?.huesped}` : 'Checkout completado'}
      onVolver={step === 3 ? undefined : () => {
        if (step === 1) onNav('menu');
        else if (step === 2) resetToStep1();
      }}
    >
      {step === 1 && (
        <>
          <div className="form-group">
            <label>Número de habitación</label>
            <input type="text" placeholder="Ej: 101" value={numero} onChange={(e) => setNumero(e.target.value)} />
          </div>
          <div className="form-group">
            <label>PIN</label>
            <input type="password" placeholder="4 dígitos" value={pin} onChange={(e) => setPin(e.target.value)} maxLength={4} />
          </div>
          {error && <div className="error-message"><AlertTriangle className="w-4 h-4" /> {error}</div>}
          <button className="btn-main-action" onClick={validar} disabled={loading}>
            {loading ? 'Verificando...' : 'Verificar habitación'}
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="info-table">
            <div className="it-row"><span>Check-in</span><strong>{FECHA(room.checkIn)}</strong></div>
            <div className="it-row"><span>Tipo</span><strong>{room.tipo}</strong></div>
          </div>

          {/* Cost breakdown */}
          <div className="checkout-breakdown">
            <div className="cb-row">
              <span className="flex items-center gap-1"><Bed className="w-4 h-4" /> Habitacion x {totals.noches} noche{totals.noches > 1 ? 's' : ''}</span>
              <strong>{COP(totals.cargoHabitacion)}</strong>
            </div>
            {totals.totalConsumos > 0 && (
              <>
                <div className="consumos-section">
                  <div className="cs-header"><span>Consumos ({consumos.length})</span></div>
                  {consumos.map((c) => (
                    <div key={c.id} className="consumo-row">
                      <Package className="w-4 h-4" />
                      <span className="cr-desc">{c.descripcion}</span>
                      <span className="cr-precio">{COP(c.precio)}</span>
                    </div>
                  ))}
                </div>
                <div className="cb-row">
                  <span>Subtotal consumos</span>
                  <strong>{COP(totals.totalConsumos)}</strong>
                </div>
              </>
            )}
            <div className="cb-row cb-subtotal">
              <span>Subtotal</span>
              <strong>{COP(totals.subtotal)}</strong>
            </div>
            <div className="cb-row cb-iva">
              <span>IVA (19%)</span>
              <strong>{COP(totals.iva)}</strong>
            </div>
            <div className="cb-row cb-total">
              <span>Total a cobrar</span>
              <strong>{COP(totals.total)}</strong>
            </div>
          </div>

          {/* Payment method selection */}
          <div className="form-group" style={{ marginTop: 16 }}>
            <label>Método de pago</label>
            <div className="metodo-row">
              {METODOS_PAGO.map((m) => (
                <button
                  key={m.key}
                  className={`metodo-btn ${metodoPago === m.key ? 'activo' : ''}`}
                  onClick={() => {
                    setMetodoPago(m.key);
                    setValorRecibido('');
                  }}
                >
                  <span>{m.icon}</span><span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {metodoPago === 'efectivo' && (
            <div className="form-group">
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
                <div className={`cambio-preview ${cambio >= 0 ? 'positivo' : 'negativo'}`}>
                  {cambio > 0 && `Cambio a devolver: ${COP(cambio)}`}
                  {cambio < 0 && `Falta: ${COP(Math.abs(cambio))}`}
                  {cambio === 0 && `Pago exacto`}
                </div>
              )}
            </div>
          )}

          {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4"><AlertTriangle className="w-4 h-4 inline mr-1" /> {error}</div>}
          <button
            className="btn-danger-action"
            onClick={confirmarCheckout}
            disabled={loading || (metodoPago === 'efectivo' && (recibido < totals.total || !valorRecibido))}
          >
            {loading ? 'Procesando...' : 'Confirmar checkout y cobrar'}
          </button>
        </>
      )}

      {step === 3 && factura && factura.factura && (
        <FacturaImprimible factura={factura.factura} />
      )}

      {step === 3 && (
        <div style={{ marginTop: 16 }}>
          <button className="btn-main-action" onClick={() => onNav('menu')}>← Volver al menú</button>
        </div>
      )}
    </PantallaForm>
  );
}
