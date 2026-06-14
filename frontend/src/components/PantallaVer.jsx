import { AlertTriangle, Package } from 'lucide-react';
import { useState } from 'react';
import {
  fetchConsumos,
  normalizeErrorMessage as safeErrorMessage,
  safeText,
  setRoomToken,
  validarPin,
} from '../services/api';
import { COP, FECHA } from '../utils/helpers';
import PantallaForm from './PantallaForm';
import ReCaptchaWidget from './ReCaptchaWidget';

export default function PantallaVer({ onNav }) {
  const [numero, setNumero] = useState('');
  const [pin, setPin] = useState('');
  const [room, setRoom] = useState(null);
  const [consumos, setConsumos] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const [captchaError] = useState(false);

  const consultar = async () => {
    if (!numero.trim() || !pin.trim()) {
      return setError('Ingresa número de habitación y PIN');
    }
    if (!recaptchaToken && !captchaError)
      return setError('Completa la verificacion de seguridad');
    setLoading(true);
    setError('');
    try {
      const data = await validarPin(numero.trim(), pin.trim(), recaptchaToken);
      setRoomToken(data.roomToken);
      setRoom(data.room);
      const consumosData = await fetchConsumos(data.room.id);
      setConsumos(consumosData);
    } catch (e) {
      setError(safeErrorMessage(e));
      setRecaptchaToken(null);
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
    setRecaptchaToken(null);
  };

  return (
    <PantallaForm
      titulo="Ver Habitacion"
      desc={
        room
          ? `Habitación #${safeText(room.numero)} · ${safeText(room.huesped, 'Sin huésped')}`
          : 'Ingresa el número y PIN para consultar'
      }
      onVolver={() => (room ? resetView() : onNav('menu'))}
    >
      {!room ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            consultar();
          }}
        >
          <div className="form-group">
            <label>Número de habitación</label>
            <input
              type="text"
              placeholder="Ej: 101"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>PIN</label>
            <input
              type="password"
              placeholder="6 dígitos"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={6}
            />
          </div>
          <div className="flex justify-center pt-2">
            <ReCaptchaWidget
              onVerify={(token) => {
                setRecaptchaToken(token);
                setError('');
              }}
              onExpire={() => {
                setRecaptchaToken(null);
                setError('Verificacion expirada, intenta de nuevo');
              }}
            />
          </div>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
              <AlertTriangle className="w-4 h-4 inline mr-1" /> {error}
            </div>
          )}
          <button
            className="btn-main-action"
            onClick={consultar}
            disabled={loading || (!recaptchaToken && !captchaError)}
          >
            {loading ? 'Consultando...' : 'Consultar'}
          </button>
        </form>
      ) : (
        <>
          <div className="info-table">
            <div className="it-row">
              <span>Check-in</span>
              <strong>{FECHA(room.checkIn)}</strong>
            </div>
            <div className="it-row">
              <span>Tipo</span>
              <strong>{room.tipo}</strong>
            </div>
          </div>
          <div className="consumos-section">
            <div className="cs-header">
              <span>Consumos ({consumos.length})</span>
              <span className="cs-total">{COP(total)}</span>
            </div>
            {consumos.length === 0 ? (
              <p className="empty-msg">Sin consumos registrados aún</p>
            ) : (
              consumos.map((c) => (
                <div key={c.id} className="consumo-row">
                  <Package className="w-4 h-4" />
                  <span className="cr-desc">{c.descripcion}</span>
                  <span className="cr-fecha">{FECHA(c.fecha)}</span>
                  <span className="cr-precio">{COP(c.precio)}</span>
                </div>
              ))
            )}
          </div>
          <button className="btn-sec-action" onClick={resetView}>
            ← Otra consulta
          </button>
        </>
      )}
    </PantallaForm>
  );
}
