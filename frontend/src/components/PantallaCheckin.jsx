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
  const [form, setForm] = useState({ numero: '', huesped: '', tipo: 'estándar', numeroHabitacion: '' });
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
      setForm({ numero: roomId, huesped: form.huesped, tipo: room.tipo, numeroHabitacion: room.numero });
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
        numero: form.numeroHabitacion || form.numero,
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
          <h3>🌿 ¡Huésped registrado!</h3>
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
    <PantallaForm titulo="🌿 Registrar Huésped" desc="Selecciona una habitación disponible y registra los datos del huésped" onVolver={() => onNav('menu')}>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} onKeyDown={handleKeyDown}>
      {/* Selected room preview - always visible */}
      {form.numero && (
        <div className="selected-room-preview mb-6 p-5 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-500 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">Habitación Seleccionada</p>
              <p className="text-3xl font-extrabold text-green-800">#{rooms.find(r => r.id === form.numero)?.numero}</p>
              <p className="text-lg font-semibold text-green-700">{rooms.find(r => r.id === form.numero)?.tipo}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold text-green-600">
                {rooms.find(r => r.id === form.numero)?.tarifa?.toLocaleString('es-CO')}
              </p>
              <p className="text-sm text-green-500">COP/noche</p>
            </div>
          </div>
          <button 
            type="button"
            className="mt-3 text-xs text-green-600 hover:text-green-800 underline"
            onClick={() => setForm({ numero: '', huesped: '', tipo: 'estándar', numeroHabitacion: '' })}
          >
            ✕ Cambiar habitación
          </button>
        </div>
      )}

      {/* Room selector — only available rooms as cards */}
      {!form.numero && (
        <div className="form-group">
          <label className="text-xs uppercase font-semibold text-gray-400 tracking-wide mb-3 block">Selecciona una habitación</label>
        {roomsLoading ? (
          <p className="room-select-loading text-sm text-gray-400 p-3">Cargando habitaciones...</p>
        ) : disponibles.length === 0 ? (
          <div className="room-select-empty text-sm p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center">
            <span>⚠️ No hay habitaciones disponibles</span>
          </div>
        ) : (
          <div className="room-grid-selector grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto p-1">
            {disponibles.map((r) => {
              const isSelected = form.numero === r.id;
              return (
                <div
                  key={r.id}
                  className={`room-card-select p-5 rounded-2xl border-3 cursor-pointer transition-all duration-300 hover:shadow-xl ${
                    isSelected 
                      ? 'border-green-600 bg-green-50 shadow-lg ring-2 ring-green-300' 
                      : 'border-gray-200 bg-white hover:border-green-400 hover:bg-green-30'
                  }`}
                  onClick={() => handleRoomSelect(r.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-extrabold text-gray-900">#{r.numero}</span>
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${isSelected ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700'}`}>
                        {isSelected ? '✓ SELECCIONADA' : 'Disponible'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="font-bold text-lg text-gray-800">{r.tipo}</p>
                    <div className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                      <span className="flex items-center gap-1">🛏️ {r.camas}</span>
                      <span className="flex items-center gap-1">👥 {r.capacidad} personas</span>
                      <span className="flex items-center gap-1">📍 {r.piso === 0 ? 'Cabañas' : `Piso ${r.piso}`}</span>
                    </div>
                    {r.tarifa && (
                      <p className="text-xl font-extrabold text-green-600 mt-3">
                        {r.tarifa.toLocaleString('es-CO')} COP<span className="text-sm font-normal">/noche</span>
                      </p>
                    )}
                    {r.amenidades && r.amenidades.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {r.amenidades.slice(0, 4).map((a, i) => (
                          <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md font-medium">
                            {a.replace('_', ' ')}
                          </span>
                        ))}
                        {r.amenidades.length > 4 && (
                          <span className="text-xs text-gray-400 font-medium">+{r.amenidades.length - 4}</span>
                        )}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <div className="mt-3 pt-2 border-t border-green-200">
                      <p className="text-xs text-green-700 font-medium">✓ Seleccionada</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {form.numero && (
        <div className="form-group mt-4">
          <label className="text-xs uppercase font-semibold text-gray-400 tracking-wide">Nombre del huésped</label>
          <input
            type="text"
            placeholder="Ej: Juan García"
            value={form.huesped}
            onChange={(e) => updateField('huesped', e.target.value)}
            className="w-full px-5 py-4 text-base rounded-lg border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200"
            autoFocus
          />
        </div>
      )}

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
