import { useState } from 'react';
import { validarPin, fetchConsumos } from '../services/api';
import { COP, FECHA } from '../utils/helpers';
import { CAT_ICONS } from '../constants';
import PantallaForm from './PantallaForm';
import { AlertTriangle, Package } from 'lucide-react';

/**
 * View room details screen - Shows room info and all consumos
 */
export default function PantallaVer({ onNav }) {
  const [numero, setNumero] = useState('');
  const [pin, setPin] = useState('');
  const [room, setRoom] = useState(null);
  const [consumos, setConsumos] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const consultar = async () => {
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
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const total = consumos.reduce((s, c) => s + c.precio, 0);

  const resetView = () => {
    setRoom(null);
    setConsumos([]);
    setNumero('');
    setPin('');
  };

  return (
    <PantallaForm
      titulo="Ver Habitacion"
      desc={room ? `Habitación #${room.numero} · ${room.huesped}` : 'Ingresa el número y PIN para consultar'}
      onVolver={() => (room ? resetView() : onNav('menu'))}
    >
      {!room ? (
        <form onSubmit={(e) => { e.preventDefault(); consultar(); }}>
          <div className="form-group">
            <label>Número de habitación</label>
            <input type="text" placeholder="Ej: 101" value={numero} onChange={(e) => setNumero(e.target.value)} />
          </div>
          <div className="form-group">
            <label>PIN</label>
            <input type="password" placeholder="4 dígitos" value={pin} onChange={(e) => setPin(e.target.value)} maxLength={4} />
          </div>
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4"><AlertTriangle className="w-4 h-4 inline mr-1" /> {error}</div>}
          <button className="btn-main-action" onClick={consultar} disabled={loading}>
            {loading ? 'Consultando...' : 'Consultar'}
          </button>
        </form>
      ) : (
        <>
          <div className="info-table">
            <div className="it-row"><span>Check-in</span><strong>{FECHA(room.checkIn)}</strong></div>
            <div className="it-row"><span>Tipo</span><strong>{room.tipo}</strong></div>
          </div>
          <div className="consumos-section">
            <div className="cs-header">
              <span>Consumos ({consumos.length})</span>
              <span className="cs-total">{COP(total)}</span>
            </div>
            {consumos.length === 0
              ? <p className="empty-msg">Sin consumos registrados aún</p>
              : consumos.map((c) => (
                  <div key={c.id} className="consumo-row">
                    <Package className="w-4 h-4" />
                    <span className="cr-desc">{c.descripcion}</span>
                    <span className="cr-fecha">{FECHA(c.fecha)}</span>
                    <span className="cr-precio">{COP(c.precio)}</span>
                  </div>
                ))}
          </div>
          <button className="btn-sec-action" onClick={resetView}>← Otra consulta</button>
        </>
      )}
    </PantallaForm>
  );
}
