import { useState, useCallback, useEffect, useMemo } from 'react';
import { checkIn, fetchRooms } from '../services/api';
import { TIPOS_HABITACION } from '../constants';
import PantallaForm from './PantallaForm';

/**
 * Check-in screen — Register a new guest and assign room.
 * Room selection uses a dropdown of available rooms only.
 * Selecting a room auto-fills its type.
 */
export default function PantallaCheckin({ onNav }) {
  const [form, setForm] = useState({ numero: '', huesped: '', tipo: 'estándar' });
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchRooms()
      .then((data) => { if (!cancelled) setRooms(data); })
      .finally(() => { if (!cancelled) setRoomsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const disponibles = useMemo(
    () => rooms.filter((r) => r.estado === 'disponible'),
    [rooms]
  );

  const updateField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleRoomSelect = useCallback((roomId) => {
    const room = rooms.find((r) => r.id === roomId);
    if (room) {
      setForm({ numero: room.numero, huesped: form.huesped, tipo: room.tipo });
    }
  }, [rooms, form.huesped]);

  const handleSubmit = async () => {
    if (!form.numero || !form.huesped.trim()) {
      return setError('Selecciona una habitación y completa el nombre del huésped');
    }
    setLoading(true);
    setError('');
    try {
      const data = await checkIn({
        numero: form.numero,
        huesped: form.huesped.trim(),
        tipo: form.tipo,
      });
      setResultado(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) handleSubmit();
  };

  if (resultado) {
    return (
      <PantallaForm titulo="🛎️ Check-in" onVolver={() => onNav('menu')}>
        <div className="exito-box">
          <div className="exito-icon">✅</div>
          <h3>¡Check-in exitoso!</h3>
          <div className="info-table">
            <div className="it-row"><span>Habitación</span><strong>#{resultado.numero}</strong></div>
            <div className="it-row"><span>Huésped</span><strong>{resultado.huesped}</strong></div>
            <div className="it-row"><span>Tipo</span><strong>{resultado.tipo}</strong></div>
            <div className="it-row pin-row"><span>🔐 PIN</span><strong className="pin-grande">{resultado.pin}</strong></div>
          </div>
          <p className="pin-aviso">⚠️ Entrega este PIN al huésped — lo necesitará para consumos y checkout</p>
          <button className="btn-main-action" onClick={() => onNav('menu')}>← Volver al menú</button>
        </div>
      </PantallaForm>
    );
  }

  return (
    <PantallaForm titulo="🛎️ Check-in" desc="Selecciona una habitación disponible y registra al huésped" onVolver={() => onNav('menu')}>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} onKeyDown={handleKeyDown}>
      {/* Room selector — only available rooms */}
      <div className="form-group">
        <label className="text-xs uppercase font-semibold text-gray-400 tracking-wide">Habitación disponible</label>
        {roomsLoading ? (
          <p className="room-select-loading text-sm text-gray-400 p-3">Cargando habitaciones...</p>
        ) : disponibles.length === 0 ? (
          <div className="room-select-empty text-sm p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center">
            <span>⚠️ No hay habitaciones disponibles</span>
          </div>
        ) : (
          <>
            <select
              value={form.numero}
              onChange={(e) => handleRoomSelect(e.target.value)}
              className="room-select w-full px-4 py-3 text-sm sm:text-base"
            >
              <option value="">— Selecciona una habitación —</option>
              {disponibles.map((r) => (
                <option key={r.id} value={r.id}>
                  #{r.numero} — {r.tipo} (Piso {r.piso})
                </option>
              ))}
            </select>
            {form.numero && (
              <p className="room-selected-info text-xs sm:text-sm mt-2 p-2 bg-green-50 border border-green-200 rounded text-green-800">
                Tipo: <strong>{form.tipo}</strong> · Piso: <strong>{rooms.find(r => r.id === form.numero)?.piso}</strong>
              </p>
            )}
          </>
        )}
      </div>

      <div className="form-group">
        <label className="text-xs uppercase font-semibold text-gray-400 tracking-wide">Nombre del huésped</label>
        <input
          type="text"
          placeholder="Ej: Juan García"
          value={form.huesped}
          onChange={(e) => updateField('huesped', e.target.value)}
          className="w-full px-4 py-3 text-sm sm:text-base"
        />
      </div>

      {error && <div className="error-msg text-sm">⚠️ {error}</div>}
      <button
        className="btn-main-action w-full py-3 sm:py-4 text-sm sm:text-base"
        onClick={handleSubmit}
        disabled={loading || !form.numero || !form.huesped.trim()}
      >
        {loading ? 'Registrando...' : 'Confirmar Check-in'}
      </button>
      </form>
    </PantallaForm>
  );
}
