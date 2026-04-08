import { useState, useEffect, useCallback } from 'react';
import { fetchRooms, fetchConsumos } from '../services/api';
import { COP } from '../utils/helpers';
import HotelTitle from './HotelTitle';

export default function UserView({ onExit }) {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [consumos, setConsumos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRooms()
      .then((rooms) => {
        const occupied = rooms.filter((r) => r.estado === 'ocupada');
        setRooms(occupied);
        if (occupied.length > 0) {
          setSelectedRoom(occupied[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      fetchConsumos(selectedRoom.id)
        .then(setConsumos)
        .catch(() => setConsumos([]));
    }
  }, [selectedRoom]);

  const totalConsumos = consumos.reduce((sum, c) => sum + c.precio, 0);
  const nights = selectedRoom?.noches || 1;
  const roomTotal = (selectedRoom?.tarifa || 0) * nights;
  const totalAPagar = roomTotal + totalConsumos;
  const pagado = selectedRoom?.pago?.pagado || 0;
  const saldoPendiente = totalAPagar - pagado;

  if (loading) {
    return (
      <div className="app-shell">
        <header className="topbar flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 px-3 sm:px-6 py-3">
          <div className="topbar-left flex items-center gap-2">
            <span className="topbar-logo text-xl"></span>
            <HotelTitle />
            <span className="topbar-badge user text-xs">User</span>
          </div>
          <button className="btn-salir text-sm" onClick={onExit}>Exit</button>
        </header>
        <div className="p-6 text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 px-3 sm:px-6 py-3">
        <div className="topbar-left flex items-center gap-2">
          <span className="topbar-logo text-xl"></span>
          <HotelTitle />
          <span className="topbar-badge user text-xs">User</span>
        </div>
        <button className="btn-salir text-sm" onClick={onExit}>Exit</button>
      </header>

      <div className="user-view flex flex-col lg:flex-row gap-4 p-4 sm:p-6">
        {/* Left panel - Room list */}
        <div className="user-room-list w-full lg:w-1/3">
          <h3 className="text-lg font-semibold mb-3">Occupied Rooms</h3>
          {rooms.length === 0 ? (
            <p className="text-gray-500">No occupied rooms</p>
          ) : (
            <div className="flex flex-col gap-2">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  className={`room-list-item text-left p-4 rounded-lg border-2 transition-all ${
                    selectedRoom?.id === room.id
                      ? 'border-[#5a8f6b] bg-[#f0fdf4]'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedRoom(room)}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">#{room.numero}</span>
                    <span className="text-sm text-gray-500">{room.tipo}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{room.huesped}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right panel - Room details */}
        <div className="user-room-detail w-full lg:w-2/3">
          {selectedRoom ? (
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Room #{selectedRoom.numero}</h2>
                  <p className="text-gray-500">{selectedRoom.tipo}</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
                  Occupied
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-500 uppercase">Guest</span>
                  <p className="font-medium">{selectedRoom.huesped}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-500 uppercase">Nights</span>
                  <p className="font-medium">{selectedRoom.noches}</p>
                </div>
              </div>

              {/* Consumption summary */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Consumptions</h3>
                {consumos.length === 0 ? (
                  <p className="text-gray-400 text-sm">No consumptions recorded</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {consumos.map((c) => (
                      <div key={c.id} className="flex justify-between text-sm py-2 border-b">
                        <span>{c.descripcion}</span>
                        <span className="font-medium">{COP(c.precio)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Room ({selectedRoom.noches} nights)</span>
                  <span>{COP(roomTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Consumptions</span>
                  <span>{COP(totalConsumos)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold pt-2 border-t">
                  <span>Total</span>
                  <span>{COP(totalAPagar)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Paid</span>
                  <span className="text-green-600">{COP(pagado)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span>Balance Due</span>
                  <span className={saldoPendiente > 0 ? 'text-red-600' : 'text-green-600'}>
                    {COP(saldoPendiente)}
                  </span>
                </div>
              </div>

              {/* Checkout button */}
              <button
                className="w-full mt-6 py-3 bg-[#5a8f6b] text-white font-semibold rounded-lg hover:bg-[#4a7c59] transition-colors"
                onClick={() => window.location.href = '/user/checkout'}
              >
                Guest Checkout
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-6 shadow-sm border text-center text-gray-500">
              Select a room to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}