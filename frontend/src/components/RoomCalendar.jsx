import { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, addDays, eachDayOfInterval, isWithinInterval, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { API_BASE } from '../services/api';
import { BadgeCheck, BadgeX, Calendar, Users, Clock } from 'lucide-react';
import 'react-day-picker/style.css';

const RoomCalendar = ({ roomId, roomNumero, modo = 'selection', onSelectDates, initialDates }) => {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState(initialDates || { from: undefined, to: undefined });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!roomId) return;
    fetchReservas();
  }, [roomId]);

  const fetchReservas = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/reservas/room/${roomId}`);
      if (!res.ok) throw new Error('Error fetching reservas');
      const data = await res.json();
      setReservas(data.filter(r => r.estado !== 'cancelada'));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const occupiedDates = [];
  reservas.forEach(r => {
    const start = new Date(r.checkIn);
    const end = new Date(r.checkOut);
    const days = eachDayOfInterval({ start, end });
    days.forEach(d => occupiedDates.push(d));
  });

  const disabledDays = [
    { from: new Date(0), to: addDays(new Date(), -1) },
    ...occupiedDates
  ];

  const handleSelect = (range) => {
    setSelectedRange(range);
    if (onSelectDates && range?.from && range?.to) {
      const isValid = !occupiedDates.some(d => 
        isWithinInterval(d, { start: range.from, end: range.to })
      );
      if (isValid) {
        onSelectDates({ checkIn: range.from, checkOut: range.to });
      }
    }
  };

  const today = new Date();
  const fromDate = addDays(today, 1);
  const toDate = addDays(today, 90);

  if (!roomId) {
    return (
      <div className="p-4 text-center text-gray-500">
        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Selecciona una habitación para ver disponibilidad</p>
      </div>
    );
  }

  return (
    <div className="room-calendar bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">
          Habitación {roomNumero}
        </h3>
        <span className="text-xs text-gray-500">
          {reservas.length} reserva(s) activa(s)
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      ) : error ? (
        <div className="text-center py-4 text-red-500">
          <BadgeX className="w-8 h-8 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      ) : (
        <>
          <DayPicker
            mode={modo}
            selected={selectedRange}
            onSelect={handleSelect}
            disabled={disabledDays}
            fromDate={fromDate}
            toDate={toDate}
            locale={es}
            numberOfMonths={2}
            className="room-calendar-picker"
            styles={{
              caption: { color: '#166534' },
              head_cell: { color: '#6b7280' }
            }}
            modifiers={{
              reserved: occupiedDates
            }}
            modifiersStyles={{
              reserved: {
                backgroundColor: '#fecaca',
                color: '#dc2626',
                borderRadius: '4px'
              }
            }}
          />

          {selectedRange?.from && selectedRange?.to && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 text-green-800">
                <BadgeCheck className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {format(selectedRange.from, 'dd MMM')} - {format(selectedRange.to, 'dd MMM yyyy')}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {selectedRange.to && Math.ceil((selectedRange.to - selectedRange.from) / (1000 * 60 * 60 * 24))} noches
                </span>
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
              <span className="text-gray-600">Ocupada</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-white border border-gray-300 rounded"></div>
              <span className="text-gray-600">Disponible</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RoomCalendar;