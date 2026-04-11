import { useState, useCallback, useEffect, useMemo } from 'react';
import { checkIn, fetchRooms } from '../services/api';
import { TIPOS_HABITACION } from '../constants';
import PantallaForm from './PantallaForm';

/**
 * Check-in screen — Register a new guest and assign room.
 * Flow: Select room → Guest info → Additional guests → Confirm
 */
export default function PantallaCheckin({ onNav }) {
  const [step, setStep] = useState(1); // 1: Room, 2: Guest info, 3: Confirm
  const [form, setForm] = useState({ 
    numero: '', 
    huesped: '', 
    tipo: 'estándar', 
    numeroHabitacion: '',
    email: '',
    telefono: '',
    documento: '',
    noches: 1,
    checkIn: '',
    checkOut: '',
    personas: 1,
    observaciones: '',
    usarMismoContacto: true,
    personasAdicionales: []
  });
  
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

  const habitacionSeleccionada = useMemo(() => {
    return rooms.find(r => r.id === form.numero);
  }, [rooms, form.numero]);

  // Calculate check-out date based on nights
  useEffect(() => {
    if (form.checkIn && form.noches > 0) {
      const checkInDate = new Date(form.checkIn);
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkOutDate.getDate() + form.noches);
      setForm(prev => ({ ...prev, checkOut: checkOutDate.toISOString().split('T')[0] }));
    }
  }, [form.checkIn, form.noches]);

  const precioTotal = habitacionSeleccionada ? habitacionSeleccionada.tarifa * form.noches : 0;

  const updateField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleRoomSelect = useCallback((roomId) => {
    const room = rooms.find((r) => r.id === roomId);
    if (room) {
      const today = new Date().toISOString().split('T')[0];
      setForm((prev) => ({ 
        ...prev, 
        numero: roomId, 
        tipo: room.tipo, 
        numeroHabitacion: room.numero,
        checkIn: today
      }));
      setStep(2);
    }
  }, [rooms]);

  const agregarPersonaAdicional = () => {
    setForm(prev => ({
      ...prev,
      personasAdicionales: [
        ...prev.personasAdicionales,
        { nombre: '', documento: '' }
      ]
    }));
  };

  const actualizarPersonaAdicional = (index, field, value) => {
    setForm(prev => {
      const nuevas = [...prev.personasAdicionales];
      nuevas[index] = { ...nuevas[index], [field]: value };
      return { ...prev, personasAdicionales: nuevas };
    });
  };

  const handleSubmit = async () => {
    if (!form.numero || !form.huesped.trim()) {
      return setError('Selecciona una habitación y completa el nombre del huésped principal');
    }
    if (!form.documento?.trim()) {
      return setError('Ingresa el número de documento del huésped principal');
    }
    if (!form.telefono?.trim()) {
      return setError('Ingresa el número de teléfono del huésped principal');
    }
    if (!form.checkIn) {
      return setError('Selecciona la fecha de check-in');
    }
    
    setLoading(true);
    setError('');
    try {
      const data = await checkIn({
        numero: form.numeroHabitacion || form.numero,
        huesped: form.huesped.trim(),
        tipo: form.tipo,
        noches: form.noches,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        email: form.email,
        telefono: form.telefono,
        documento: form.documento,
        observaciones: form.observaciones,
        personas: form.personas,
        personasAdicionales: form.personasAdicionales
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

  // Step 1: Room Selection
  if (step === 1) {
    return (
      <PantallaForm titulo="🌿 Registrar Huésped" desc="Selecciona una habitación disponible" onVolver={() => onNav('menu')}>
        <div className="form-group">
          <label className="text-xs uppercase font-semibold text-gray-400 tracking-wide mb-3 block">Selecciona una habitación</label>
          {roomsLoading ? (
            <p className="room-select-loading text-sm text-gray-400 p-3">Cargando...</p>
          ) : disponibles.length === 0 ? (
            <div className="text-sm p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center">
              ⚠️ No hay habitaciones disponibles
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto p-1">
              {disponibles.map((r) => (
                <div
                  key={r.id}
                  className="p-5 rounded-2xl border-3 border-gray-200 bg-white hover:border-green-400 cursor-pointer transition-all"
                  onClick={() => handleRoomSelect(r.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-3xl font-extrabold text-gray-900">#{r.numero}</span>
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">Disponible</span>
                  </div>
                  <p className="font-bold text-lg text-gray-800">{r.tipo}</p>
                  <div className="text-sm text-gray-500 mt-2">
                    🛏️ {r.camas} · 👥 {r.capacidad} personas
                  </div>
                  <p className="text-2xl font-extrabold text-green-600 mt-2">
                    {r.tarifa?.toLocaleString('es-CO')} <span className="text-sm font-normal">COP/noche</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </PantallaForm>
    );
  }

  // Step 2: Guest Information Form
  if (step === 2) {
    return (
      <PantallaForm titulo="🌿 Registrar Huésped" desc="Completa los datos del huésped y la estadía" onVolver={() => setStep(1)}>
        <form onSubmit={(e) => { e.preventDefault(); }}>
          {/* Room Info Card */}
          <div className="mb-6 p-5 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-500 rounded-2xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-green-600 uppercase">Habitación</p>
                <p className="text-3xl font-extrabold text-green-900">#{habitacionSeleccionada?.numero}</p>
                <p className="text-lg font-bold text-green-700">{habitacionSeleccionada?.tipo}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold text-green-600">{habitacionSeleccionada?.tarifa?.toLocaleString('es-CO')}</p>
                <p className="text-sm text-green-500">COP/noche</p>
              </div>
            </div>
            
            {/* Dates and Nights */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-bold text-green-700 uppercase">Check-in</label>
                <input
                  type="date"
                  value={form.checkIn}
                  onChange={(e) => updateField('checkIn', e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-green-300 focus:border-green-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-green-700 uppercase">Noches</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={form.noches}
                  onChange={(e) => updateField('noches', parseInt(e.target.value) || 1)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-green-300 focus:border-green-500"
                />
              </div>
            </div>
            {form.checkOut && (
              <div className="text-sm text-green-700">
                <span className="font-medium">Check-out:</span> {form.checkOut}
              </div>
            )}
            
            <div className="mt-4 pt-3 border-t border-green-300 flex justify-between items-center">
              <span className="text-lg font-bold text-green-800">Total estadía:</span>
              <span className="text-2xl font-extrabold text-green-600">{precioTotal.toLocaleString('es-CO')} COP</span>
            </div>

            {/* Benefits/Amenities */}
            {habitacionSeleccionada?.amenidades && habitacionSeleccionada.amenidades.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {habitacionSeleccionada.amenidades.map((a, i) => (
                  <span key={i} className="text-xs bg-white text-green-700 px-2 py-1 rounded border border-green-200">
                    {a.replace('_', ' ')}
                  </span>
                ))}
              </div>
            )}

            <button 
              type="button"
              className="mt-3 text-sm text-green-600 hover:text-green-800 underline"
              onClick={() => setStep(1)}
            >
              ✕ Cambiar habitación
            </button>
          </div>

          {/* Number of People */}
          <div className="form-group">
            <label className="text-xs uppercase font-semibold text-gray-400 tracking-wide">Número de personas</label>
            <select
              value={form.personas}
              onChange={(e) => updateField('personas', parseInt(e.target.value))}
              className="w-full px-5 py-4 text-base rounded-lg border-2 border-gray-200 focus:border-green-500"
            >
              {[1,2,3,4,5,6,7,8].map(n => (
                <option key={n} value={n}>{n} persona{n > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>

          {/* Main Guest Info */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
            <p className="text-sm font-bold text-gray-700 mb-3">👤 Huesped Principal (Reserva)</p>
            
            <div className="form-group">
              <label className="text-xs uppercase font-semibold text-gray-400">Nombre completo</label>
              <input
                type="text"
                placeholder="Ej: Juan García"
                value={form.huesped}
                onChange={(e) => updateField('huesped', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-green-500"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="text-xs uppercase font-semibold text-gray-400">Documento</label>
                <input
                  type="text"
                  placeholder="Cédula"
                  value={form.documento}
                  onChange={(e) => updateField('documento', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-green-500"
                />
              </div>
              <div className="form-group">
                <label className="text-xs uppercase font-semibold text-gray-400">Teléfono</label>
                <input
                  type="tel"
                  placeholder="310 123 4567"
                  value={form.telefono}
                  onChange={(e) => updateField('telefono', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-green-500"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="text-xs uppercase font-semibold text-gray-400">Correo electrónico</label>
              <input
                type="email"
                placeholder="juan@email.com"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-green-500"
              />
            </div>
          </div>

          {/* Use same contact for additional guests */}
          {form.personas > 1 && (
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.usarMismoContacto}
                  onChange={(e) => updateField('usarMismoContacto', e.target.checked)}
                  className="w-5 h-5 text-green-600 rounded"
                />
                <span className="text-sm text-gray-700">Utilizar mismo correo y teléfono para las demás personas</span>
              </label>
            </div>
          )}

          {/* Additional Guests */}
          {form.personas > 1 && (
            <div className="space-y-3 mb-4">
              {Array.from({ length: form.personas - 1 }).map((_, i) => (
                <div key={i} className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-xs font-bold text-gray-500 uppercase">Persona {i + 2}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <input
                      type="text"
                      placeholder="Nombre completo"
                      value={form.personasAdicionales[i]?.nombre || ''}
                      onChange={(e) => actualizarPersonaAdicional(i, 'nombre', e.target.value)}
                      className="px-3 py-2.5 text-sm rounded-lg border border-gray-200"
                    />
                    <input
                      type="text"
                      placeholder="Documento"
                      value={form.personasAdicionales[i]?.documento || ''}
                      onChange={(e) => actualizarPersonaAdicional(i, 'documento', e.target.value)}
                      className="px-3 py-2.5 text-sm rounded-lg border border-gray-200"
                    />
                  </div>
                  {!form.usarMismoContacto && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                      <input
                        type="email"
                        placeholder="Correo (opcional)"
                        value={form.personasAdicionales[i]?.email || ''}
                        onChange={(e) => actualizarPersonaAdicional(i, 'email', e.target.value)}
                        className="px-3 py-2 text-sm rounded-lg border border-gray-200"
                      />
                      <input
                        type="tel"
                        placeholder="Teléfono (opcional)"
                        value={form.personasAdicionales[i]?.telefono || ''}
                        onChange={(e) => actualizarPersonaAdicional(i, 'telefono', e.target.value)}
                        className="px-3 py-2 text-sm rounded-lg border border-gray-200"
                      />
                    </div>
                  )}
                  {form.usarMismoContacto && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-400 italic">📧 Mismos datos de contacto del huésped principal</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Observations */}
          <div className="form-group">
            <label className="text-xs uppercase font-semibold text-gray-400">Observaciones (opcional)</label>
            <textarea
              placeholder="Notas especiales..."
              value={form.observaciones}
              onChange={(e) => updateField('observaciones', e.target.value)}
              rows={2}
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-green-500 resize-none"
            />
          </div>

          {error && <div className="error-msg text-sm mb-4">⚠️ {error}</div>}
          
          <button
            type="button"
            className="btn-main-action w-full py-4 text-base font-bold"
            onClick={handleSubmit}
            disabled={loading || !form.huesped.trim() || !form.documento?.trim() || !form.telefono?.trim() || !form.checkIn}
          >
            {loading ? 'Registrando...' : '✅ Confirmar Check-in'}
          </button>
        </form>
      </PantallaForm>
    );
  }

  // Success Screen
  if (resultado) {
    return (
      <PantallaForm titulo="🛎️ Check-in" onVolver={() => onNav('menu')}>
        <div className="exito-box">
          <div className="exito-icon text-6xl mb-4">✅</div>
          <h3 className="text-xl font-bold text-green-700 mb-4">¡Huésped registrado!</h3>
          <div className="info-table bg-white rounded-xl p-4 mb-4">
            <div className="it-row"><span>Habitación</span><strong>#{resultado.numero}</strong></div>
            <div className="it-row"><span>Huésped</span><strong>{resultado.huesped}</strong></div>
            <div className="it-row"><span>Personas</span><strong>{form.personas}</strong></div>
            <div className="it-row"><span>Check-in</span><strong>{form.checkIn}</strong></div>
            <div className="it-row"><span>Check-out</span><strong>{form.checkOut}</strong></div>
            <div className="it-row pin-row"><span>🔐 PIN</span><strong className="pin-grande text-2xl">{resultado.pin}</strong></div>
          </div>
          <p className="pin-aviso text-sm text-gray-600 mb-4">⚠️ Entrega este PIN al huésped — lo necesitará para consumos y checkout</p>
          <button className="btn-main-action w-full" onClick={() => onNav('menu')}>← Volver al menú</button>
        </div>
      </PantallaForm>
    );
  }

  return null;
}