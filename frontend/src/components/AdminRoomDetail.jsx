import { useState, useEffect } from 'react';
import { fetchRooms, fetchConsumos } from '../services/api';
import { COP, FECHA } from '../utils/helpers';
import { ESTADO_CFG, CAT_ICONS } from '../constants';

export default function AdminRoomDetail({ room, onRefresh }) {
  const [consumos, setConsumos] = useState([]);
  const [loadingConsumos, setLoadingConsumos] = useState(true);

  useEffect(() => {
    if (!room) return;
    
    fetchConsumos(room.id)
      .then(setConsumos)
      .catch(() => setConsumos([]))
      .finally(() => setLoadingConsumos(false));
  }, [room]);

  if (!room) return null;

  const cfg = ESTADO_CFG[room.estado] || ESTADO_CFG.disponible;
  const totalConsumos = consumos.reduce((sum, c) => sum + c.precio, 0);
  const nights = room.noches || 1;
  const roomTotal = (room.tarifa || 0) * nights;
  const totalAPagar = roomTotal + totalConsumos;

  const handleCheckout = async () => {
    if (!confirm('¿Confirmar check-out de esta habitación?')) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL || ''}/rooms/${room.id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metodoPago: 'efectivo', valorRecibido: totalAPagar })
      });
      if (onRefresh) onRefresh();
      alert('Check-out realizado exitosamente');
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  return (
    <div className="rd-content p-4 sm:p-6">
      {/* Room Header */}
      <div className="rd-header mb-6">
        <h2 className="text-2xl font-bold text-gray-900">#{room.numero} - {room.tipo}</h2>
        <div className="rd-status mt-2">
          <span 
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
            style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
          >
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Guest Info */}
      {room.estado === 'ocupada' && room.huesped && (
        <div className="rd-guest bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Información del Huésped</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-gray-400 block">Nombre</span>
              <span className="font-medium">{room.huesped}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Teléfono</span>
              <span className="font-medium">{room.telefono || 'N/A'}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Email</span>
              <span className="font-medium">{room.email || 'N/A'}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">PIN</span>
              <span className="font-mono font-medium">{room.pin}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t">
            <div>
              <span className="text-xs text-gray-400 block">Check-in</span>
              <span className="font-medium">{FECHA(room.checkIn)}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Check-out</span>
              <span className="font-medium">{FECHA(room.checkOut)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Room Info */}
      <div className="rd-info mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Detalles de la Habitación</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded p-3">
            <span className="text-xs text-gray-400 block">Camas</span>
            <span className="font-medium">{room.camas}</span>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <span className="text-xs text-gray-400 block">Capacidad</span>
            <span className="font-medium">{room.capacidad} personas</span>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <span className="text-xs text-gray-400 block">Piso</span>
            <span className="font-medium">{room.piso}</span>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <span className="text-xs text-gray-400 block">Tarifa</span>
            <span className="font-medium">{COP(room.tarifa)}/noche</span>
          </div>
        </div>
      </div>

      {/* Amenidades */}
      {room.amenidades && room.amenidades.length > 0 && (
        <div className="rd-amenidades mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Amenidades</h3>
          <div className="flex flex-wrap gap-2">
            {room.amenidades.map((amenidad, idx) => (
              <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                {amenidad.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Consumos */}
      <div className="rd-consumos mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
          Consumos ({consumos.length})
        </h3>
        {loadingConsumos ? (
          <p className="text-gray-400">Cargando...</p>
        ) : consumos.length === 0 ? (
          <p className="text-gray-400">Sin consumos registrados</p>
        ) : (
          <div className="rd-consumos-list max-h-48 overflow-y-auto border rounded-lg">
            {consumos.map((c) => (
              <div key={c.id} className="flex justify-between items-center p-3 border-b last:border-b-0">
                <div>
                  <span className="font-medium">{c.descripcion}</span>
                  <span className="text-xs text-gray-500 ml-2">{CAT_ICONS[c.categoria]}</span>
                </div>
                <span className="font-medium">{COP(c.precio)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="rd-totals border-t pt-4">
        <div className="flex justify-between py-2">
          <span>Habitación ({nights} noches)</span>
          <span>{COP(roomTotal)}</span>
        </div>
        <div className="flex justify-between py-2">
          <span>Consumos</span>
          <span>{COP(totalConsumos)}</span>
        </div>
        <div className="flex justify-between py-2 text-xl font-bold border-t mt-2 pt-2">
          <span>Total</span>
          <span>{COP(totalAPagar)}</span>
        </div>
        {room.pago && (
          <div className="flex justify-between py-2 text-green-600">
            <span>Pagado</span>
            <span>{COP(room.pago.pagado)}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {room.estado === 'ocupada' && (
        <div className="rd-actions mt-6 flex flex-col gap-3">
          <button 
            onClick={handleCheckout}
            className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700"
          >
            Realizar Check-out
          </button>
        </div>
      )}
    </div>
  );
}