import { useCallback, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, Building2, Package, CheckCircle } from 'lucide-react';
import { COP, FECHA } from '../utils/helpers';
import { METODOS_PAGO, CAT_ICONS } from '../constants';

/**
 * FacturaImprimible — Printable invoice component.
 * Renders a clean, print-optimized receipt with all checkout details.
 * Uses react-to-print for professional printing.
 *
 * @param {Object} props
 * @param {Object} props.factura - Invoice data from backend checkout response
 */
export default function FacturaImprimible({ factura }) {
  const metodoLabel = METODOS_PAGO.find((m) => m.key === factura.metodoPago);
  const printRef = useRef(null);

  const { handlePrint } = useReactToPrint({
    contentRef: printRef,
    content: () => document.getElementById('factura-print'),
  });

  return (
    <div className="factura-container">
      <div className="factura-print-btn-wrap">
        <button className="factura-print-btn" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          Imprimir Factura
        </button>
      </div>

      <div ref={printRef} className="factura" id="factura-print">
        {/* Header */}
        <div className="factura-header">
          <div className="factura-logo">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="factura-hotel">EcoBosque</h2>
          <p className="factura-subtitle">Factura de Hospedaje</p>
          <p className="factura-fecha">{FECHA(factura.fecha)}</p>
        </div>

        {/* Guest info */}
        <div className="factura-section">
          <h4 className="factura-section-title">Información del Huésped</h4>
          <div className="factura-info-grid">
            <div className="factura-info-row">
              <span>Huésped:</span>
              <strong>{factura.huesped}</strong>
            </div>
            {factura.telefono && (
              <div className="factura-info-row">
                <span>Teléfono:</span>
                <strong>{factura.telefono}</strong>
              </div>
            )}
            {factura.email && (
              <div className="factura-info-row">
                <span>Email:</span>
                <strong>{factura.email}</strong>
              </div>
            )}
            <div className="factura-info-row">
              <span>Habitación:</span>
              <strong>#{factura.numero} ({factura.tipo})</strong>
            </div>
            <div className="factura-info-row">
              <span>Check-in:</span>
              <strong>{FECHA(factura.checkIn)}</strong>
            </div>
            <div className="factura-info-row">
              <span>Check-out:</span>
              <strong>{FECHA(factura.checkOutAt)}</strong>
            </div>
          </div>
        </div>

        {/* Room charges */}
        <div className="factura-section">
          <h4 className="factura-section-title">Cargo por Hospedaje</h4>
          <table className="factura-table">
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Precio Unit.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Habitación {factura.tipo}</td>
                <td>{factura.noches} noche{factura.noches > 1 ? 's' : ''}</td>
                <td>{COP(factura.tarifaNoche)}</td>
                <td>{COP(factura.cargoHabitacion)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Consumos */}
        {factura.consumos && factura.consumos.length > 0 && (
          <div className="factura-section">
            <h4 className="factura-section-title">Consumos</h4>
            <table className="factura-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Categoría</th>
                  <th>Descripción</th>
                  <th>Precio</th>
                </tr>
              </thead>
              <tbody>
                {factura.consumos.map((c) => (
                  <tr key={c.id}>
                    <td>{FECHA(c.fecha)}</td>
                    <td>{CAT_ICONS[c.categoria] || <Package className="w-3 h-3" />} {c.categoria}</td>
                    <td>{c.descripcion}</td>
                    <td>{COP(c.precio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        <div className="factura-totals">
          <div className="factura-total-row">
            <span>Subtotal</span>
            <strong>{COP(factura.subtotal)}</strong>
          </div>
          <div className="factura-total-row factura-iva-row">
            <span>IVA (19%)</span>
            <strong>{COP(factura.iva)}</strong>
          </div>
          <div className="factura-total-row factura-grand-total">
            <span>Total</span>
            <strong>{COP(factura.total)}</strong>
          </div>
        </div>

        {/* Payment */}
        <div className="factura-section factura-payment">
          <div className="factura-info-row">
            <span>Método de pago:</span>
            <strong>{metodoLabel?.icon} {metodoLabel?.label}</strong>
          </div>
          <div className="factura-info-row">
            <span>Valor recibido:</span>
            <strong>{COP(factura.valorRecibido)}</strong>
          </div>
          {factura.cambio > 0 && (
            <div className="factura-info-row">
              <span>Cambio:</span>
              <strong>{COP(factura.cambio)}</strong>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="factura-footer">
          <p><CheckCircle className="w-4 h-4 inline mr-1" /> Cuenta cerrada — Habitación disponible para nuevos huéspedes</p>
          <p className="factura-gracias">¡Gracias por su estadía en EcoBosque!</p>
        </div>
      </div>
    </div>
  );
}
