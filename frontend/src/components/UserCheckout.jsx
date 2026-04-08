import { useState, useEffect } from 'react';
import { fetchRooms, fetchConsumos, checkout } from '../services/api';
import { COP, FECHA } from '../utils/helpers';
import HotelTitle from './HotelTitle';

export default function UserCheckout({ onExit }) {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [consumos, setConsumos] = useState([]);
  const [checkoutDate, setCheckoutDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    fetchRooms()
      .then((rooms) => {
        const occupied = rooms.filter((r) => r.estado === 'ocupada');
        setRooms(occupied);
        if (occupied.length > 0) {
          setSelectedRoom(occupied[0]);
          // Set default checkout date to the reserved checkout date
          if (occupied[0].checkOut) {
            setCheckoutDate(occupied[0].checkOut.split('T')[0]);
          }
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

  const handleCheckout = async () => {
    if (!selectedRoom || !checkoutDate) return;
    
    setProcessing(true);
    try {
      await checkout(selectedRoom.id, checkoutDate);
      setCompleted(true);
    } catch (e) {
      alert('Error processing checkout: ' + e.message);
    } finally {
      setProcessing(false);
    }
  };

  if (completed) {
    return (
      <div className="app-shell">
        <header className="topbar flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 px-3 sm:px-6 py-3">
          <div className="topbar-left flex items-center gap-2">
            <span className="topbar-logo text-xl"></span>
            <HotelTitle />
            <span className="topbar-badge user text-xs">Checkout</span>
          </div>
          <button className="btn-salir text-sm" onClick={onExit}>Exit</button>
        </header>
        <div className="checkout-completed p-6 max-w-2xl mx-auto text-center">
          <div className="completed-icon text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-green-600 mb-4">Checkout Confirmado</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-amber-800 font-medium">Nuestro equipo ha sido notificado</p>
            <p className="text-amber-700 text-sm mt-2">Por favor diríjase a la zona de recepción para finalizar el proceso</p>
          </div>
          <button 
            className="px-6 py-3 bg-[#5a8f6b] text-white font-semibold rounded-lg hover:bg-[#4a7c59]"
            onClick={() => window.location.href = '/user'}
          >
            Volver a Room Status
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app-shell">
        <header className="topbar flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 px-3 sm:px-6 py-3">
          <div className="topbar-left flex items-center gap-2">
            <span className="topbar-logo text-xl"></span>
            <HotelTitle />
            <span className="topbar-badge user text-xs">Checkout</span>
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
          <span className="topbar-badge user text-xs">Checkout</span>
        </div>
        <button className="btn-salir text-sm" onClick={() => window.location.href = '/user'}>Back to Room Status</button>
      </header>

      <div className="checkout-content p-4 sm:p-6">
        {/* Room Selection */}
        <div className="checkout-room-select mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Room</label>
          <select 
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#5a8f6b]"
            value={selectedRoom?.id || ''}
            onChange={(e) => {
              const room = rooms.find(r => r.id === e.target.value);
              setSelectedRoom(room);
              if (room?.checkOut) {
                setCheckoutDate(room.checkOut.split('T')[0]);
              }
            }}
          >
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                Room {room.numero} - {room.huesped}
              </option>
            ))}
          </select>
        </div>

        {selectedRoom && (
          <div className="checkout-details bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold">Room #{selectedRoom.numero}</h2>
                <p className="text-gray-500">{selectedRoom.tipo}</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
                Occupied
              </span>
            </div>

            {/* Guest Info */}
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <span className="text-xs text-gray-500 uppercase">Guest</span>
                <p className="font-medium">{selectedRoom.huesped}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase">Check-out Date</span>
                <p className="font-medium">{FECHA(selectedRoom.checkOut)}</p>
              </div>
            </div>

            {/* Date Selection */}
            <div className="checkout-date-select mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <label className="block text-sm font-medium text-blue-800 mb-2">
                Select Check-out Date
              </label>
              <input 
                type="date" 
                className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-500"
                value={checkoutDate}
                onChange={(e) => setCheckoutDate(e.target.value)}
              />
              <p className="text-xs text-blue-600 mt-2">
                Leave as is to keep original check-out date, or select a different date
              </p>
            </div>

            {/* Room Charges */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Room</h3>
              <div className="flex justify-between py-2 border-b">
                <span>Room rate ({selectedRoom.tarifa} x {nights} night{nights > 1 ? 's' : ''})</span>
                <span>{COP(roomTotal)}</span>
              </div>
              <div className="flex justify-between py-2 font-semibold mt-2">
                <span>Room Subtotal</span>
                <span>{COP(roomTotal)}</span>
              </div>
            </div>

            {/* Consumptions */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Consumptions ({consumos.length} items)</h3>
              {consumos.length === 0 ? (
                <p className="text-gray-400 text-sm">No consumptions</p>
              ) : (
                <div className="max-h-40 overflow-y-auto">
                  {consumos.map((c) => (
                    <div key={c.id} className="flex justify-between py-2 border-b text-sm">
                      <span>{c.descripcion}</span>
                      <span>{COP(c.precio)}</span>
                    </div>
                  ))}
                </div>
              )}
              {consumos.length > 0 && (
                <div className="flex justify-between py-2 font-semibold mt-2">
                  <span>Consumptions Subtotal</span>
                  <span>{COP(totalConsumos)}</span>
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="border-t-2 pt-4 mt-4">
              <div className="flex justify-between text-xl font-bold">
                <span>Total to Pay</span>
                <span>{COP(totalAPagar)}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span>Already Paid</span>
                <span className="text-green-600">{COP(pagado)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold mt-2 pt-2 border-t">
                <span>Remaining Balance</span>
                <span className={saldoPendiente > 0 ? 'text-red-600' : 'text-green-600'}>
                  {COP(saldoPendiente)}
                </span>
              </div>
            </div>

            {/* Confirm Button */}
            <button
              className="w-full mt-6 py-4 bg-[#5a8f6b] text-white font-bold text-lg rounded-lg hover:bg-[#4a7c59] transition-colors disabled:opacity-50"
              onClick={handleCheckout}
              disabled={processing || !checkoutDate}
            >
              {processing ? 'Processing...' : 'Confirm Check-out & Pay'}
            </button>

            {saldoPendiente > 0 && (
              <p className="text-center text-sm text-red-600 mt-3">
                Remaining balance of {COP(saldoPendiente)} must be paid at reception
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}